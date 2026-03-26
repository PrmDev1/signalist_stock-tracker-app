'use client';

import { AlertTriangle, Lock, TrendingUp } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { PortfolioConfigurationState } from './preset-config.types';

interface GrowthConfigProps {
  value: PortfolioConfigurationState;
  onChange: (next: PortfolioConfigurationState) => void;
}

interface GrowthFormValues {
  lookbackYears: number;
  span: 180 | 250 | 500;
}

const SPAN_OPTIONS: Array<{ value: 180 | 250 | 500; label: string; hint: string }> = [
  { value: 180, label: '180', hint: 'เร็ว' },
  { value: 250, label: '250', hint: 'มาตรฐาน' },
  { value: 500, label: '500', hint: 'ละเอียด' },
];

export default function GrowthConfig({ value, onChange }: GrowthConfigProps) {
  const { control, register, setValue } = useForm<GrowthFormValues>({
    mode: 'onChange',
    defaultValues: {
      lookbackYears: Number.isFinite(value.lookbackYears) ? value.lookbackYears : 7,
      span: value.span === 180 || value.span === 250 || value.span === 500 ? value.span : 250,
    },
  });

  const lastSentRef = useRef<string>('');
  const lookbackYears = useWatch({ control, name: 'lookbackYears' });
  const span = useWatch({ control, name: 'span' });

  useEffect(() => {
    const next: PortfolioConfigurationState = {
      preset: 'growth',
      customMethod: 'ema',
      lookbackYears: Math.max(3, Math.min(10, Math.round(Number(lookbackYears) || 7))),
      span: span === 180 || span === 250 || span === 500 ? span : 250,
      targetAllocations: {},
      assetFilterTag: 'growth',
    };

    const serialized = JSON.stringify(next);
    if (serialized === lastSentRef.current) return;

    lastSentRef.current = serialized;
    onChange(next);
  }, [lookbackYears, onChange, span]);

  const showWarning = Number(lookbackYears) > 10;

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/50 via-gray-900 to-gray-900 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10">
            <TrendingUp className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white sm:text-lg">Growth Mode</h3>
            <p className="text-xs text-emerald-200/80">สายซิ่ง เน้นเติบโต</p>
          </div>
        </div>
        <span className="rounded-md border border-emerald-300/40 bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
          ema locked
        </span>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-3">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-200">วิธีคำนวณ</p>
          <span className="inline-flex items-center gap-1 text-xs text-amber-300">
            <Lock className="h-3 w-3" />
            ล็อคอัตโนมัติ
          </span>
        </div>
        <p className="text-sm text-emerald-200">EMA (Exponential Moving Average)</p>
      </div>

      <div>
        <label htmlFor="growth-lookback-years" className="mb-1 block text-sm font-medium text-gray-300">
          Lookback Years
        </label>
        <input
          id="growth-lookback-years"
          type="number"
          min={3}
          max={10}
          className={`w-full rounded-lg border px-3 py-2 text-white focus:outline-none focus:ring-1 ${
            showWarning
              ? 'border-amber-400/60 bg-amber-500/10 focus:border-amber-400 focus:ring-amber-400/40'
              : 'border-gray-600 bg-gray-800 focus:border-emerald-500 focus:ring-emerald-500/40'
          }`}
          {...register('lookbackYears', { valueAsNumber: true, min: 3, max: 10 })}
        />
        <p className="mt-1 text-xs text-gray-400">แนะนำช่วง 3 - 10 ปี</p>
        {showWarning ? (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p className="text-xs">Growth stocks change rapidly. Data older than 10 years may be inaccurate.</p>
          </div>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-300">Span</p>
        <div className="grid grid-cols-3 gap-2">
          {SPAN_OPTIONS.map((option) => {
            const active = span === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setValue('span', option.value, { shouldValidate: true })}
                className={`rounded-xl border px-3 py-3 text-center transition-colors ${
                  active
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                    : 'border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <p className="text-lg font-semibold">{option.label}</p>
                <p className="text-xs">{option.hint}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-3">
        <p className="text-sm font-semibold text-blue-100">AI Auto Allocation</p>
        <p className="mt-1 text-xs text-blue-100/80">
          ระบบจะส่ง targetAllocations เป็น {} เพื่อให้ backend หาน้ำหนักที่เหมาะกับการเติบโตสูงสุดอัตโนมัติ
        </p>
      </div>
    </section>
  );
}
