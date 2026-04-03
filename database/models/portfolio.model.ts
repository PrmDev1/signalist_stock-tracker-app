import { Schema, model, models, type Document, type Model } from 'mongoose';
import type { BacktestAndMetrics, RiskRewardProfile } from '@/components/portfolio/analysis-types';

export interface PortfolioItem extends Document {
  userId: string;
  name: string;
  tickers: string[];
  tickerTags?: Record<string, string>;
  mvoId?: string;
  initialCapital?: number;
  monthlyDca?: number;
  targetYears?: number;
  lookbackYears?: number;
  requireDiversification?: boolean;
  allocations: Record<string, { weight: number; allocatedAmount: number }>;
  expectedReturn: number;
  volatility: number;
  sharpeRatio?: number;
  riskLevel: 'low' | 'medium' | 'high';
  modelName?: 'mvo' | 'semi';
  backtestAndMetrics?: BacktestAndMetrics;
  riskRewardProfile?: RiskRewardProfile;
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
    tickerTags: {
      type: Map,
      of: String,
      required: false,
      default: {},
    },
    mvoId: { type: String, required: false, trim: true },
    initialCapital: { type: Number, required: false },
    monthlyDca: { type: Number, required: false, default: 0, min: 0 },
    targetYears: { type: Number, required: false, default: 10, min: 1, max: 20 },
    lookbackYears: { type: Number, required: false, default: 5, min: 1, max: 20 },
    requireDiversification: { type: Boolean, required: false, default: true },
    allocations: {
      type: Map,
      of: AllocationSchema,
      default: {},
    },
    expectedReturn: { type: Number, required: true },
    volatility: { type: Number, required: true },
    sharpeRatio: { type: Number, required: false },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], required: true },
    modelName: { type: String, enum: ['mvo', 'semi'], required: false },
    backtestAndMetrics: { type: Schema.Types.Mixed, required: false },
    riskRewardProfile: { type: Schema.Types.Mixed, required: false },
  },
  { timestamps: true }
);

export const Portfolio: Model<PortfolioItem> =
  (models?.Portfolio
    ? model<PortfolioItem>('Portfolio', PortfolioSchema, undefined, { overwriteModels: true })
    : model<PortfolioItem>('Portfolio', PortfolioSchema)) as Model<PortfolioItem>;
