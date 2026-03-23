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
import type { BacktestAndMetrics, EducationalInsights, RiskRewardProfile } from '@/components/portfolio/analysis-types';
import type { FilteredStock } from '@/lib/portfolio-filtered-stocks';

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
  tickers: Record<string, string>;
  shareOverrides?: Record<string, { shares: number; price?: number; tag?: string }>;
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
  explainability?: {
    educationalInsights?: EducationalInsights;
    riskRewardProfile?: RiskRewardProfile;
  };
  backtestAndMetrics?: BacktestAndMetrics;
}

export interface SavedPortfolioCardData {
  id: string;
  name: string;
  tickers: string[];
  tickerTags?: Record<string, string>;
  allocations?: Record<string, { weight: number; allocatedAmount: number }>;
  mvoId?: string;
  initialCapital?: number;
  monthlyDca?: number;
  targetYears?: number;
  lookbackYears?: number;
  requireDiversification?: boolean;
  modelName?: 'mvo' | 'semi';
  riskLevel: 'low' | 'medium' | 'high';
  volatility: number;
  expectedReturn: number;
  updatedAt: string;
}

export interface SavedPortfolioDetailData extends SavedPortfolioCardData {
  allocations: Record<string, { weight: number; allocatedAmount: number }>;
  backtestAndMetrics?: BacktestAndMetrics;
  riskRewardProfile?: RiskRewardProfile;
}

interface UpdateSavedPortfolioInput {
  id: string;
  name: string;
  tickers: string[];
  tickerTags: Record<string, string>;
  allocations: Record<string, { weight: number; allocatedAmount: number }>;
  expectedReturn: number;
  volatility: number;
  initialCapital: number;
  riskLevel: 'low' | 'medium' | 'high';
  modelName?: 'mvo' | 'semi';
  mvoId?: string;
  monthlyDca?: number;
  targetYears?: number;
  lookbackYears?: number;
  requireDiversification?: boolean;
  backtestAndMetrics?: BacktestAndMetrics | null;
  riskRewardProfile?: RiskRewardProfile | null;
}

/**
 * Server Action: เริ่มต้นการ optimize portfolio
 * เรียก API Cloudflare เพื่อสร้างคำขอใหม่
 */
export async function startPortfolioOptimization(
  stocks: FilteredStock[],
  lookbackYears: number = 3,
  riskLevel: string = 'medium',
  requireDiversification: boolean = true,
  modelName: 'mvo' | 'semi' = 'mvo',
  shareOverrides?: Record<string, { shares: number; price?: number; tag?: string }>
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

    const tickerMap = stocks.reduce<Record<string, string>>((acc, stock) => {
      const symbol = String(stock.symbol ?? '').trim().toUpperCase();
      if (!symbol) return acc;

      acc[symbol] = typeof stock.tag === 'string' && stock.tag.trim().length > 0
        ? stock.tag.trim().toLowerCase()
        : 'unknown';

      return acc;
    }, {});

    if (Object.keys(tickerMap).length === 0) {
      return {
        success: false,
        error: 'No valid tickers selected',
      };
    }

    const payload: PortfolioRequest = {
      tickers: tickerMap,
      shareOverrides,
      lookbackYears,
      userId: session.user.id,
      riskLevel,
      requireDiversification,
      modelName,
    };

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
  explainability?: {
    educationalInsights?: EducationalInsights;
    riskRewardProfile?: RiskRewardProfile;
  };
  backtestAndMetrics?: BacktestAndMetrics;
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
    url.searchParams.append('brokerMinOrder', brokerMinOrder.toString());
    
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
      explainability: data.explainability,
      backtestAndMetrics: data.backtestAndMetrics,
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
  tickerTags: Record<string, string>,
  allocations: Record<string, { weight: number; allocatedAmount: number }>,
  expectedReturn: number,
  volatility: number,
  initialCapital: number,
  riskLevel: 'low' | 'medium' | 'high',
  modelName?: 'mvo' | 'semi',
  mvoId?: string,
  monthlyDca: number = 0,
  targetYears: number = 10,
  backtestAndMetrics?: BacktestAndMetrics | null,
  riskRewardProfile?: RiskRewardProfile | null
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

    const normalizedMonthlyDca = Number.isFinite(monthlyDca) ? Math.max(0, Number(monthlyDca)) : 0;
    const normalizedTargetYears = Number.isFinite(targetYears)
      ? Math.min(20, Math.max(1, Number(targetYears)))
      : 10;

    const normalizedTickerTags = Object.entries(tickerTags || {}).reduce<Record<string, string>>((acc, [ticker, tag]) => {
      const normalizedTicker = String(ticker).trim().toUpperCase();
      const normalizedTag = String(tag).trim().toLowerCase();

      if (!normalizedTicker || !normalizedTag) {
        return acc;
      }

      acc[normalizedTicker] = normalizedTag;
      return acc;
    }, {});

    const portfolio = await Portfolio.create({
      userId: session.user.id,
      name: name.trim(),
      tickers: tickers.map((ticker) => ticker.trim().toUpperCase()),
      tickerTags: normalizedTickerTags,
      mvoId: mvoId?.trim() || undefined,
      initialCapital,
      monthlyDca: normalizedMonthlyDca,
      targetYears: normalizedTargetYears,
      allocations,
      expectedReturn,
      volatility,
      riskLevel: normalizeRiskLevel(riskLevel),
      modelName,
      backtestAndMetrics: backtestAndMetrics || undefined,
      riskRewardProfile: riskRewardProfile || undefined,
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
        mvoId: portfolio.mvoId ? String(portfolio.mvoId) : undefined,
        initialCapital: Number(portfolio.initialCapital || 0),
        allocations:
          portfolio.allocations instanceof Map
            ? Object.fromEntries(portfolio.allocations.entries())
            : (portfolio.allocations || {}),
        monthlyDca: Number(portfolio.monthlyDca || 0),
        targetYears: Number(portfolio.targetYears || 10),
        lookbackYears: Number(portfolio.lookbackYears || 5),
        requireDiversification: Boolean(portfolio.requireDiversification ?? true),
        modelName: portfolio.modelName === 'semi' ? 'semi' : 'mvo',
        tickerTags: (() => {
          const source = portfolio?.tickerTags instanceof Map
            ? Object.fromEntries(portfolio.tickerTags.entries())
            : (portfolio?.tickerTags || {});

          return Object.entries(source as Record<string, unknown>).reduce<Record<string, string>>((acc, [ticker, tag]) => {
            const normalizedTicker = String(ticker).trim().toUpperCase();
            const normalizedTag = String(tag ?? '').trim().toLowerCase();
            if (normalizedTicker && normalizedTag) {
              acc[normalizedTicker] = normalizedTag;
            }
            return acc;
          }, {});
        })(),
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

/**
 * Server Action: ดึงข้อมูล expectedReturns และ volatilityRisk รายหุ้นจาก explainability
 */
export async function getPortfolioExplainability(
  mvoId: string,
  initialCapital: number
): Promise<{
  expectedReturns: Record<string, number>;
  volatilityRisk: Record<string, number>;
} | null> {
  if (!CLOUDFLARE_BASE_URL || !CLOUDFLARE_API_KEY || !mvoId) return null;
  try {
    const url = new URL(`${CLOUDFLARE_BASE_URL}/api/v1/portfolio/allocation/${encodeURIComponent(mvoId)}`);
    url.searchParams.set('initialCapital', String(Math.max(1, initialCapital)));
    url.searchParams.set('brokerMinOrder', '5');

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'API-KEY': CLOUDFLARE_API_KEY, Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      explainability?: {
        expectedReturns?: Record<string, number>;
        volatilityRisk?: Record<string, number>;
      };
    };

    return {
      expectedReturns: data.explainability?.expectedReturns ?? {},
      volatilityRisk: data.explainability?.volatilityRisk ?? {},
    };
  } catch {
    return null;
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
        mvoId: (portfolio as any).mvoId ? String((portfolio as any).mvoId) : undefined,
        initialCapital: Number((portfolio as any).initialCapital || 0),
        monthlyDca: Number((portfolio as any).monthlyDca || 0),
        targetYears: Number((portfolio as any).targetYears || 10),
        lookbackYears: Number((portfolio as any).lookbackYears || 5),
        requireDiversification: Boolean((portfolio as any).requireDiversification ?? true),
        modelName: (portfolio as any).modelName === 'semi' ? 'semi' : 'mvo',
        tickerTags: (() => {
          const source = (portfolio as any).tickerTags instanceof Map
            ? Object.fromEntries((portfolio as any).tickerTags.entries())
            : (((portfolio as any).tickerTags || {}) as Record<string, unknown>);

          return Object.entries(source).reduce<Record<string, string>>((acc, [ticker, tag]) => {
            const normalizedTicker = String(ticker).trim().toUpperCase();
            const normalizedTag = String(tag ?? '').trim().toLowerCase();
            if (normalizedTicker && normalizedTag) {
              acc[normalizedTicker] = normalizedTag;
            }
            return acc;
          }, {});
        })(),
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
        backtestAndMetrics: (portfolio as any).backtestAndMetrics || undefined,
        riskRewardProfile: (portfolio as any).riskRewardProfile || undefined,
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

export async function updateSavedPortfolio(
  input: UpdateSavedPortfolioInput
): Promise<{
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

    const normalizedTickers = (input.tickers || [])
      .map((ticker) => String(ticker).trim().toUpperCase())
      .filter(Boolean);

    if (normalizedTickers.length < 2) {
      return {
        success: false,
        error: 'At least 2 tickers are required',
      };
    }

    const normalizedTickerTags = Object.entries(input.tickerTags || {}).reduce<Record<string, string>>((acc, [ticker, tag]) => {
      const normalizedTicker = String(ticker).trim().toUpperCase();
      const normalizedTag = String(tag ?? '').trim().toLowerCase();

      if (normalizedTicker && normalizedTag && normalizedTickers.includes(normalizedTicker)) {
        acc[normalizedTicker] = normalizedTag;
      }

      return acc;
    }, {});

    const updated = await Portfolio.findOneAndUpdate(
      { _id: input.id, userId: session.user.id },
      {
        name: String(input.name || '').trim() || 'My Portfolio',
        tickers: normalizedTickers,
        tickerTags: normalizedTickerTags,
        allocations: input.allocations,
        expectedReturn: Number(input.expectedReturn || 0),
        volatility: Number(input.volatility || 0),
        initialCapital: Number(input.initialCapital || 0),
        riskLevel: normalizeRiskLevel(input.riskLevel),
        modelName: input.modelName === 'semi' ? 'semi' : 'mvo',
        mvoId: input.mvoId?.trim() || undefined,
        monthlyDca: Number.isFinite(input.monthlyDca) ? Math.max(0, Number(input.monthlyDca)) : 0,
        targetYears: Number.isFinite(input.targetYears) ? Math.min(20, Math.max(1, Number(input.targetYears))) : 10,
        lookbackYears: Number.isFinite(input.lookbackYears) ? Math.min(20, Math.max(1, Number(input.lookbackYears))) : 5,
        requireDiversification: Boolean(input.requireDiversification ?? true),
        backtestAndMetrics: input.backtestAndMetrics || undefined,
        riskRewardProfile: input.riskRewardProfile || undefined,
      },
      { new: true }
    ).lean();

    if (!updated) {
      return {
        success: false,
        error: 'Portfolio not found',
      };
    }

    revalidatePath('/portfolio');
    revalidatePath(`/portfolio/${input.id}`);

    const updatedPortfolio = await getSavedPortfolioById(String((updated as any)._id));
    if (!updatedPortfolio.success || !updatedPortfolio.portfolio) {
      return {
        success: false,
        error: updatedPortfolio.error || 'Failed to load updated portfolio',
      };
    }

    return {
      success: true,
      portfolio: updatedPortfolio.portfolio,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
