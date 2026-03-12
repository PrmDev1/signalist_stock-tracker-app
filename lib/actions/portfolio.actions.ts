'use server';

import { auth } from '../better-auth/auth';
import { headers } from 'next/headers';

const CLOUDFLARE_BASE_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_BASE_URL;
const CLOUDFLARE_API_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_API_KEY ?? '';

// ---- Types ----

export interface CompanyProfile {
  cik: string;
  ticker: string;
  companyName: string;
  primaryExchange: string;
  sector: string;
  filerSize: string;
  isSmallerReporting: boolean;
  isEmergingGrowth: boolean;
  latestPrice?: number;
  yesterdayPrice?: number;
}

export interface SpecialStatus {
  id: 'isSmallerReporting' | 'isEmergingGrowth';
  label: string;
}

export interface CompanyFilter {
  sectors: string[];
  topSectors: string[]; // Top 10 most popular sectors
  exchanges: string[];
  filerSizes: string[];
  specialStatuses: SpecialStatus[];
}

export interface TickersResponse {
  status: string;
  page: number;
  size: number;
  count: number;
  data: CompanyProfile[];
}

export interface FiltersResponse {
  status: string;
  filters: CompanyFilter;
}

// ---- Server Actions ----

/**
 * Fetch available filters for portfolio selection
 * Calls /api/v1/portfolio/filters endpoint
 */
export async function getPortfolioFilters(): Promise<{
  success: boolean;
  filters?: CompanyFilter;
  error?: string;
}> {
  try {
    if (!CLOUDFLARE_BASE_URL || !CLOUDFLARE_API_KEY) {
      return {
        success: false,
        error: 'Cloudflare API configuration is missing',
      };
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const url = `${CLOUDFLARE_BASE_URL}/api/v1/portfolio/filters`;
    console.log('[DEBUG] Fetching filters from:', url);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'API-KEY': CLOUDFLARE_API_KEY,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[DEBUG] API Error:', res.status, errorText);
      return {
        success: false,
        error: `API returned ${res.status}: ${errorText}`,
      };
    }

    const data: FiltersResponse = await res.json();

    // Ensure topSectors is populated with the most popular sectors
    const filters = data.filters;
    const TOP_10_SECTORS = [
      'ELECTRONIC COMPUTERS',
      'SEMICONDUCTORS & RELATED DEVICES',
      'COMPUTER COMMUNICATIONS EQUIPMENT',
      'SERVICES-PREPACKAGED SOFTWARE',
      'PHARMACEUTICAL PREPARATIONS',
      'COMMERCIAL BANKS, NEC',
      'CRUDE PETROLEUM & NATURAL GAS',
      'AIR TRANSPORTATION, SCHEDULED',
      'RETAIL-CATALOG & MAIL-ORDER HOUSES',
      'RADIO & TV BROADCASTING & COMMUNICATIONS EQUIPMENT'
    ];
    
    filters.topSectors = TOP_10_SECTORS;

    return {
      success: true,
      filters: filters,
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
 * Fetch paginated list of tickers with optional filters
 * Calls /api/v1/portfolio/tickers endpoint
 */
export async function getPortfolioTickers(
  page: number = 1,
  size: number = 50,
  filters?: {
    sector?: string;
    exchange?: string;
    search?: string;
    filerSize?: string;
    isSmallerReporting?: boolean;
    isEmergingGrowth?: boolean;
  }
): Promise<{
  success: boolean;
  tickers?: CompanyProfile[];
  page?: number;
  size?: number;
  count?: number;
  error?: string;
}> {
  try {
    if (!CLOUDFLARE_BASE_URL || !CLOUDFLARE_API_KEY) {
      return {
        success: false,
        error: 'Cloudflare API configuration is missing',
      };
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const url = new URL(`${CLOUDFLARE_BASE_URL}/api/v1/portfolio/tickers`);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('size', size.toString());

    if (filters) {
      if (filters.sector) url.searchParams.append('sector', filters.sector);
      if (filters.exchange) url.searchParams.append('exchange', filters.exchange);
      if (filters.search) url.searchParams.append('search', filters.search);
      if (filters.filerSize) url.searchParams.append('filerSize', filters.filerSize);
      if (filters.isSmallerReporting !== undefined)
        url.searchParams.append('isSmallerReporting', filters.isSmallerReporting.toString());
      if (filters.isEmergingGrowth !== undefined)
        url.searchParams.append('isEmergingGrowth', filters.isEmergingGrowth.toString());
    }

    const urlString = url.toString();
    console.log('[DEBUG] Fetching tickers from:', urlString);

    const res = await fetch(urlString, {
      method: 'GET',
      headers: {
        'API-KEY': CLOUDFLARE_API_KEY,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[DEBUG] API Error:', res.status, errorText);
      return {
        success: false,
        error: `API returned ${res.status}: ${errorText}`,
      };
    }

    const data: TickersResponse = await res.json();

    return {
      success: true,
      tickers: data.data,
      page: data.page,
      size: data.size,
      count: data.count,
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
