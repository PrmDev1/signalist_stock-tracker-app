'use client';

import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import AllocationSlider from './AllocationSlider';
import type { PortfolioConfigurationState } from './preset-config.types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CustomConfigProps {
  value: PortfolioConfigurationState;
  onChange: (next: PortfolioConfigurationState) => void;
}

interface CustomFormValues {
  customMethod: 'auto' | 'ema' | 'mhr';
  lookbackYears: number;
  span: 180 | 250 | 500;
  enableTargetAllocations: boolean;
  targetAllocations: {
    growth: number;
    dividend: number;
    balanced: number;
  };
}

function toPercent(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(Number(value))));
}

export default function CustomConfig({ value, onChange }: CustomConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { control, register, setValue } = useForm<CustomFormValues>({
    mode: 'onChange',
    defaultValues: {
      customMethod: value.customMethod,
      lookbackYears: Number.isFinite(value.lookbackYears) ? value.lookbackYears : 5,
      span: value.span === 180 || value.span === 250 || value.span === 500 ? value.span : 250,
      enableTargetAllocations: Object.keys(value.targetAllocations ?? {}).length > 0,
      targetAllocations: {
        growth: toPercent(value.targetAllocations?.growth ? value.targetAllocations.growth * 100 : undefined, 34),
        dividend: toPercent(value.targetAllocations?.dividend ? value.targetAllocations.dividend * 100 : undefined, 33),
        balanced: toPercent(value.targetAllocations?.balanced ? value.targetAllocations.balanced * 100 : undefined, 33),
      },    },
  });

  const customMethod = useWatch({ control, name: 'customMethod' });
  const lookbackYears = useWatch({ control, name: 'lookbackYears' });
  const span = useWatch({ control, name: 'span' });
  const enableTargetAllocations = useWatch({ control, name: 'enableTargetAllocations' });
  const growth = useWatch({ control, name: 'targetAllocations.growth' });
  const dividend = useWatch({ control, name: 'targetAllocations.dividend' });
  const balanced = useWatch({ control, name: 'targetAllocations.balanced' });

  const total = (growth ?? 0) + (dividend ?? 0) + (balanced ?? 0);

  const allocationPayload = useMemo<Record<string, number>>(() => {
    if (!enableTargetAllocations) return {} as Record<string, number>;

    return {
      growth: Number(((growth ?? 0) / 100).toFixed(4)),
      dividend: Number(((dividend ?? 0) / 100).toFixed(4)),
      balanced: Number(((balanced ?? 0) / 100).toFixed(4)),
    };
  }, [balanced, dividend, enableTargetAllocations, growth]);

  const lastSentRef = useRef<string>('');

  useEffect(() => {
    const next: PortfolioConfigurationState = {
      preset: 'custom',
      customMethod: customMethod ?? 'auto',
      lookbackYears: Math.max(3, Math.min(20, Math.round(Number(lookbackYears) || 5))),
      span: span === 180 || span === 250 || span === 500 ? span : 250,
      targetAllocations: allocationPayload,
      assetFilterTag: 'all',
    };

    const serialized = JSON.stringify(next);
    if (serialized === lastSentRef.current) return;

    lastSentRef.current = serialized;
    onChange(next);
  }, [allocationPayload, customMethod, lookbackYears, onChange, span]);

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/35 via-gray-900 to-gray-900 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/40 bg-violet-500/10">
            <SlidersHorizontal className="h-5 w-5 text-violet-300" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white sm:text-lg">Custom Mode</h3>
            <p className="text-xs text-violet-200/80">สายอิสระ ปรับพารามิเตอร์ได้เต็มที่</p>
          </div>
        </div>
        <span className="rounded-md border border-violet-300/40 bg-violet-400/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-200">
          pro
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Method</label>
          <label id="method-label" className="mb-1 block text-sm font-medium text-gray-300">Method</label>
          <Select value={customMethod} onValueChange={(next) => setValue('customMethod', next as 'auto' | 'ema' | 'mhr', { shouldValidate: true })} aria-labelledby="method-label">
            <SelectTrigger className="w-full rounded-lg border-gray-600 bg-gray-800 text-white">
              <SelectValue placeholder="เลือกวิธีคำนวณ" />
            </SelectTrigger>
            <SelectContent className="border-gray-600 bg-gray-800 text-gray-100">
              <SelectItem value="auto">auto</SelectItem>
              <SelectItem value="ema">ema</SelectItem>
              <SelectItem value="mhr">mhr</SelectItem>
            </SelectContent>
          </Select>
        <div>
          <label htmlFor="custom-lookback-years" className="mb-1 block text-sm font-medium text-gray-300">
            Lookback Years
          </label>
          <input
            id="custom-lookback-years"
            type="number"
            min={3}
            max={20}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
            {...register('lookbackYears', { valueAsNumber: true, min: 3, max: 20 })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Span</label>
          <Select value={String(span)} onValueChange={(next) => setValue('span', Number(next) as 180 | 250 | 500, { shouldValidate: true })}>
            <SelectTrigger className="w-full rounded-lg border-gray-600 bg-gray-800 text-white">
              <SelectValue placeholder="เลือก span" />
            </SelectTrigger>
            <SelectContent className="border-gray-600 bg-gray-800 text-gray-100">
              <SelectItem value="180">180</SelectItem>
              <SelectItem value="250">250</SelectItem>
              <SelectItem value="500">500</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-3">
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <p className="text-sm font-semibold text-gray-100">Advanced Parameters</p>
            <p className="text-xs text-gray-400">แสดง/ซ่อนการตั้งค่า allocation เสริม</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-300 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced ? (
          <div className="mt-3 space-y-3 border-t border-gray-700 pt-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                {...register('enableTargetAllocations')}
                className="h-4 w-4"
              />
              เปิดใช้งาน target allocations แบบกำหนดเอง
            </label>

            {enableTargetAllocations ? (
              <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-800/70 p-3">
                <p className="text-xs text-gray-400">รวมสัดส่วนตอนนี้ {total}%</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <AllocationSlider
                    label="Growth"
                    value={growth ?? 0}
                    onChange={(next) => setValue('targetAllocations.growth', next, { shouldValidate: true })}
                    colorClassName="bg-cyan-500/10 text-cyan-200"
                  />
                  <AllocationSlider
                    label="Dividend"
                    value={dividend ?? 0}
                    onChange={(next) => setValue('targetAllocations.dividend', next, { shouldValidate: true })}
                    colorClassName="bg-emerald-500/10 text-emerald-200"
                  />
                  <AllocationSlider
                    label="Balanced"
                    value={balanced ?? 0}
                    onChange={(next) => setValue('targetAllocations.balanced', next, { shouldValidate: true })}
                    colorClassName="bg-indigo-500/10 text-indigo-200"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">เมื่อปิดไว้ ระบบจะส่ง targetAllocations เป็น {}</p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
