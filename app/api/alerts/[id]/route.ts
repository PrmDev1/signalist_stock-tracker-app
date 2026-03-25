import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/database/mongoose';
import { PriceAlert, type PriceAlertType } from '@/database/models/price-alert.model';
import { auth } from '@/lib/better-auth/auth';

interface UpdatePriceAlertBody {
  alertType?: PriceAlertType;
  triggerPrice?: number;
  currentPriceAtSet?: number;
  isActive?: boolean;
  company?: string;
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

async function getSessionUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;

  return session.user;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Alert id is required' }, { status: 400 });
    }

    const body = (await request.json()) as UpdatePriceAlertBody;

    const updates: Record<string, unknown> = {};

    if (body.alertType) {
      if (body.alertType !== 'ABOVE' && body.alertType !== 'BELOW') {
        return NextResponse.json({ error: 'alertType must be ABOVE or BELOW' }, { status: 400 });
      }
      updates.alertType = body.alertType;
    }

    if (body.company !== undefined) {
      updates.company = String(body.company || '').trim();
    }

    if (body.triggerPrice !== undefined) {
      const triggerPrice = Number(body.triggerPrice);
      if (!Number.isFinite(triggerPrice) || triggerPrice <= 0) {
        return NextResponse.json({ error: 'triggerPrice must be greater than 0' }, { status: 400 });
      }
      updates.triggerPrice = triggerPrice;
    }

    if (body.currentPriceAtSet !== undefined) {
      const currentPriceAtSet = Number(body.currentPriceAtSet);
      if (!Number.isFinite(currentPriceAtSet) || currentPriceAtSet <= 0) {
        return NextResponse.json({ error: 'currentPriceAtSet must be greater than 0' }, { status: 400 });
      }
      updates.currentPriceAtSet = currentPriceAtSet;
      updates.lastEvaluatedPrice = currentPriceAtSet;
      updates.triggeredAt = null;
    }

    if (body.isActive !== undefined) {
      updates.isActive = Boolean(body.isActive);
      if (updates.isActive) {
        updates.triggeredAt = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await connectToDatabase();

    const existingAlert = await PriceAlert.findOne({ _id: id, userId: user.id }).lean();
    if (!existingAlert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const effectiveAlertType = (updates.alertType as PriceAlertType | undefined) || existingAlert.alertType;
    const effectiveTriggerPrice =
      typeof updates.triggerPrice === 'number'
        ? (updates.triggerPrice as number)
        : Number(existingAlert.triggerPrice);
    const effectiveCurrentPriceAtSet =
      typeof updates.currentPriceAtSet === 'number'
        ? (updates.currentPriceAtSet as number)
        : Number(existingAlert.currentPriceAtSet);

    if (effectiveAlertType === 'ABOVE' && effectiveTriggerPrice <= effectiveCurrentPriceAtSet) {
      return NextResponse.json(
        { error: 'For ABOVE alert, triggerPrice must be above currentPriceAtSet' },
        { status: 400 }
      );
    }

    if (effectiveAlertType === 'BELOW' && effectiveTriggerPrice >= effectiveCurrentPriceAtSet) {
      return NextResponse.json(
        { error: 'For BELOW alert, triggerPrice must be below currentPriceAtSet' },
        { status: 400 }
      );
    }

    const alert = await PriceAlert.findOneAndUpdate(
      { _id: id, userId: user.id },
      { $set: updates },
      { new: true }
    ).lean();

    return NextResponse.json({ alert: toAlertDto(alert) }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update alert';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Alert id is required' }, { status: 400 });
    }

    await connectToDatabase();

    const deleted = await PriceAlert.findOneAndDelete({ _id: id, userId: user.id }).lean();

    if (!deleted) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete alert';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
