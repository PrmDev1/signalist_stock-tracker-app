import { NextResponse } from 'next/server';

const CLOUDFLARE_BASE_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_BASE_URL;
const CLOUDFLARE_API_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_API_KEY ?? '';

interface SimulateRequestBody {
  mvoHashId?: string;
  initialCapital?: number;
  monthlyDca?: number;
  investmentHorizon?: number;
}

export async function POST(request: Request) {
  try {
    if (!CLOUDFLARE_BASE_URL || !CLOUDFLARE_API_KEY) {
      return NextResponse.json(
        { error: 'Cloudflare API configuration is missing' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as SimulateRequestBody;
    const mvoHashId = String(body?.mvoHashId ?? '').trim();
    const initialCapital = Number.isFinite(body?.initialCapital)
      ? Number(body.initialCapital)
      : 100000;
    const monthlyDca = Number.isFinite(body?.monthlyDca) ? Number(body.monthlyDca) : 0;
    const investmentHorizon = Number.isFinite(body?.investmentHorizon)
      ? Number(body.investmentHorizon)
      : 10;

    if (!mvoHashId) {
      return NextResponse.json(
        { error: 'mvoHashId is required' },
        { status: 400 }
      );
    }

    const upstream = await fetch(`${CLOUDFLARE_BASE_URL}/api/v1/portfolio/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'API-KEY': CLOUDFLARE_API_KEY,
      },
      body: JSON.stringify({
        mvoHashId,
        initialCapital,
        monthlyDca,
        investmentHorizon,
      }),
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
        // Keep raw message when body is not JSON.
      }

      return NextResponse.json(
        {
          error: errorMessage,
        },
        { status: upstream.status }
      );
    }

    if (!contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json(
        { error: 'Unexpected response type from upstream simulate endpoint' },
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
