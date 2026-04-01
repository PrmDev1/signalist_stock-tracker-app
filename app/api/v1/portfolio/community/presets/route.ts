import { NextResponse } from 'next/server';

const CLOUDFLARE_BASE_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_BASE_URL;
const CLOUDFLARE_API_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_API_KEY ?? '';

const ALLOWED_QUERY_KEYS = [
  'page',
  'size',
  'riskLevel',
  'modelName',
  'minReturn',
  'maxReturn',
  'minRisk',
  'maxRisk',
  'isDiversified',
] as const;

function normalizeNumericSearchParam(value: string | null): string | null {
  if (!value) return null;

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return String(parsed);
}

function normalizeOrderedRange(minValue: string | null, maxValue: string | null): { minValue: string | null; maxValue: string | null } {
  const normalizedMin = normalizeNumericSearchParam(minValue);
  const normalizedMax = normalizeNumericSearchParam(maxValue);

  if (normalizedMin && normalizedMax && Number.parseFloat(normalizedMin) > Number.parseFloat(normalizedMax)) {
    return {
      minValue: normalizedMax,
      maxValue: normalizedMin,
    };
  }

  return {
    minValue: normalizedMin,
    maxValue: normalizedMax,
  };
}

function normalizeUpstreamError(message: string): string {
  const lowered = message.toLowerCase();

  if (lowered.includes('retryerror') && lowered.includes('typeerror')) {
    return 'Community portfolio service failed upstream. The backend community preset handler is misconfigured and must pass page and size to fetchRecommendedPortfolios instead of limit.';
  }

  return message;
}

export async function GET(request: Request) {
  try {
    if (!CLOUDFLARE_BASE_URL || !CLOUDFLARE_API_KEY) {
      return NextResponse.json({ error: 'Cloudflare API configuration is missing' }, { status: 500 });
    }

    const incomingUrl = new URL(request.url);
    const upstreamUrl = new URL(`${CLOUDFLARE_BASE_URL}/api/v1/portfolio/community/presets`);

    const normalizedReturnRange = normalizeOrderedRange(
      incomingUrl.searchParams.get('minReturn'),
      incomingUrl.searchParams.get('maxReturn')
    );
    const normalizedRiskRange = normalizeOrderedRange(
      incomingUrl.searchParams.get('minRisk'),
      incomingUrl.searchParams.get('maxRisk')
    );

    for (const key of ALLOWED_QUERY_KEYS) {
      const value =
        key === 'minReturn'
          ? normalizedReturnRange.minValue
          : key === 'maxReturn'
            ? normalizedReturnRange.maxValue
            : key === 'minRisk'
              ? normalizedRiskRange.minValue
              : key === 'maxRisk'
                ? normalizedRiskRange.maxValue
                : incomingUrl.searchParams.get(key);

      if (value !== null && value !== '') {
        upstreamUrl.searchParams.set(key, value);
      }
    }

    const upstream = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'API-KEY': CLOUDFLARE_API_KEY,
      },
      cache: 'no-store',
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type') || '';

    if (!upstream.ok) {
      let errorMessage = text || `Upstream returned ${upstream.status}`;

      try {
        const parsed = JSON.parse(text) as { detail?: string; error?: string; message?: string };
        errorMessage = parsed.detail || parsed.error || parsed.message || errorMessage;
      } catch {
        // Keep the raw response text when JSON parsing fails.
      }

      errorMessage = normalizeUpstreamError(errorMessage);

      return NextResponse.json({ error: errorMessage }, { status: upstream.status });
    }

    if (!contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json(
        { error: 'Unexpected response type from upstream community preset endpoint' },
        { status: 502 }
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const message = normalizeUpstreamError(error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}