'use client';

import { ArrowUpRight, Gauge, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { normalizeCommunityAllocations, type CommunityPortfolioData } from './types';

interface CommunityPortfolioCardProps {
  portfolio: CommunityPortfolioData;
  onViewDetails: (portfolio: CommunityPortfolioData) => void;
}

const SEGMENT_COLORS = ['#7db8ff', '#0fedbe', '#5862ff', '#fdd458', '#ff8243'];

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatModelName(value: string): string {
  if (value.toLowerCase() === 'semi') return 'Semi-Variance';
  return value.toUpperCase();
}

function formatRiskLevel(value?: string | null): 'Low' | 'Medium' | 'High' {
  const normalized = value?.trim().toLowerCase();

  if (normalized === 'low') return 'Low';
  if (normalized === 'high') return 'High';
  return 'Medium';
}

function formatCreatedDate(value?: string | null): string {
  if (!value) return 'Recently added';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recently added';

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(parsed);
}

function getSharpeTone(sharpeRatio: number): string {
  if (sharpeRatio >= 1.25) {
    return 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.18)]';
  }

  if (sharpeRatio >= 0.8) {
    return 'border-amber-400/35 bg-amber-400/10 text-amber-100 shadow-[0_0_24px_rgba(245,158,11,0.14)]';
  }

  return 'border-rose-400/35 bg-rose-400/10 text-rose-100 shadow-[0_0_24px_rgba(244,63,94,0.16)]';
}

export default function CommunityPortfolioCard({ portfolio, onViewDetails }: CommunityPortfolioCardProps) {
  const topAllocations = normalizeCommunityAllocations(portfolio.allocations).slice(0, 3);
  const riskLevelLabel = formatRiskLevel(portfolio.riskLv);

  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(125,184,255,0.18),transparent_32%),linear-gradient(180deg,rgba(13,18,31,0.94),rgba(7,10,18,0.94))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#7db8ff]/30 hover:shadow-[0_28px_90px_rgba(8,15,30,0.7)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(88,98,255,0.12),transparent_40%,rgba(15,237,190,0.08))] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#7db8ff]/25 bg-[#7db8ff]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b9d8ff]">
            <Sparkles className="h-3.5 w-3.5" />
            {formatModelName(portfolio.modelName)}
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">{portfolio.mvoId.slice(0, 8).toUpperCase()} Strategy</h3>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Community-built allocation blueprint ranked for efficient risk-adjusted performance.
          </p>
        </div>

        <div className={`rounded-2xl border px-3 py-2 text-right ${getSharpeTone(portfolio.sharpeRatio)}`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">Sharpe Ratio</p>
          <p className="mt-1 text-2xl font-semibold">{portfolio.sharpeRatio.toFixed(2)}</p>
        </div>
      </div>

      <div className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Expected Return</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">{formatPercent(portfolio.expectedReturn)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Volatility</p>
          <p className="mt-2 text-2xl font-semibold text-rose-300">{formatPercent(portfolio.volatility)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Risk Level</p>
          <p className="mt-2 max-w-full text-xl font-semibold leading-tight text-[#b9d8ff] sm:text-2xl">
            {riskLevelLabel}
          </p>
        </div>
      </div>

      <div className="relative mt-6 rounded-[24px] border border-white/8 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
            <Layers3 className="h-4 w-4 text-[#7db8ff]" />
            Allocation Snapshot
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Gauge className="h-3.5 w-3.5 text-[#0fedbe]" />
            Top weighted holdings
          </div>
        </div>

        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white/5">
          {topAllocations.map(({ ticker, weight }, index) => (
            <div
              key={ticker}
              className="h-full"
              style={{
                width: `${Math.max(weight * 100, 8)}%`,
                backgroundColor: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
              }}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {topAllocations.map(({ ticker, weight }, index) => (
            <span
              key={ticker}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-gray-200"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: SEGMENT_COLORS[index % SEGMENT_COLORS.length] }}
              />
              {ticker}
              <span className="text-gray-400">{formatPercent(weight)}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[#7db8ff]" />
            {portfolio.lookbackYears}Y lookback
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <ShieldCheck className={`h-4 w-4 ${portfolio.isDiversified ? 'text-[#0fedbe]' : 'text-gray-500'}`} />
            {portfolio.isDiversified ? 'Diversified' : 'Concentrated'}
          </span>
        </div>

        <p className="text-xs text-gray-500">{formatCreatedDate(portfolio.createAt)}</p>
      </div>

      <Button
        type="button"
        onClick={() => onViewDetails(portfolio)}
        className="relative mt-6 h-11 w-full rounded-2xl border border-[#7db8ff]/25 bg-gradient-to-r from-[#131e35] via-[#152444] to-[#18294f] text-white shadow-[0_0_24px_rgba(88,98,255,0.18)] transition-all duration-300 hover:scale-[1.01] hover:border-[#7db8ff]/40 hover:shadow-[0_0_34px_rgba(88,98,255,0.28)]"
      >
        Apply
        <ArrowUpRight className="h-4 w-4" />
      </Button>
    </article>
  );
}