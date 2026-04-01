'use client';

import { Filter, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CommunityPortfolioFilterDraft, CommunityRiskLevel } from './types';

interface PortfolioFiltersProps {
  value: CommunityPortfolioFilterDraft;
  loading: boolean;
  onChange: (next: CommunityPortfolioFilterDraft) => void;
  onApply: () => void;
  onReset: () => void;
}

const RISK_SEGMENTS: Array<{ value: 'all' | CommunityRiskLevel; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export default function PortfolioFilters({ value, loading, onChange, onApply, onReset }: PortfolioFiltersProps) {
  const updateValue = <Key extends keyof CommunityPortfolioFilterDraft>(key: Key, next: CommunityPortfolioFilterDraft[Key]) => {
    onChange({ ...value, [key]: next });
  };

  const diversificationEnabled = value.isDiversified === 'yes';

  return (
    <aside className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(125,184,255,0.14),transparent_35%),linear-gradient(180deg,rgba(12,16,27,0.92),rgba(8,10,18,0.9))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7db8ff] to-transparent opacity-80" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#7db8ff]/20 bg-[#7db8ff]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b9d8ff]">
            <Sparkles className="h-3.5 w-3.5" />
            Filter Engine
          </div>
          <h2 className="mt-4 text-xl font-semibold text-white">Shape the discovery feed</h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Tune return, risk, model logic, and diversification before querying the community dataset.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <Filter className="h-5 w-5 text-[#7db8ff]" />
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <section className="rounded-[24px] border border-white/8 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Return Range</p>
              <p className="text-xs text-gray-500">Enter percentage values like 10 to 50. These are sent to the backend as-is.</p>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-200">
              Performance
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              inputMode="decimal"
              placeholder="Min %"
              value={value.minReturn}
              onChange={(event) => updateValue('minReturn', event.target.value)}
              disabled={loading}
              className="h-11 rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-gray-500"
            />
            <Input
              inputMode="decimal"
              placeholder="Max %"
              value={value.maxReturn}
              onChange={(event) => updateValue('maxReturn', event.target.value)}
              disabled={loading}
              className="h-11 rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-gray-500"
            />
          </div>
        </section>

        <section className="rounded-[24px] border border-white/8 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Risk Range</p>
              <p className="text-xs text-gray-500">Filter by volatility, also entered as percentages.</p>
            </div>
            <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-rose-200">
              Volatility
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              inputMode="decimal"
              placeholder="Min %"
              value={value.minRisk}
              onChange={(event) => updateValue('minRisk', event.target.value)}
              disabled={loading}
              className="h-11 rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-gray-500"
            />
            <Input
              inputMode="decimal"
              placeholder="Max %"
              value={value.maxRisk}
              onChange={(event) => updateValue('maxRisk', event.target.value)}
              disabled={loading}
              className="h-11 rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-gray-500"
            />
          </div>
        </section>

        <section className="rounded-[24px] border border-white/8 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Risk Level</p>
              <p className="text-xs text-gray-500">Segment the community feed by investor profile.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/8 bg-black/20 p-1 sm:grid-cols-4">
            {RISK_SEGMENTS.map((segment) => {
              const active = value.riskLevel === segment.value;

              return (
                <button
                  key={segment.value}
                  type="button"
                  onClick={() => updateValue('riskLevel', segment.value)}
                  disabled={loading}
                  className={[
                    'rounded-xl px-3 py-2 text-sm transition-all duration-300',
                    active
                      ? 'bg-gradient-to-r from-[#5862ff] to-[#7db8ff] text-white shadow-[0_0_20px_rgba(88,98,255,0.35)]'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white',
                  ].join(' ')}
                >
                  {segment.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 rounded-[24px] border border-white/8 bg-white/5 p-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-white">Model Type</label>
            <Select value={value.modelName} onValueChange={(next) => updateValue('modelName', next as CommunityPortfolioFilterDraft['modelName'])}>
              <SelectTrigger className="h-11 w-full rounded-2xl border-white/10 bg-black/20 text-white">
                <SelectValue placeholder="All models" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#0f1321] text-white">
                <SelectItem value="all">All models</SelectItem>
                <SelectItem value="mvo">MVO</SelectItem>
                <SelectItem value="semi">Semi-Variance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white">Diversification</label>
            <button
              type="button"
              onClick={() => updateValue('isDiversified', value.isDiversified === 'yes' ? 'no' : value.isDiversified === 'no' ? 'all' : 'yes')}
              disabled={loading}
              className="flex h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-gray-300 transition-all duration-300 hover:border-[#0fedbe]/35 hover:text-white"
            >
              <span>{value.isDiversified === 'all' ? 'All portfolios' : value.isDiversified === 'yes' ? 'Diversified only' : 'Concentrated only'}</span>
              <span
                className={[
                  'relative inline-flex h-6 w-11 items-center rounded-full border transition-all duration-300',
                  diversificationEnabled
                    ? 'border-[#0fedbe]/50 bg-[#0fedbe]/20 shadow-[0_0_24px_rgba(15,237,190,0.2)]'
                    : 'border-white/10 bg-white/8',
                ].join(' ')}
              >
                <span
                  className={[
                    'h-4.5 w-4.5 absolute left-1 rounded-full bg-white transition-transform duration-300',
                    diversificationEnabled ? 'translate-x-5 bg-[#0fedbe]' : 'translate-x-0',
                  ].join(' ')}
                />
              </span>
            </button>
          </div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          type="button"
          onClick={onApply}
          disabled={loading}
          className="h-11 rounded-2xl bg-gradient-to-r from-[#5862ff] via-[#7db8ff] to-[#0fedbe] text-[#030712] shadow-[0_0_30px_rgba(88,98,255,0.3)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_38px_rgba(88,98,255,0.42)]"
        >
          Apply Filters
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          disabled={loading}
          className="h-11 rounded-2xl border-white/10 bg-white/5 text-gray-200 transition-all duration-300 hover:bg-white/8"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>
    </aside>
  );
}