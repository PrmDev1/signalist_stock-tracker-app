'use client';

import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Minus, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { DashboardPortfolioWidgetData } from '@/components/dashboard/types';
import WidgetContainer from '@/components/dashboard/WidgetContainer';
import { Button } from '@/components/ui/button';

interface PortfolioSummaryWidgetProps {
  portfolio: DashboardPortfolioWidgetData;
  onRemove?: (portfolioId: string) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export default function PortfolioSummaryWidget({ portfolio, onRemove }: PortfolioSummaryWidgetProps) {
  const isPositive = portfolio.profitLoss >= 0;
  const topHoldings = portfolio.holdings.slice(0, 4);

  return (
    <WidgetContainer
      title={portfolio.name}
      subtitle={`Updated ${new Date(portfolio.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
      actions={
        onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-2xl border border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-white"
            onClick={() => onRemove(portfolio.id)}
            aria-label={`Remove ${portfolio.name} widget`}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(250px,0.9fr)]">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Current Value</p>
              <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(portfolio.currentValue)}</p>
            </div>

            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Profit / Loss</p>
              <div className="mt-3 flex items-center gap-2">
                <p className={['text-3xl font-semibold', isPositive ? 'text-[#35d27d]' : 'text-[#ff5c7a]'].join(' ')}>
                  {formatCurrency(portfolio.profitLoss)}
                </p>
                <span className={['inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', isPositive ? 'bg-[#10311f] text-[#35d27d]' : 'bg-[#361621] text-[#ff5c7a]'].join(' ')}>
                  {portfolio.profitLoss > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : portfolio.profitLoss < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                  {formatSignedPercent(portfolio.profitLossPercent)}
                </span>
              </div>
            </div>
          </div>

          <div className="h-[220px] rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,22,36,0.92),rgba(13,16,28,0.92))] p-4">
            {portfolio.chart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={portfolio.chart} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`dashboard-area-${portfolio.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6f5cff" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#6f5cff" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    cursor={{ stroke: 'rgba(255,255,255,0.08)' }}
                    contentStyle={{
                      background: '#111522',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 16,
                      color: '#fff',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Portfolio']}
                    labelFormatter={(label) => `Period ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#6f5cff"
                    strokeWidth={2.2}
                    fill={`url(#dashboard-area-${portfolio.id})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[18px] border border-dashed border-white/10 text-sm text-gray-500">
                No portfolio performance series is available yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Allocation</p>
              <p className="mt-2 text-sm text-gray-400">Top positions from the selected portfolio</p>
            </div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">{portfolio.riskLevel}</p>
          </div>

          <div className="mt-5 space-y-3">
            {topHoldings.map((holding) => (
              <div key={`${portfolio.id}-${holding.ticker}`} className="rounded-[18px] border border-white/8 bg-[#121726] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{holding.ticker}</p>
                    <p className="truncate text-xs text-gray-500">{holding.companyName}</p>
                  </div>
                  <p className="text-sm font-medium text-white">{(holding.weight * 100).toFixed(1)}%</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#6f5cff,#3bd6c6)]" style={{ width: `${Math.min(100, Math.max(6, holding.weight * 100))}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>{formatCurrency(holding.currentValue)}</span>
                  <span className={holding.dayChangePercent >= 0 ? 'text-[#35d27d]' : 'text-[#ff5c7a]'}>
                    {formatSignedPercent(holding.dayChangePercent)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WidgetContainer>
  );
}