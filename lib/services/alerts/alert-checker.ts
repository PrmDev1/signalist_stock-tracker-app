import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/database/mongoose';
import { PriceAlert } from '@/database/models/price-alert.model';
import { getStockQuotePrice } from '@/lib/actions/finnhub.actions';
import { EmailNotificationService } from '@/lib/services/email/notification.service';

interface UserDoc {
  _id: ObjectId;
  id?: string;
  email?: string;
  name?: string;
}

interface AlertCheckResult {
  totalActiveAlerts: number;
  trackedTickers: number;
  triggered: number;
  skippedMissingPrice: number;
  skippedMissingUser: number;
  failedEmails: number;
}

const resolveUserEmailMap = async (userIds: string[]) => {
  const mongoose = await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) return new Map<string, UserDoc>();

  const objectIds = userIds
    .filter((value) => ObjectId.isValid(value))
    .map((value) => new ObjectId(value));

  const users = (await db
    .collection<UserDoc>('user')
    .find(
      {
        $or: [
          { id: { $in: userIds } },
          { _id: { $in: objectIds } },
        ],
      },
      {
        projection: {
          _id: 1,
          id: 1,
          email: 1,
          name: 1,
        },
      }
    )
    .toArray()) as UserDoc[];

  const userMap = new Map<string, UserDoc>();

  for (const user of users) {
    if (user.id) {
      userMap.set(user.id, user);
    }
    userMap.set(String(user._id), user);
  }

  return userMap;
};

export const runPriceAlertCheck = async (): Promise<AlertCheckResult> => {
  await connectToDatabase();

  const activeAlerts = await PriceAlert.find({ isActive: true }).lean();
  if (activeAlerts.length === 0) {
    return {
      totalActiveAlerts: 0,
      trackedTickers: 0,
      triggered: 0,
      skippedMissingPrice: 0,
      skippedMissingUser: 0,
      failedEmails: 0,
    };
  }

  const uniqueTickers = Array.from(new Set(activeAlerts.map((alert) => alert.ticker.toUpperCase())));

  const prices = await Promise.all(
    uniqueTickers.map(async (ticker) => ({
      ticker,
      price: await getStockQuotePrice(ticker),
    }))
  );

  const priceByTicker = new Map<string, number>();
  let skippedMissingPrice = 0;

  for (const quote of prices) {
    if (!Number.isFinite(quote.price) || !quote.price || quote.price <= 0) {
      skippedMissingPrice += 1;
      continue;
    }
    priceByTicker.set(quote.ticker, quote.price);
  }

  const userIds = Array.from(new Set(activeAlerts.map((alert) => String(alert.userId))));
  const userMap = await resolveUserEmailMap(userIds);

  const updates: Array<{ filter: { _id: unknown }; update: { $set: Record<string, unknown> } }> = [];
  let triggered = 0;
  let skippedMissingUser = 0;
  let failedEmails = 0;

  for (const alert of activeAlerts) {
    const ticker = alert.ticker.toUpperCase();
    const currentPrice = priceByTicker.get(ticker);
    if (!currentPrice) continue;

    const previousPrice = Number.isFinite(alert.lastEvaluatedPrice)
      ? Number(alert.lastEvaluatedPrice)
      : Number(alert.currentPriceAtSet);

    const crossedAbove =
      alert.alertType === 'ABOVE' &&
      previousPrice <= Number(alert.triggerPrice) &&
      currentPrice > Number(alert.triggerPrice);

    const crossedBelow =
      alert.alertType === 'BELOW' &&
      previousPrice >= Number(alert.triggerPrice) &&
      currentPrice < Number(alert.triggerPrice);

    if (crossedAbove || crossedBelow) {
      const user = userMap.get(String(alert.userId));
      if (!user?.email) {
        skippedMissingUser += 1;
        updates.push({
          filter: { _id: alert._id },
          update: {
            $set: {
              isActive: false,
              lastEvaluatedPrice: currentPrice,
              triggeredAt: new Date(),
            },
          },
        });
        continue;
      }

      try {
        await EmailNotificationService.sendPriceAlertTriggeredEmail({
          to: user.email,
          ticker,
          company: alert.company || ticker,
          alertType: alert.alertType,
          triggerPrice: Number(alert.triggerPrice),
          currentPrice,
        });

        triggered += 1;
        updates.push({
          filter: { _id: alert._id },
          update: {
            $set: {
              isActive: false,
              lastEvaluatedPrice: currentPrice,
              triggeredAt: new Date(),
            },
          },
        });
      } catch (error) {
        console.error('price-alert email send failed', { ticker, alertId: String(alert._id), error });
        failedEmails += 1;
        updates.push({
          filter: { _id: alert._id },
          update: {
            $set: {
              lastEvaluatedPrice: currentPrice,
            },
          },
        });
      }

      continue;
    }

    updates.push({
      filter: { _id: alert._id },
      update: {
        $set: {
          lastEvaluatedPrice: currentPrice,
        },
      },
    });
  }

  if (updates.length > 0) {
    await PriceAlert.bulkWrite(
      updates.map((item) => ({
        updateOne: {
          filter: item.filter,
          update: item.update,
        },
      }))
    );
  }

  return {
    totalActiveAlerts: activeAlerts.length,
    trackedTickers: uniqueTickers.length,
    triggered,
    skippedMissingPrice,
    skippedMissingUser,
    failedEmails,
  };
};
