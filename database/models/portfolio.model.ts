import { Schema, model, models, type Document, type Model } from 'mongoose';

export interface PortfolioItem extends Document {
  userId: string;
  name: string;
  tickers: string[];
  allocations: Record<string, { weight: number; allocatedAmount: number }>;
  expectedReturn: number;
  volatility: number;
  riskLevel: 'low' | 'medium' | 'high';
  modelName?: 'mvo' | 'semi';
  createdAt: Date;
  updatedAt: Date;
}

const AllocationSchema = new Schema(
  {
    weight: { type: Number, required: true },
    allocatedAmount: { type: Number, required: true },
  },
  { _id: false }
);

const PortfolioSchema = new Schema<PortfolioItem>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    tickers: [{ type: String, required: true, uppercase: true, trim: true }],
    allocations: {
      type: Map,
      of: AllocationSchema,
      default: {},
    },
    expectedReturn: { type: Number, required: true },
    volatility: { type: Number, required: true },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], required: true },
    modelName: { type: String, enum: ['mvo', 'semi'], required: false },
  },
  { timestamps: true }
);

export const Portfolio: Model<PortfolioItem> =
  (models?.Portfolio
    ? model<PortfolioItem>('Portfolio', PortfolioSchema, undefined, { overwriteModels: true })
    : model<PortfolioItem>('Portfolio', PortfolioSchema)) as Model<PortfolioItem>;
