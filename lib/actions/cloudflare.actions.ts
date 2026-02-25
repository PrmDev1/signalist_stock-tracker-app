'use server';

import { auth } from '../better-auth/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getWatchlistSymbolsByEmail } from './watchlist.actions';
import { getDateRange, validateArticle, formatArticle, formatPrice, formatChangePercent, formatMarketCapValue } from '@/lib/utils';
import { POPULAR_STOCK_SYMBOLS } from '@/lib/constants';
import { cache } from 'react';

const CLOUDFLARE_BASE_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_BASE_URL ;
const CLOUDFLARE_API_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_API_KEY ?? '';

async function fetchJSON<T>(url: string, revalidateSeconds?: number): Promise<T> {
  const options: RequestInit & { next?: { revalidate?: number } } = revalidateSeconds
    ? { cache: 'force-cache', next: { revalidate: revalidateSeconds } }
    : { cache: 'no-store' };

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Fetch failed ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

// ---- Portfolio Optimization Actions ----

interface PortfolioRequest {
  tickers: string[];
  lookbackYears: number;
  userId?: string;
  riskLevel?: string;
  requireDiversification?: boolean;
  modelName?: 'mvo' | 'semi'; // MVO or Semi-Variance
}

interface PortfolioOptimizeResponse {
  reqId: string;
  status: string;
}

interface PortfolioStatusResponse {
  reqId?: string;
  status: string;
  message?: string;
  modelUsed?: string;
  portfolio?: {
    allocations: Record<string, { weight: number; allocatedAmount: number }>;
    expectedReturn: number;
    volatility: number;
  };
}

/**
 * Server Action: เริ่มต้นการ optimize portfolio
 * เรียก API Cloudflare เพื่อสร้างคำขอใหม่
 */
export async function startPortfolioOptimization(
  tickers: string[],
  lookbackYears: number = 3,
  riskLevel: string = 'medium',
  initialCapital: number = 10000,
  brokerMinOrder: number = 5,
  requireDiversification: boolean = true,
  modelName: 'mvo' | 'semi' = 'mvo'
): Promise<{ success: boolean; reqId?: string; error?: string }> {
  try {
    if (!CLOUDFLARE_BASE_URL || !CLOUDFLARE_API_KEY) {
      return {
        success: false,
        error: 'Cloudflare API configuration is missing',
      };
    }

    // Require authenticated user so we can include userId in payload
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user || !session.user.id) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const payload: PortfolioRequest = {
      tickers: tickers.map((t) => t.trim().toUpperCase()),
      lookbackYears,
      userId: session.user.id,
      riskLevel,
      requireDiversification,
      modelName,
    } as unknown as PortfolioRequest;

    const res = await fetch(
      `${CLOUDFLARE_BASE_URL}/api/v1/portfolio/optimize-async`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-KEY': CLOUDFLARE_API_KEY,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      return {
        success: false,
        error: `API returned ${res.status}: ${errorText}`,
      };
    }

    const data: PortfolioOptimizeResponse = await res.json();

    return {
      success: true,
      reqId: data.reqId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Server Action: ตรวจสอบสถานะของ portfolio optimization
 * เรียก API Cloudflare เพื่อดึงผลลัพธ์
 */
export async function getPortfolioOptimizationStatus(
  reqId: string,
  initialCapital: number = 10000,
  brokerMinOrder: number = 5
): Promise<{
  success: boolean;
  status?: string;
  message?: string;
  modelUsed?: string;
  portfolio?: {
    allocations: Record<string, { weight: number; allocatedAmount: number }>;
    expectedReturn: number;
    volatility: number;
  };
  error?: string;
  debugUrl?: string;
}> {
  try {
    if (!CLOUDFLARE_BASE_URL || !CLOUDFLARE_API_KEY) {
      return {
        success: false,
        error: 'Cloudflare API configuration is missing',
      };
    }

    // Log for debugging
    const url = new URL(
      `${CLOUDFLARE_BASE_URL}/api/v1/portfolio/allocation/${reqId}`
    );
    url.searchParams.append('initialCapital', initialCapital.toString());
    url.searchParams.append('minOrder', brokerMinOrder.toString());
    
    const urlString = url.toString();
    console.log('[DEBUG] Status check URL:', urlString);
    console.log('[DEBUG] ReqId:', reqId);

    const res = await fetch(urlString, {
      method: 'GET',
      headers: {
        'API-KEY': CLOUDFLARE_API_KEY,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[DEBUG] API Error Response:', res.status, errorText);
      return {
        success: false,
        error: `API returned ${res.status}: ${errorText}`,
        debugUrl: urlString,
      };
    }

    const data: PortfolioStatusResponse = await res.json();

    return {
      success: true,
      status: data.status,
      message: data.message,
      modelUsed: data.modelUsed,
      portfolio: data.portfolio,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DEBUG] Fetch error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Server Action: บันทึก Portfolio ที่ Optimize แล้วลงใน Database
 */
export async function savePortfolioToDatabase(
  name: string,
  tickers: string[],
  allocations: Record<string, { weight: number; allocatedAmount: number }>,
  expectedReturn: number,
  volatility: number
): Promise<{
  success: boolean;
  portfolioId?: string;
  error?: string;
}> {
  try {
    // ตรวจสอบสิทธิ์ user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // TODO: บันทึกลงฐานข้อมูล MongoDB
    // ต้องสร้าง Model สำหรับ Portfolio ก่อน
    // Example:
    // const portfolio = await Portfolio.create({
    //   userId: session.user.id,
    //   name,
    //   tickers,
    //   allocations,
    //   expectedReturn,
    //   volatility,
    //   createdAt: new Date(),
    // });

    return {
      success: true,
      portfolioId: 'portfolio_' + Date.now(), // ตัวอย่าง ID
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
