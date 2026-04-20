import { NextResponse } from 'next/server';

const CLOUDFLARE_BASE_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_BASE_URL;
const CLOUDFLARE_API_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_API_KEY ?? '';

const ALLOWED_QUERY_KEYS = ['limit', 'isSectorQuota', 'quotaPerSector', 'userExpectedRegime'] as const;

function normalizeBoolean(value: string | null): string | null {
  if (value == null || value === '') return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return 'true';
  if (normalized === 'false' || normalized === '0') return 'false';
  return null;
}

function normalizeInteger(value: string | null, min: number, max: number): string | null {
  if (!value) return null;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;

  return String(Math.min(max, Math.max(min, parsed)));
}

export async function GET(request: Request) {
  try {
    if (!CLOUDFLARE_BASE_URL || !CLOUDFLARE_API_KEY) {
      return NextResponse.json({ error: 'Cloudflare API configuration is missing' }, { status: 500 });
    }

    const incomingUrl = new URL(request.url);
    const upstreamUrl = new URL(`${CLOUDFLARE_BASE_URL}/api/v1/portfolio/smart-screen`);

    for (const key of ALLOWED_QUERY_KEYS) {
      const rawValue = incomingUrl.searchParams.get(key);
      const normalizedValue =
        key === 'limit'
          ? normalizeInteger(rawValue, 5, 100)
          : key === 'quotaPerSector'
            ? normalizeInteger(rawValue, 1, 5)
            : key === 'isSectorQuota'
              ? normalizeBoolean(rawValue)
              : rawValue?.trim() || null;

      if (normalizedValue) {
        upstreamUrl.searchParams.set(key, normalizedValue);
      }
    }

    if (!upstreamUrl.searchParams.has('isSectorQuota')) {
      upstreamUrl.searchParams.set('isSectorQuota', 'true');
    }

    if (!upstreamUrl.searchParams.has('quotaPerSector')) {
      upstreamUrl.searchParams.set('quotaPerSector', '2');
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
        // Preserve raw upstream error text when it is not JSON.
      }

      return NextResponse.json({ error: errorMessage }, { status: upstream.status });
    }

    if (!contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json(
        { error: 'Unexpected response type from upstream smart-screen endpoint' },
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}