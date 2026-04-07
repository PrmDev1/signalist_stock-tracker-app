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
  availableTagAllocations: {
    growth: boolean;
    dividend: boolean;
    balanced: boolean;
    core: boolean;
  };
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
    core: number;
  };
}

function toPercent(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(Number(value))));
}

export default function CustomConfig({ value, onChange, availableTagAllocations }: CustomConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { control, register, setValue } = useForm<CustomFormValues>({
    mode: 'onChange',
    defaultValues: {
      customMethod: value.customMethod,
      lookbackYears: Math.max(3, Math.min(20, Number.isFinite(value.lookbackYears) ? value.lookbackYears : 5)),
      span: value.span === 180 || value.span === 250 || value.span === 500 ? value.span : 250,
      enableTargetAllocations: Object.keys(value.targetAllocations ?? {}).length > 0,
      targetAllocations: {
        growth: toPercent(value.targetAllocations.growth != null ? value.targetAllocations.growth * 100 : undefined, 40),
        dividend: toPercent(value.targetAllocations.dividend != null ? value.targetAllocations.dividend * 100 : undefined, 30),
        balanced: toPercent(value.targetAllocations.balanced != null ? value.targetAllocations.balanced * 100 : undefined, 20),
        core: toPercent(value.targetAllocations.Core != null ? value.targetAllocations.Core * 100 : undefined, 10),
      },
    },
  });

  const customMethod = useWatch({ control, name: 'customMethod' });
  const lookbackYears = useWatch({ control, name: 'lookbackYears' });
  const span = useWatch({ control, name: 'span' });
  const enableTargetAllocations = useWatch({ control, name: 'enableTargetAllocations' });
  const growth = useWatch({ control, name: 'targetAllocations.growth' });
  const dividend = useWatch({ control, name: 'targetAllocations.dividend' });
  const balanced = useWatch({ control, name: 'targetAllocations.balanced' });
  const core = useWatch({ control, name: 'targetAllocations.core' });

  useEffect(() => {
    const normalizedLookbackYears = Math.max(3, Math.min(20, Math.round(Number(lookbackYears) || 5)));

    if (normalizedLookbackYears !== lookbackYears) {
      setValue('lookbackYears', normalizedLookbackYears, { shouldValidate: true });
    }
  }, [lookbackYears, setValue]);

  // Zero out unavailable types whenever availableTagAllocations changes
  useEffect(() => {
    if (!availableTagAllocations.growth && (growth ?? 0) !== 0) {
      setValue('targetAllocations.growth', 0, { shouldValidate: true });
    }
    if (!availableTagAllocations.dividend && (dividend ?? 0) !== 0) {
      setValue('targetAllocations.dividend', 0, { shouldValidate: true });
    }
    if (!availableTagAllocations.balanced && (balanced ?? 0) !== 0) {
      setValue('targetAllocations.balanced', 0, { shouldValidate: true });
    }
    if (!availableTagAllocations.core && (core ?? 0) !== 0) {
      setValue('targetAllocations.core', 0, { shouldValidate: true });
    }
  }, [availableTagAllocations.balanced, availableTagAllocations.core, availableTagAllocations.dividend, availableTagAllocations.growth, balanced, core, dividend, growth, setValue]);

  const effectiveGrowth = availableTagAllocations.growth ? (growth ?? 0) : 0;
  const effectiveDividend = availableTagAllocations.dividend ? (dividend ?? 0) : 0;
  const effectiveBalanced = availableTagAllocations.balanced ? (balanced ?? 0) : 0;
  const effectiveCore = availableTagAllocations.core ? (core ?? 0) : 0;
  const total = effectiveGrowth + effectiveDividend + effectiveBalanced + effectiveCore;
  const tone = total === 100 ? 'text-emerald-300' : total > 100 ? 'text-rose-300' : 'text-amber-300';

  const handleAllocationChange = (type: 'growth' | 'dividend' | 'balanced' | 'core', nextValue: number) => {
    const rounded = Math.max(0, Math.min(100, Math.round(nextValue)));
    const g = type === 'growth' ? rounded : (growth ?? 0);
    const d = type === 'dividend' ? rounded : (dividend ?? 0);
    const b = type === 'balanced' ? rounded : (balanced ?? 0);
    const c = type === 'core' ? rounded : (core ?? 0);

    const effG = availableTagAllocations.growth ? g : 0;
    const effD = availableTagAllocations.dividend ? d : 0;
    const effB = availableTagAllocations.balanced ? b : 0;
    const effC = availableTagAllocations.core ? c : 0;

    if (effG + effD + effB + effC > 100) return;

    if (type === 'growth') setValue('targetAllocations.growth', rounded, { shouldValidate: true });
    if (type === 'dividend') setValue('targetAllocations.dividend', rounded, { shouldValidate: true });
    if (type === 'balanced') setValue('targetAllocations.balanced', rounded, { shouldValidate: true });
    if (type === 'core') setValue('targetAllocations.core', rounded, { shouldValidate: true });
  };

  const allocationPayload = useMemo<Record<string, number>>(() => {
    if (!enableTargetAllocations) return {} as Record<string, number>;

    return {
      growth: Number(((effectiveGrowth) / 100).toFixed(4)),
      dividend: Number(((effectiveDividend) / 100).toFixed(4)),
      balanced: Number(((effectiveBalanced) / 100).toFixed(4)),
      Core: Number(((effectiveCore) / 100).toFixed(4)),
    };
  }, [effectiveBalanced, effectiveCore, effectiveDividend, effectiveGrowth, enableTargetAllocations]);

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
    <section className="space-y-4 rounded-[24px] border border-[#4d73ff]/20 bg-[linear-gradient(180deg,rgba(30,37,64,0.8),rgba(16,20,31,0.98))] p-5 sm:p-6">
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
        <span className="rounded-full border border-violet-300/30 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200">
          pro
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Method</label>
          <Select value={customMethod} onValueChange={(next) => setValue('customMethod', next as 'auto' | 'ema' | 'mhr', { shouldValidate: true })}>
            <SelectTrigger className="w-full rounded-lg border-gray-600 bg-gray-800 text-white">
              <SelectValue placeholder="เลือกวิธีคำนวณ" />
            </SelectTrigger>
            <SelectContent className="border-gray-600 bg-gray-800 text-gray-100">
              <SelectItem value="auto">auto</SelectItem>
              <SelectItem value="ema">ema</SelectItem>
              <SelectItem value="mhr">mhr</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
          <p className="mt-1 text-xs text-gray-400">กำหนดได้ตั้งแต่ 3 ถึง 20 ปี และหากกรอกเกินช่วง ระบบจะปรับกลับอัตโนมัติ</p>
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

      <div className="rounded-[20px] border border-white/10 bg-[#1b1f29] p-4">
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
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">ปรับสัดส่วนได้เฉพาะประเภทที่มีในรายการหุ้น</p>
                  <p className={`text-sm font-semibold ${tone}`}>รวม {total}%</p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <AllocationSlider
                    label="Growth"
                    value={growth ?? 0}
                    onChange={(next) => handleAllocationChange('growth', next)}
                    colorClassName="bg-cyan-500/10 text-cyan-200"
                    disabled={!availableTagAllocations.growth}
                  />
                  <AllocationSlider
                    label="Dividend"
                    value={dividend ?? 0}
                    onChange={(next) => handleAllocationChange('dividend', next)}
                    colorClassName="bg-emerald-500/10 text-emerald-200"
                    disabled={!availableTagAllocations.dividend}
                  />
                  <AllocationSlider
                    label="Balanced"
                    value={balanced ?? 0}
                    onChange={(next) => handleAllocationChange('balanced', next)}
                    colorClassName="bg-indigo-500/10 text-indigo-200"
                    disabled={!availableTagAllocations.balanced}
                  />
                  <AllocationSlider
                    label="Core"
                    value={core ?? 0}
                    onChange={(next) => handleAllocationChange('core', next)}
                    colorClassName="bg-amber-500/10 text-amber-200"
                    disabled={!availableTagAllocations.core}
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
