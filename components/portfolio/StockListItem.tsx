'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { CompanyProfile } from '@/lib/actions/portfolio.actions';
import TickerLogo from '@/components/portfolio/detail/TickerLogo';

export type StockColumnKey =
  | 'ticker'
  | 'companyName'
  | 'primaryExchange'
  | 'sector'
  | 'filerSize'
  | 'price5YearGrowth'
  | 'divScore'
  | 'div5YearGrowth'
  | 'latestPrice'
  | 'yesterdayPrice'
  | 'change'
  | 'select';

export type StockColumnVisibility = Record<StockColumnKey, boolean>;

interface StockListItemProps {
  stock: CompanyProfile;
  isSelected: boolean;
  onSelect: (ticker: string) => void;
  visibleColumns: StockColumnVisibility;
  columnTemplate: string;
}

const formatPrice = (price: number): string => {
  return `$${price.toFixed(2)}`;
};

const formatPercentFromRatio = (value?: number): string => {
  if (!Number.isFinite(value)) return '-';
  return `${(Number(value) * 100).toFixed(2)}%`;
};

function getCategoryTagStyle(category?: string): { label: string; className: string } | null {
  if (!category) return null;

  const normalized = String(category).trim().toLowerCase();
  switch (normalized) {
    case 'growth':
      return {
        label: 'เติบโต',
        className: 'border border-cyan-500/40 bg-cyan-500/15 text-cyan-300',
      };
    case 'dividend':
      return {
        label: 'ปันผล',
        className: 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
      };
    case 'balanced':
      return {
        label: 'สมดุล',
        className: 'border border-violet-500/40 bg-violet-500/15 text-violet-300',
      };
    case 'core':
      return {
        label: 'แกนหลัก',
        className: 'border border-blue-500/40 bg-blue-500/15 text-blue-300',
      };
    case 'underperformer':
      return {
        label: 'ผลตอบแทนต่ำ',
        className: 'border border-amber-500/40 bg-amber-500/15 text-amber-300',
      };
    default:
      return {
        label: category,
        className: 'border border-gray-500/40 bg-gray-700/30 text-gray-200',
      };
  }
}

export default function StockListItem({
  stock,
  isSelected,
  onSelect,
  visibleColumns,
  columnTemplate,
}: StockListItemProps) {
  const hasPrice = Number.isFinite(stock.latestPrice);
  const price = hasPrice ? Number(stock.latestPrice) : 0;
  const hasYesterdayPrice = Number.isFinite(stock.yesterdayPrice);
  const yesterdayPrice = hasYesterdayPrice ? Number(stock.yesterdayPrice) : 0;
  const change =
    Number.isFinite(stock.latestPrice) && Number.isFinite(stock.yesterdayPrice) && Number(stock.yesterdayPrice) > 0
      ? ((Number(stock.latestPrice) - Number(stock.yesterdayPrice)) / Number(stock.yesterdayPrice)) * 100
      : null;
  const divConsistency = Number.isFinite(stock.metrics?.divConsistencyScore)
    ? Number(stock.metrics?.divConsistencyScore)
    : null;
  const hasChange = change !== null;
  const isPositive = hasChange && change >= 0;
  const categoryTag = getCategoryTagStyle(stock.portfolioCategory);

  return (
    <div
      onClick={() => onSelect(stock.ticker)}
      className={`group relative grid items-center gap-3 px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/35 transition-colors duration-200 cursor-pointer ${
        isSelected ? 'bg-blue-700/20 border-b-gray-700' : ''
      }`}
      style={{ gridTemplateColumns: columnTemplate }}
    >
      {visibleColumns.ticker && (
      <div className="relative z-10 inline-flex items-center gap-2 min-w-0">
        <div className="h-10 w-10 rounded-lg overflow-hidden border border-gray-700/40 bg-gray-800/50">
          <TickerLogo ticker={stock.ticker} size={48} fillContainer className="h-full w-full rounded-lg border-0 bg-transparent" />
        </div>
        <p className="text-sm font-bold text-white truncate">{stock.ticker}</p>
      </div>
      )}

      {visibleColumns.companyName && (
      <div className="relative z-10 min-w-0">
        <p className="text-sm font-medium text-gray-100 truncate">{stock.companyName}</p>
        {categoryTag ? (
          <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${categoryTag.className}`}>
            {categoryTag.label}
          </span>
        ) : null}
      </div>
      )}

      {visibleColumns.primaryExchange && (
      <div className="relative z-10 text-sm text-gray-300">{stock.primaryExchange || '-'}</div>
      )}

      {visibleColumns.sector && (
      <div className="relative z-10 min-w-0 text-xs text-gray-300 truncate" title={stock.sector}>
        {stock.sector || '-'}
      </div>
      )}

      {visibleColumns.filerSize && (
      <div className="relative z-10 text-xs text-gray-300 truncate" title={stock.filerSize}>
        {stock.filerSize || '-'}
      </div>
      )}

      {visibleColumns.price5YearGrowth && (
      <div className="relative z-10 text-xs text-gray-200 font-medium">
        {formatPercentFromRatio(stock.metrics?.price5YearCAGR)}
      </div>
      )}

      {visibleColumns.divScore && (
      <div className="relative z-10 text-xs text-gray-200 font-medium">
        {divConsistency ?? '-'}
      </div>
      )}

      {visibleColumns.div5YearGrowth && (
      <div className="relative z-10 text-xs text-gray-200 font-medium">
        {formatPercentFromRatio(stock.metrics?.div5YearCAGR)}
      </div>
      )}

      {visibleColumns.latestPrice && (
      <div className="relative z-10 text-sm font-semibold text-white">
        {hasPrice ? formatPrice(price) : '-'}
      </div>
      )}

      {visibleColumns.yesterdayPrice && (
      <div className="relative z-10 text-sm text-gray-300">
        {hasYesterdayPrice ? formatPrice(yesterdayPrice) : '-'}
      </div>
      )}

      {visibleColumns.change && (
      <div className="relative z-10 flex items-center gap-1 text-sm font-semibold">
        {hasChange ? (
          <>
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            )}
            <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
              {isPositive ? '+' : ''}{change.toFixed(2)}%
            </span>
          </>
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </div>
      )}

      {visibleColumns.select && (
      <div className="relative z-10 flex justify-center">
        <div className={`relative w-5 h-5 rounded-md border-2 transition-all duration-200 ${
          isSelected
            ? 'bg-gradient-to-br from-blue-500 to-cyan-500 border-blue-400 shadow-lg shadow-blue-500/40'
            : 'border-gray-600 bg-gray-800/50 hover:border-blue-400'
        }`}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(stock.ticker);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label={`Select ${stock.ticker}`}
          />
          {isSelected && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
