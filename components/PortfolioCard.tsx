'use client';

import Link from 'next/link';
import { AlertCircle, ArrowUpRight } from 'lucide-react';
import DeletePortfolioButton from '@/components/portfolio/DeletePortfolioButton';
import EditPortfolioModal from './portfolio/EditPortfolioModal';
import { formatPercentWithoutRounding } from '@/lib/formatters';

export interface PortfolioCardProps {
  id: string;
  name: string;
  tickers: string[];
  allocations?: Record<string, { weight: number; allocatedAmount: number }>;
  initialCapital?: number;
  monthlyDca?: number;
  targetYears?: number;
  lookbackYears?: number;
  requireDiversification?: boolean;
  modelName?: 'mvo' | 'semi';
  tickerTags?: Record<string, string>;
  mvoId?: string;
  riskLevel: 'low' | 'medium' | 'high';
  volatility: number;
  expectedReturn: number;
  updatedAt: string;
}

interface PortfolioCardComponentProps extends PortfolioCardProps {
  onEditSave: (portfolio: PortfolioCardProps & { updatedAt: string }) => void;
}

type EditedPortfolioPayload = PortfolioCardProps & {
  editedAssets: import('@/components/portfolio/EditableAssetRow').EditablePortfolioAsset[];
  totalInvestment: number;
};

export default function PortfolioCard({
  id,
  name,
  tickers,
  allocations,
  initialCapital,
  monthlyDca,
  targetYears,
  lookbackYears,
  requireDiversification,
  modelName,
  tickerTags,
  mvoId,
  riskLevel,
  volatility,
  expectedReturn,
  updatedAt,
  onEditSave,
}: PortfolioCardComponentProps) {
  const normalizedRiskLevel = riskLevel.toLowerCase();
  const riskLabel = `${normalizedRiskLevel.charAt(0).toUpperCase()}${normalizedRiskLevel.slice(1)}`;
  const assets = tickers.length;
  const riskScore = volatility * 100;
  const expectedReturnPercent = expectedReturn * 100;

  const riskClass =
    normalizedRiskLevel === 'high'
      ? 'text-red-500'
      : normalizedRiskLevel === 'medium'
        ? 'text-yellow-400'
        : 'text-teal-400';

  const formattedDate = new Date(updatedAt).toLocaleDateString('th-TH');
  const portfolio = {
    id,
    name,
    tickers,
    allocations,
    initialCapital,
    monthlyDca,
    targetYears,
    lookbackYears,
    requireDiversification,
    modelName,
    tickerTags,
    mvoId,
    riskLevel,
    volatility,
    expectedReturn,
    updatedAt,
  };

  return (
    <article className="group relative block min-h-[280px] rounded-2xl border border-gray-700 bg-gradient-to-r from-gray-800 to-[#1c1c1c] px-5 py-5 shadow-lg transition-all duration-200 hover:border-gray-600 hover:shadow-[0_0_32px_rgba(88,98,255,0.10)]">
      <Link
        href={`/portfolio/${id}`}
        aria-label={`Open portfolio ${name}`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
      />

      <div className="relative z-20 flex items-start justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white leading-tight">{name}</h3>
          <p className="mt-1 text-lg text-gray-300 leading-none">{assets} assets</p>
        </div>

        <div className="relative z-20 flex items-center gap-2">
          <EditPortfolioModal
            portfolio={portfolio}
            onSave={(updatedPortfolio: EditedPortfolioPayload) => {
              onEditSave({
                ...portfolio,
                ...updatedPortfolio,
              });
            }}
          />
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-500">
            <ArrowUpRight className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      <div className="my-5 border-t border-gray-700" />

      <h4 className="text-2xl font-semibold text-gray-300 leading-tight">Status Portfolio</h4>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className={`h-5 w-5 ${riskClass}`} />
            <span className="text-xl text-gray-200 leading-none">{riskLabel} risk</span>
          </div>
          <span className={`text-xl font-bold ${riskClass} leading-none`}>{formatPercentWithoutRounding(riskScore)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xl text-gray-200 leading-none">Expected return</span>
          <span className="text-xl font-bold text-teal-400 leading-none">
            {expectedReturnPercent >= 0 ? '+' : ''}
            {formatPercentWithoutRounding(expectedReturnPercent)}
          </span>
        </div>
      </div>

      <div className="my-5 border-t border-gray-700" />

      <div className="relative z-20 flex items-center justify-between">
        <p className="text-base text-gray-500 leading-none">Last updated {formattedDate}</p>
        <DeletePortfolioButton id={id} name={name} />
      </div>
    </article>
  );
}
