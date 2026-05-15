import { NextResponse } from 'next/server';

const CLOUDFLARE_BASE_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_BASE_URL;
const CLOUDFLARE_API_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_API_KEY ?? '';

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reqId: string }> }
) {
  try {
    if (!CLOUDFLARE_BASE_URL || !CLOUDFLARE_API_KEY) {
      return NextResponse.json({ error: 'Cloudflare API configuration is missing' }, { status: 500 });
    }

    const { reqId } = await params;
    const normalizedReqId = String(reqId ?? '').trim();

    if (!normalizedReqId) {
      return NextResponse.json({ error: 'reqId is required' }, { status: 400 });
    }

    const upstreamUrl = new URL(
      `${CLOUDFLARE_BASE_URL}/api/v1/portfolio/smart-screen-async/status/${encodeURIComponent(normalizedReqId)}`
    );

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
      return NextResponse.json(
        { error: extractErrorMessage(text) },
        { status: upstream.status }
      );
    }

    if (!contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json(
        { error: 'Unexpected response type from upstream smart-screen async status endpoint' },
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