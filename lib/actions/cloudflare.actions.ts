'use server';

import { auth } from '../better-auth/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getWatchlistSymbolsByEmail } from './watchlist.actions';
import { getDateRange, validateArticle, formatArticle, formatPrice, formatChangePercent, formatMarketCapValue } from '@/lib/utils';
import { POPULAR_STOCK_SYMBOLS } from '@/lib/constants';
import { cache } from 'react';
import { connectToDatabase } from '@/database/mongoose';
import { Portfolio } from '@/database/models/portfolio.model';

const CLOUDFLARE_BASE_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_BASE_URL ;
const CLOUDFLARE_API_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_API_KEY ?? '';

function normalizeRiskLevel(value: unknown): 'low' | 'medium' | 'high' {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (normalized === 'low' || normalized === 'high' || normalized === 'medium') {
    return normalized;
  }

  return 'medium';
}

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

export interface SavedPortfolioCardData {
  id: string;
  name: string;
  tickers: string[];
  riskLevel: 'low' | 'medium' | 'high';
  volatility: number;
  expectedReturn: number;
  updatedAt: string;
}

export interface SavedPortfolioDetailData extends SavedPortfolioCardData {
  allocations: Record<string, { weight: number; allocatedAmount: number }>;
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
  volatility: number,
  riskLevel: 'low' | 'medium' | 'high',
  modelName?: 'mvo' | 'semi'
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

    await connectToDatabase();

    const portfolio = await Portfolio.create({
      userId: session.user.id,
      name: name.trim(),
      tickers: tickers.map((ticker) => ticker.trim().toUpperCase()),
      allocations,
      expectedReturn,
      volatility,
      riskLevel: normalizeRiskLevel(riskLevel),
      modelName,
    });

    return {
      success: true,
      portfolioId: String(portfolio._id),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function getSavedPortfolios(): Promise<{
  success: boolean;
  portfolios?: SavedPortfolioCardData[];
  error?: string;
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    await connectToDatabase();
    const portfolios = await Portfolio.find({ userId: session.user.id })
      .sort({ updatedAt: -1 })
      .lean();

    return {
      success: true,
      portfolios: portfolios.map((portfolio: any) => ({
        
        id: String(portfolio._id),
        name: portfolio.name,
        tickers: (() => {
          const allocationTickers = portfolio?.allocations
            ? Object.keys(
                portfolio.allocations instanceof Map
                  ? Object.fromEntries(portfolio.allocations.entries())
                  : portfolio.allocations
              )
            : [];

          if (allocationTickers.length > 0) {
            return allocationTickers.map((ticker) => String(ticker).trim().toUpperCase());
          }

          return Array.isArray(portfolio.tickers)
            ? portfolio.tickers.map((ticker: string) => String(ticker).trim().toUpperCase())
            : [];
        })(),
        riskLevel: normalizeRiskLevel(portfolio.riskLevel),
        volatility: Number(portfolio.volatility || 0),
        expectedReturn: Number(portfolio.expectedReturn || 0),
        updatedAt: new Date(portfolio.updatedAt || portfolio.createdAt || Date.now()).toISOString(),
      })),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function getSavedPortfolioById(id: string): Promise<{
  success: boolean;
  portfolio?: SavedPortfolioDetailData;
  error?: string;
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    await connectToDatabase();
    const portfolio = await Portfolio.findOne({ _id: id, userId: session.user.id }).lean();

    if (!portfolio) {
      return {
        success: false,
        error: 'Portfolio not found',
      };
    }

    return {
      success: true,
      portfolio: {
        id: String((portfolio as any)._id),
        name: (portfolio as any).name,
        tickers: (() => {
          const allocationSource =
            (portfolio as any).allocations instanceof Map
              ? Object.fromEntries((portfolio as any).allocations.entries())
              : ((portfolio as any).allocations || {});

          const allocationTickers = Object.keys(allocationSource || {});
          if (allocationTickers.length > 0) {
            return allocationTickers.map((ticker) => String(ticker).trim().toUpperCase());
          }

          return Array.isArray((portfolio as any).tickers)
            ? (portfolio as any).tickers.map((ticker: string) => String(ticker).trim().toUpperCase())
            : [];
        })(),
        riskLevel: normalizeRiskLevel((portfolio as any).riskLevel),
        volatility: Number((portfolio as any).volatility || 0),
        expectedReturn: Number((portfolio as any).expectedReturn || 0),
        updatedAt: new Date((portfolio as any).updatedAt || (portfolio as any).createdAt || Date.now()).toISOString(),
        allocations:
          (portfolio as any).allocations instanceof Map
            ? Object.fromEntries((portfolio as any).allocations.entries())
            : ((portfolio as any).allocations || {}),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function deleteSavedPortfolio(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    await connectToDatabase();
    const deleted = await Portfolio.findOneAndDelete({ _id: id, userId: session.user.id });

    if (!deleted) {
      return {
        success: false,
        error: 'Portfolio not found',
      };
    }

    revalidatePath('/portfolio');
    revalidatePath(`/portfolio/${id}`);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
