import { NextResponse } from 'next/server';

const CLOUDFLARE_BASE_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_BASE_URL;
const CLOUDFLARE_API_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_API_KEY ?? '';

function normalizeInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseInt(value, 10)
      : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function normalizeTargetRegime(value: unknown): string {
  if (typeof value !== 'string') {
    return 'AUTO';
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : 'AUTO';
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return {};
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

function extractErrorMessage(rawText: string): string {
  if (!rawText) {
    return 'Unknown upstream error';
  }

  try {
    const parsed = JSON.parse(rawText) as { detail?: string; error?: string; message?: string };
    return parsed.detail || parsed.error || parsed.message || rawText;
  } catch {
    return rawText;
  }
}

export async function POST(request: Request) {
  try {
    if (!CLOUDFLARE_BASE_URL || !CLOUDFLARE_API_KEY) {
      return NextResponse.json({ error: 'Cloudflare API configuration is missing' }, { status: 500 });
    }

    const incomingUrl = new URL(request.url);
    const body = await readJsonBody(request);

    const topN = normalizeInteger(
      incomingUrl.searchParams.get('topN') ?? body.topN,
      5,
      20,
      20
    );
    const targetRegime = normalizeTargetRegime(
      incomingUrl.searchParams.get('targetRegime') ?? body.targetRegime
    );

    const upstreamUrl = new URL(`${CLOUDFLARE_BASE_URL}/api/v1/portfolio/smart-screen-async`);
    upstreamUrl.searchParams.set('topN', String(topN));
    upstreamUrl.searchParams.set('targetRegime', targetRegime);

    const upstream = await fetch(upstreamUrl.toString(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'API-KEY': CLOUDFLARE_API_KEY,
      },
      cache: 'no-store',
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type') || '';

    if (!upstream.ok) {
      return NextResponse.json(
        { error: extractErrorMessage(text) },
        { status: upstream.status }
      );
    }

    if (!contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json(
        { error: 'Unexpected response type from upstream smart-screen async endpoint' },
        { status: 502 }
      );
    }

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}