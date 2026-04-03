import { NextResponse } from 'next/server';

const CLOUDFLARE_BASE_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_BASE_URL;
const CLOUDFLARE_API_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_API_KEY ?? '';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reqId: string }> }
) {
  try {
    if (!CLOUDFLARE_BASE_URL || !CLOUDFLARE_API_KEY) {
      return NextResponse.json(
        { error: 'Cloudflare API configuration is missing' },
        { status: 500 }
      );
    }

    const { reqId } = await params;
    const hash = String(reqId ?? '').trim();

    if (!hash) {
      return NextResponse.json({ error: 'reqId is required' }, { status: 400 });
    }

    const incomingUrl = new URL(request.url);
    const upstreamUrl = new URL(`${CLOUDFLARE_BASE_URL}/api/v1/portfolio/allocation/${encodeURIComponent(hash)}`);

    const initialCapital = incomingUrl.searchParams.get('initialCapital');
    const brokerMinOrder = incomingUrl.searchParams.get('brokerMinOrder');

    if (initialCapital) upstreamUrl.searchParams.set('initialCapital', initialCapital);
    if (brokerMinOrder) upstreamUrl.searchParams.set('brokerMinOrder', brokerMinOrder);

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
        // Preserve raw upstream body when it is not JSON.
      }

      return NextResponse.json({ error: errorMessage }, { status: upstream.status });
    }

    if (!contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json(
        { error: 'Unexpected response type from upstream allocation endpoint' },
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