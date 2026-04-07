'use client';

import { useMemo } from 'react';
import type { MonteCarloResult } from '@/components/portfolio/MonteCarloProjection';

interface TotalProfitComparisonChartProps {
  data: MonteCarloResult | null;
  initialCapital: number;
  monthlyDca: number;
  investmentHorizon: number;
}

interface ChartPoint {
  year: number;
  portfolioValue: number;
  investedCapital: number;
  annualContribution: number;
  portfolioProfit: number;
  portfolioReturnPercent: number;
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

function getContributionBasis(index: number, maxIndex: number, initialCapital: number, monthlyDca: number, investmentHorizon: number): number {
  const elapsedMonths = maxIndex > 0
    ? Math.round((index / maxIndex) * Math.max(1, investmentHorizon) * 12)
    : 0;

  return initialCapital + elapsedMonths * monthlyDca;
}

export default function TotalProfitComparisonChart({
  data,
  initialCapital,
  monthlyDca,
  investmentHorizon,
}: TotalProfitComparisonChartProps) {
  const chartData = useMemo(() => {
    if (!data) {
      return [] as ChartPoint[];
    }

    const portfolioPath = data.chartPaths.expectedPath ?? [];
    const maxLength = portfolioPath.length;
    const safeHorizon = Math.max(1, Math.round(investmentHorizon));

    if (maxLength === 0) {
      return [] as ChartPoint[];
    }

    const maxIndex = Math.max(0, maxLength - 1);
    let previousPortfolioValue = Math.max(0, initialCapital);
    let previousInvestedCapital = Math.max(0, initialCapital);

    return Array.from({ length: safeHorizon }, (_, index) => {
      const yearNumber = index + 1;
      const targetIndex = Math.min(maxIndex, Math.round((yearNumber / safeHorizon) * maxIndex));
      const portfolioValue = portfolioPath[targetIndex] ?? portfolioPath[portfolioPath.length - 1] ?? 0;
      const contributionBasis = getContributionBasis(targetIndex, maxIndex, initialCapital, monthlyDca, investmentHorizon);
      const annualContribution = Math.max(0, contributionBasis - previousInvestedCapital);
      const portfolioProfit = portfolioValue - previousPortfolioValue - annualContribution;
      const profitBase = Math.max(1, previousPortfolioValue);

      const point = {
        year: new Date().getFullYear() + yearNumber,
        portfolioValue,
        investedCapital: contributionBasis,
        annualContribution,
        portfolioProfit,
        portfolioReturnPercent: (portfolioProfit / profitBase) * 100,
      } satisfies ChartPoint;

      previousPortfolioValue = portfolioValue;
      previousInvestedCapital = contributionBasis;

      return point;
    });
  }, [data, initialCapital, investmentHorizon, monthlyDca]);

  const summary = useMemo(() => {
    if (!data) {
      return null;
    }

    const latestYear = chartData[chartData.length - 1];
    if (!latestYear) {
      return null;
    }

    const totalProfit = latestYear.portfolioProfit;
    const totalProfitPercent = latestYear.portfolioReturnPercent;

    return {
      totalProfit,
      totalProfitPercent,
      year: latestYear.year,
    };
  }, [chartData]);

  const range = useMemo(() => {
    if (chartData.length === 0) {
      return { min: 0, max: 1 };
    }

    const values = chartData.map((item) => item.portfolioProfit);
    const min = Math.min(0, ...values);
    const max = Math.max(1, ...values);
    return { min, max };
  }, [chartData]);

  const chartHeight = 220;
  const chartRange = Math.max(1, range.max - range.min);
  const zeroLineTop = (range.max / chartRange) * chartHeight;

  function getBarMetrics(value: number) {
    const magnitude = (Math.abs(value) / chartRange) * chartHeight;
    if (value >= 0) {
      return {
        top: zeroLineTop - magnitude,
        height: Math.max(10, magnitude),
      };
    }

    return {
      top: zeroLineTop,
      height: Math.max(10, magnitude),
    };
  }

  if (!data || chartData.length === 0 || !summary) {
    return (
      <section className="rounded-[28px] border border-[#1f2a3d] bg-[#070b13] p-6">
        <div>
          <p className="text-sm font-semibold text-white">Profit YoY</p>
          <p className="mt-2 text-sm text-gray-400">Run the Monte Carlo simulation to show the annual year-over-year profit forecast.</p>
        </div>
        <div className="mt-6 flex h-[260px] items-center justify-center rounded-[22px] border border-dashed border-[#2b3b54] bg-[#0b111d] text-sm text-gray-500">
          Waiting for simulation data
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-[#1f2a3d] bg-[#070b13] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[1.35rem] font-semibold text-white">Annual Profit</p>
          <p className="mt-4 text-[clamp(2.4rem,5vw,3.4rem)] font-semibold tracking-[-0.03em] text-white">
            {formatCurrency(summary.totalProfit)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-[#113220] px-3 py-1 font-semibold text-[#35d27d]">
              {formatSignedPercent(summary.totalProfitPercent)}
            </span>
            <span className="text-gray-400">{formatSignedCurrency(summary.totalProfit)} in {summary.year} after removing that year's new contributions</span>
          </div>
        </div>
      </div>

      <div className="mt-8 w-full">
        <div className="relative w-full" style={{ height: chartHeight + 92 }}>
          <div className="absolute left-0 right-0 border-t border-dashed border-white/10" style={{ top: zeroLineTop }} />
          <div className="grid h-full gap-3 px-2 sm:gap-4 sm:px-3" style={{ gridTemplateColumns: `repeat(${chartData.length}, minmax(0, 1fr))` }}>
              {chartData.map((point) => {
                const portfolioBar = getBarMetrics(point.portfolioProfit);
                const highestValue = Math.max(point.portfolioProfit, 0);
                const highestBar = getBarMetrics(highestValue);

                return (
                  <div key={point.year} className="relative">
                    <div className="absolute left-1/2 -translate-x-1/2 text-center" style={{ top: Math.max(0, highestBar.top - 48), width: 84 }}>
                      <p className="text-[0.82rem] font-semibold text-white sm:text-[0.9rem]">{formatCurrency(point.portfolioProfit)}</p>
                      <p className="mt-1 text-xs text-gray-400">{formatSignedPercent(point.portfolioReturnPercent)}</p>
                    </div>

                    <div className="absolute inset-x-0 bottom-12 top-18 flex items-end justify-center">
                      <div className="relative h-full w-full max-w-[72px] sm:max-w-[82px]">
                        <div
                          className="absolute left-1/2 w-[42px] -translate-x-1/2 rounded-[12px] bg-[#6c4cff] shadow-[0_20px_40px_rgba(108,76,255,0.28)] sm:w-[56px]"
                          style={{ top: portfolioBar.top, height: portfolioBar.height }}
                        />
                      </div>
                    </div>

                    <p className="absolute bottom-0 left-1/2 -translate-x-1/2 text-sm font-medium text-gray-300 sm:text-base">{point.year}</p>
                  </div>
                );
              })}
            </div>
          </div>
      </div>
    </section>
  );
}