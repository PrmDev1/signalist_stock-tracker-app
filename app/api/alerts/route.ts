import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/database/mongoose';
import { PriceAlert, type PriceAlertType } from '@/database/models/price-alert.model';
import { auth } from '@/lib/better-auth/auth';

interface CreatePriceAlertBody {
  ticker?: string;
  company?: string;
  alertType?: PriceAlertType;
  triggerPrice?: number;
  currentPriceAtSet?: number;
}

const toAlertDto = (alert: any) => ({
  id: String(alert._id),
  userId: String(alert.userId),
  ticker: String(alert.ticker),
  company: alert.company ? String(alert.company) : '',
  alertType: alert.alertType as PriceAlertType,
  triggerPrice: Number(alert.triggerPrice),
  currentPriceAtSet: Number(alert.currentPriceAtSet),
  lastEvaluatedPrice: Number(alert.lastEvaluatedPrice),
  isActive: Boolean(alert.isActive),
  createdAt: new Date(alert.createdAt).toISOString(),
  updatedAt: new Date(alert.updatedAt).toISOString(),
  triggeredAt: alert.triggeredAt ? new Date(alert.triggeredAt).toISOString() : null,
});

const parseTickerList = (value: string | null) => {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
};

async function getSessionUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return null;
  }

  return session.user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const ticker = request.nextUrl.searchParams.get('ticker')?.trim().toUpperCase();
    const tickers = parseTickerList(request.nextUrl.searchParams.get('tickers'));

    if (ticker) {
      const alert = await PriceAlert.findOne({ userId: user.id, ticker }).lean();
      return NextResponse.json({ alert: alert ? toAlertDto(alert) : null }, { status: 200 });
    }

    if (tickers.length > 0) {
      const alerts = await PriceAlert.find({ userId: user.id, ticker: { $in: tickers } }).lean();
      return NextResponse.json({ alerts: alerts.map(toAlertDto) }, { status: 200 });
    }

    const alerts = await PriceAlert.find({ userId: user.id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ alerts: alerts.map(toAlertDto) }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load alerts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as CreatePriceAlertBody;
    const ticker = String(body.ticker || '')
      .trim()
      .toUpperCase();
    const company = String(body.company || '').trim();
    const alertType = body.alertType;
    const triggerPrice = Number(body.triggerPrice);
    const currentPriceAtSet = Number(body.currentPriceAtSet);

    if (!ticker) {
      return NextResponse.json({ error: 'ticker is required' }, { status: 400 });
    }

    if (alertType !== 'ABOVE' && alertType !== 'BELOW') {
      return NextResponse.json({ error: 'alertType must be ABOVE or BELOW' }, { status: 400 });
    }

    if (!Number.isFinite(triggerPrice) || triggerPrice <= 0) {
      return NextResponse.json({ error: 'triggerPrice must be greater than 0' }, { status: 400 });
    }

    if (!Number.isFinite(currentPriceAtSet) || currentPriceAtSet <= 0) {
      return NextResponse.json({ error: 'currentPriceAtSet must be greater than 0' }, { status: 400 });
    }

    if (alertType === 'ABOVE' && triggerPrice <= currentPriceAtSet) {
      return NextResponse.json(
        { error: 'For ABOVE alert, triggerPrice must be above currentPriceAtSet' },
        { status: 400 }
      );
    }

    if (alertType === 'BELOW' && triggerPrice >= currentPriceAtSet) {
      return NextResponse.json(
        { error: 'For BELOW alert, triggerPrice must be below currentPriceAtSet' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const alert = await PriceAlert.findOneAndUpdate(
      { userId: user.id, ticker },
      {
        $set: {
          userId: user.id,
          ticker,
          company,
          alertType,
          triggerPrice,
          currentPriceAtSet,
          lastEvaluatedPrice: currentPriceAtSet,
          isActive: true,
          triggeredAt: null,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return NextResponse.json({ alert: toAlertDto(alert) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create alert';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
