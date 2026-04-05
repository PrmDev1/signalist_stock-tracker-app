'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Info } from 'lucide-react';
import type { SelectedDashboardPortfolio } from '@/components/dashboard/single-portfolio-types';
import type { MonteCarloResult } from '@/components/portfolio/MonteCarloProjection';

interface PortfolioOverviewPanelsProps {
  portfolio: SelectedDashboardPortfolio;
  monteCarloResult: MonteCarloResult | null;
}

interface ForecastPoint {
  step: number;
  year: number;
  expectedValue: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedCurrency(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

function formatSignedPercent(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function buildForecastData(result: MonteCarloResult | null, investmentHorizon: number): ForecastPoint[] {
  if (!result) {
    return [];
  }

  const expectedPath = result.chartPaths.expectedPath ?? [];
  const maxLength = expectedPath.length;

  if (maxLength === 0) {
    return [];
  }

  const safeHorizon = Math.max(1, investmentHorizon);
  const maxIndex = Math.max(0, maxLength - 1);
  const pointsPerYear = maxLength > 1 ? maxIndex / safeHorizon : 1;
  const currentYear = new Date().getFullYear();

  return Array.from({ length: maxLength }, (_, index) => {
    const yearValue = pointsPerYear > 0 ? index / pointsPerYear : 0;

    return {
      step: index,
      year: currentYear + yearValue,
      expectedValue: expectedPath[index] ?? expectedPath[maxIndex] ?? 0,
    };
  });
}

export default function PortfolioOverviewPanels({ portfolio, monteCarloResult }: PortfolioOverviewPanelsProps) {
  const forecastData = useMemo(
    () => buildForecastData(monteCarloResult, portfolio.investmentHorizon),
    [monteCarloResult, portfolio.investmentHorizon]
  );
  const forecastSummary = monteCarloResult?.pathSummaries.expectedScenario ?? null;
  const finalValue = forecastSummary?.finalValue ?? portfolio.currentValue;
  const totalInvested = forecastSummary?.totalInvested ?? portfolio.totalInvestment;
  const expectedProfit = forecastSummary?.netProfitOrLoss ?? portfolio.profitLoss;
  const expectedProfitPercent = totalInvested > 0 ? (expectedProfit / totalInvested) * 100 : 0;
  const estimatedCagr = totalInvested > 0
    ? (Math.pow(Math.max(finalValue, 1) / Math.max(totalInvested, 1), 1 / Math.max(1, portfolio.investmentHorizon)) - 1) * 100
    : 0;
  const xTicks = useMemo(() => {
    if (forecastData.length === 0) {
      return [] as number[];
    }

    const maxStep = forecastData[forecastData.length - 1]?.step ?? 0;
    const safeHorizon = Math.max(1, Math.round(portfolio.investmentHorizon));
    const pointsPerYear = maxStep > 0 ? maxStep / safeHorizon : 1;
    const ticks: number[] = [];

    for (let year = 0; year <= safeHorizon; year += 1) {
      ticks.push(Math.round(year * pointsPerYear));
    }

    return ticks;
  }, [forecastData, portfolio.investmentHorizon]);

  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[410px_minmax(0,1fr)]">
      <article className="min-w-0 rounded-[26px] border border-white/10 bg-[#12131f] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
        <div className="flex items-center gap-2 text-white">
          <h2 className="text-[1.35rem] font-semibold tracking-[-0.03em]">Total Assets</h2>
          <Info className="h-4 w-4 text-gray-500" />
        </div>

        <p className="mt-5 text-[clamp(2.4rem,5vw,3.6rem)] font-semibold leading-none tracking-[-0.05em] text-white">
          {formatCurrency(totalInvested)}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2.5 text-sm">
          <span className={[
            'rounded-full px-3 py-1 font-semibold',
            expectedProfit >= 0 ? 'bg-[#10311f] text-[#35d27d]' : 'bg-[#361621] text-[#ff5c7a]'
          ].join(' ')}>
            {formatSignedPercent(expectedProfitPercent)}
          </span>
          <span className="text-sm text-gray-400">{formatSignedCurrency(expectedProfit)} expected profit</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Final Value</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(finalValue)}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">CAGR Est.</p>
            <p className="mt-2 text-2xl font-semibold text-[#7fd7ff]">{formatPercent(estimatedCagr)}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xl font-semibold text-white">Distribution</p>
          <div className="mt-4 flex h-5 overflow-hidden rounded-full border border-white/10 bg-[#171925] p-1">
            {portfolio.investedBreakdown.map((item) => (
              <span
                key={item.label}
                className="h-full rounded-full"
                style={{ width: `${Math.max(item.percent, 4)}%`, backgroundColor: item.color }}
              />
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {portfolio.investedBreakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between border-b border-white/8 pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <span className="mt-1.5 h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <div>
                    <p className="text-[1.1rem] font-semibold leading-none text-white">{item.label}</p>
                    <p className="mt-1 text-sm text-gray-400">{item.percent.toFixed(2)}%</p>
                  </div>
                </div>
                <p className="text-[1.2rem] font-medium tracking-[-0.03em] text-white">{formatCurrency(item.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      </article>

      <article className="min-w-0 rounded-[26px] border border-white/10 bg-[#12131f] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
        <div className="flex items-center gap-2 text-white">
          <h2 className="text-[1.35rem] font-semibold tracking-[-0.03em]">Investment Forecast</h2>
          <Info className="h-4 w-4 text-gray-500" />
        </div>

        <p className="mt-5 text-[clamp(2.4rem,5vw,3.4rem)] font-semibold leading-none tracking-[-0.05em] text-white">
          {formatCurrency(finalValue)}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2.5 text-sm">
          <span className={[
            'rounded-full px-3 py-1 font-semibold',
            expectedProfit >= 0 ? 'bg-[#10311f] text-[#35d27d]' : 'bg-[#361621] text-[#ff5c7a]'
          ].join(' ')}>
            {formatSignedPercent(expectedProfitPercent)}
          </span>
          <span className="text-gray-400">
            {forecastSummary
              ? `${formatSignedCurrency(expectedProfit)} expected profit from Monte Carlo`
              : 'Waiting for Monte Carlo forecast'}
          </span>
        </div>

        <div className="mt-5 h-[240px] sm:h-[280px]">
          {forecastData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="total-investments-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8f75ff" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8f75ff" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#23273a" strokeDasharray="2 6" />
                <XAxis
                  dataKey="step"
                  type="number"
                  domain={[0, 'dataMax']}
                  ticks={xTicks}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  tick={{ fill: '#9aa0b4', fontSize: 11 }}
                  tickFormatter={(value) => {
                    const maxStep = forecastData[forecastData.length - 1]?.step ?? 1;
                    const yearOffset = (Number(value) / Math.max(1, maxStep)) * Math.max(1, portfolio.investmentHorizon);
                    return `${Math.round(new Date().getFullYear() + yearOffset)}`;
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={76}
                  tick={{ fill: '#9aa0b4', fontSize: 11 }}
                  tickFormatter={(value) => formatCurrency(Number(value))}
                />
                <Tooltip
                  labelFormatter={(value) => {
                    const maxStep = forecastData[forecastData.length - 1]?.step ?? 1;
                    const yearOffset = (Number(value) / Math.max(1, maxStep)) * Math.max(1, portfolio.investmentHorizon);
                    return `Forecast ${Math.round(new Date().getFullYear() + yearOffset)}`;
                  }}
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Expected Portfolio']}
                  contentStyle={{
                    backgroundColor: '#1d2030',
                    border: '1px solid #313652',
                    borderRadius: '16px',
                    color: '#f3f4f6',
                  }}
                />
                <ReferenceLine y={forecastSummary?.totalInvested ?? portfolio.totalInvestment} stroke="#a38cff" strokeDasharray="2 6" />
                <Area
                  type="monotone"
                  dataKey="expectedValue"
                  stroke="#8f75ff"
                  strokeWidth={3}
                  fill="url(#total-investments-area)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] text-sm text-gray-500">
              Waiting for Monte Carlo forecast
            </div>
          )}
        </div>
      </article>
    </section>
  );
}