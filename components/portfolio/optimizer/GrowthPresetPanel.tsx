'use client';

import { AlertTriangle, Lock, TrendingUp, Cpu } from 'lucide-react';
import type { PortfolioConfigurationState } from './preset-config.types';

const SPAN_OPTIONS = [
  { value: 180, label: '180', desc: 'เร็ว' },
  { value: 250, label: '250', desc: 'มาตรฐาน' },
  { value: 500, label: '500', desc: 'ละเอียด' },
] as const;

interface GrowthPresetPanelProps {
  presetConfig: PortfolioConfigurationState;
  setPresetConfig: (config: PortfolioConfigurationState) => void;
}

export default function GrowthPresetPanel({ presetConfig, setPresetConfig }: GrowthPresetPanelProps) {
  const { lookbackYears, span } = presetConfig;
  const showLookbackWarning = Number(lookbackYears) > 10;

  const handleLookbackChange = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed)) {
      setPresetConfig({ ...presetConfig, lookbackYears: Math.max(1, Math.min(20, parsed)) });
    }
  };

  const handleSpanChange = (newSpan: number) => {
    setPresetConfig({ ...presetConfig, span: newSpan });
  };

  return (
    <section className="mt-5 space-y-5 rounded-2xl border border-emerald-500/25 bg-[linear-gradient(155deg,rgba(4,20,12,0.97),rgba(6,20,15,0.96))] p-4 sm:p-5">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white sm:text-[17px]">Growth Strategy Parameters</h3>
            <p className="text-[11px] text-emerald-400/70">High momentum · EMA-weighted returns</p>
          </div>
        </div>
        <span className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
          Growth
        </span>
      </div>

      <div className="border-t border-emerald-500/10" />

      {/* ── Parameter 1: Calculation Method (Locked) ─────── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">วิธีคำนวณผลตอบแทน</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
            <Lock className="h-3 w-3" />
            ล็อคแล้ว
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <div className="flex h-9 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-500/15 text-sm font-bold tracking-wider text-emerald-200">
            EMA
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-100">Exponential Moving Average</p>
            <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">
              ให้น้ำหนักกับข้อมูลล่าสุดมากกว่า เหมาะกับหุ้นเติบโตที่แนวโน้มเปลี่ยนเร็ว
            </p>
          </div>
        </div>
      </div>

      {/* ── Parameter 2: Historical Lookback ─────────────── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="growth-lookback" className="text-sm font-medium text-gray-300">
            ข้อมูลย้อนหลัง (ปี)
          </label>
          <span className="text-xs text-gray-500">แนะนำ 3–10 ปี</span>
        </div>
        <input
          id="growth-lookback"
          type="number"
          min={1}
          max={20}
          value={lookbackYears}
          onChange={(e) => handleLookbackChange(e.target.value)}
          className={`w-full rounded-xl border px-4 py-2.5 text-base text-white transition-colors placeholder:text-gray-500 focus:outline-none focus:ring-1 ${
            showLookbackWarning
              ? 'border-amber-400/60 bg-amber-500/5 focus:border-amber-400 focus:ring-amber-400/30'
              : 'border-gray-600/70 bg-gray-800/80 focus:border-emerald-500 focus:ring-emerald-500/30'
          }`}
        />
        {showLookbackWarning ? (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
            <p className="text-xs leading-relaxed text-amber-300">
              <span className="font-semibold">คำเตือน:</span>{' '}
              หุ้นเติบโตโมเดลเปลี่ยนไว การดูอดีตไกลเกินไปอาจไม่แม่นยำ
            </p>
          </div>
        ) : (
          <p className="mt-1.5 text-xs text-gray-500">
            ระบบจะดึงข้อมูลราคาย้อนหลัง{' '}
            <span className="font-semibold text-gray-300">{lookbackYears} ปี</span> มาคำนวณ
          </p>
        )}
      </div>

      {/* ── Parameter 3: Span ─────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">ช่วงคำนวณ Momentum (Span)</span>
          <span className="text-xs text-gray-500">เลือกได้ 1 ค่า</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {SPAN_OPTIONS.map((option) => {
            const active = Number(span) === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSpanChange(option.value)}
                aria-pressed={active}
                className={`flex flex-col items-center rounded-xl border px-3 py-3 transition-all ${
                  active
                    ? 'border-emerald-400/70 bg-emerald-500/15 shadow-[0_0_0_1px_rgba(52,211,153,0.18)]'
                    : 'border-gray-600/60 bg-gray-800/60 hover:border-gray-500 hover:bg-gray-700/60'
                }`}
              >
                <span className={`text-xl font-bold tabular-nums ${active ? 'text-emerald-300' : 'text-gray-200'}`}>
                  {option.label}
                </span>
                <span className={`mt-0.5 text-[11px] ${active ? 'text-emerald-400/80' : 'text-gray-500'}`}>
                  {option.desc}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Span ≥ 180 วัน · EMA จะคำนวณด้วยช่วงข้อมูล{' '}
          <span className="font-semibold text-gray-300">{span} วัน</span>
        </p>
      </div>

      {/* ── Info: AI Auto-Allocation ──────────────────────── */}
      <div className="flex items-start gap-3 rounded-xl border border-gray-700/60 bg-gray-900/60 px-4 py-3.5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-blue-400/30 bg-blue-500/10">
          <Cpu className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-100">AI จัดสัดส่วนอัตโนมัติ</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">
            โหมด Growth ปล่อยให้โมเดลคำนวณหา{' '}
            <code className="rounded bg-gray-700/80 px-1 text-[11px] text-emerald-300">weights</code>{' '}
            ที่ให้ผลตอบแทนสูงสุดโดยอัตโนมัติ ไม่ต้องกำหนดสัดส่วนเอง
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
            <code className="rounded bg-gray-800 px-1.5 py-0.5 text-gray-400">targetAllocations: {'{}'}</code>
            <span>→ backend จัด weights ให้เอง</span>
          </p>
        </div>
      </div>

    </section>
  );
}
