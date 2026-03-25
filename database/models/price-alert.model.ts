import { Schema, model, models, type Document, type Model } from 'mongoose';

export type PriceAlertType = 'ABOVE' | 'BELOW';

export interface PriceAlertDocument extends Document {
  userId: string;
  ticker: string;
  company?: string;
  alertType: PriceAlertType;
  triggerPrice: number;
  currentPriceAtSet: number;
  lastEvaluatedPrice: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  triggeredAt?: Date | null;
}

const PriceAlertSchema = new Schema<PriceAlertDocument>(
  {
    userId: { type: String, required: true, index: true },
    ticker: { type: String, required: true, uppercase: true, trim: true },
    company: { type: String, trim: true },
    alertType: {
      type: String,
      enum: ['ABOVE', 'BELOW'],
      required: true,
    },
    triggerPrice: { type: Number, required: true, min: 0 },
    currentPriceAtSet: { type: Number, required: true, min: 0 },
    lastEvaluatedPrice: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    triggeredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PriceAlertSchema.index({ userId: 1, ticker: 1 }, { unique: true });
PriceAlertSchema.index({ isActive: 1, ticker: 1 });

export const PriceAlert: Model<PriceAlertDocument> =
  (models?.PriceAlert as Model<PriceAlertDocument>) ||
  model<PriceAlertDocument>('PriceAlert', PriceAlertSchema);
