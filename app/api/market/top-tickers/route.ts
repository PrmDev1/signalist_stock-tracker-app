import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { auth } from '@/lib/better-auth/auth';
import { getStocksDetails } from '@/lib/actions/finnhub.actions';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
interface FinnhubQuoteResponse {
  c?: number;
  dp?: number;
  pc?: number;
}

interface FinnhubProfileResponse {
  logo?: string;
  name?: string;
}

interface FinnhubCandleResponse {
  c?: number[];
  s?: string;
}

interface TopTickerPayload {
  symbol: string;
  companyName: string;
  price: number;
  changePercent: number;
  logoUrl: string | null;
  sparkline: number[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Finnhub request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function buildFallbackSparkline(price: number, changePercent: number): number[] {
  const base = price > 0 ? price : 100;
  const drift = (changePercent || 0) / 100;

  return Array.from({ length: 18 }, (_, index) => {
    const curve = Math.sin(index / 2.1) * base * 0.006;
    const trend = base * drift * (index / 18);
    return Number((base + trend + curve).toFixed(2));
  });
}

async function fetchFinnhubSparkline(symbol: string, token: string): Promise<number[]> {
  const now = Math.floor(Date.now() / 1000);
  const attempts = [
    { resolution: '15', from: now - 60 * 60 * 24 * 3 },
    { resolution: '60', from: now - 60 * 60 * 24 * 7 },
    { resolution: 'D', from: now - 60 * 60 * 24 * 30 },
  ];

  for (const attempt of attempts) {
    try {
      const candle = await fetchJson<FinnhubCandleResponse>(
        `${FINNHUB_BASE_URL}/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${attempt.resolution}&from=${attempt.from}&to=${now}&token=${token}`
      );

      const points = Array.isArray(candle?.c) ? candle.c.filter((value) => Number.isFinite(value)) : [];
      if (candle?.s === 'ok' && points.length > 1) {
        return points.slice(-Math.min(points.length, 24)).map((value) => Number(value));
      }
    } catch {
      continue;
    }
  }

  return [];
}

async function getSessionUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

export async function GET(request: NextRequest) {
  if (!FINNHUB_API_KEY) {
    return NextResponse.json({ data: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ data: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  await connectToDatabase();

  const watchlist = await Watchlist.find({ userId: user.id }, { symbol: 1 })
    .sort({ addedAt: -1 })
    .lean();

  const symbols = watchlist
    .map((item) => String(item.symbol || '').trim().toUpperCase())
    .filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json({ data: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const data = await Promise.all(
    symbols.map(async (symbol) => {
      const [detailsResult, sparklineResult] = await Promise.allSettled([
        getStocksDetails(symbol),
        fetchFinnhubSparkline(symbol, FINNHUB_API_KEY),
      ]);

      if (detailsResult.status !== 'fulfilled') {
        return null;
      }

      const stock = detailsResult.value;
      const priceCandidate = Number(stock.currentPrice);

      if (!Number.isFinite(priceCandidate) || priceCandidate <= 0) {
        return null;
      }

      const changePercent = Number(stock.changePercent);
      const finnhubSparkline = sparklineResult.status === 'fulfilled' ? sparklineResult.value : [];
      const sparkline =
        finnhubSparkline.length > 1
          ? finnhubSparkline
          : buildFallbackSparkline(
              priceCandidate,
              Number.isFinite(changePercent) ? changePercent : 0
            );

      return {
        symbol,
        companyName: stock.company || symbol,
        price: priceCandidate,
        changePercent: Number.isFinite(changePercent) ? changePercent : 0,
        logoUrl: stock.logo || null,
        sparkline,
      } satisfies TopTickerPayload;
    })
  );

  const liveData = data.filter((item): item is TopTickerPayload => item !== null);

  return NextResponse.json(
    { data: liveData },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}