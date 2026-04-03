import { NextResponse } from 'next/server';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
const TICKER_SYMBOLS = ['AAPL', 'TSLA', 'GOOGL', 'META', 'NVDA', 'AMZN'];

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

export async function GET() {
  if (!FINNHUB_API_KEY) {
    return NextResponse.json({ data: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const data = await Promise.all(
    TICKER_SYMBOLS.map(async (symbol) => {
      const [quoteResult, profileResult, sparklineResult] = await Promise.allSettled([
        fetchJson<FinnhubQuoteResponse>(
          `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`
        ),
        fetchJson<FinnhubProfileResponse>(
          `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`
        ),
        fetchFinnhubSparkline(symbol, FINNHUB_API_KEY),
      ]);

      if (quoteResult.status !== 'fulfilled') {
        return null;
      }

      const quote = quoteResult.value;
      const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
      const finnhubSparkline = sparklineResult.status === 'fulfilled' ? sparklineResult.value : [];

      const priceCandidate = Number(quote.c ?? quote.pc);

      if (!Number.isFinite(priceCandidate) || priceCandidate <= 0) {
        return null;
      }

      const finnhubChange = Number(quote.dp);
      const sparkline =
        finnhubSparkline.length > 1
          ? finnhubSparkline
          : buildFallbackSparkline(
              priceCandidate,
              Number.isFinite(finnhubChange) ? finnhubChange : 0
            );

      if (sparkline.length < 2) {
        return null;
      }

      return {
        symbol,
        companyName: profile?.name || symbol,
        price: priceCandidate,
        changePercent: Number.isFinite(finnhubChange) ? finnhubChange : 0,
        logoUrl: profile?.logo || null,
        sparkline,
      } satisfies TopTickerPayload;
    })
  );

  const liveData = data.filter((item): item is TopTickerPayload => item !== null);

  return NextResponse.json(
    { data: liveData },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}