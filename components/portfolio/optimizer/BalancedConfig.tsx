'use client';

import { Blend } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import AllocationSlider from './AllocationSlider';
import type { PortfolioConfigurationState } from './preset-config.types';

interface BalancedConfigProps {
  value: PortfolioConfigurationState;
  onChange: (next: PortfolioConfigurationState) => void;
  availableTagAllocations: {
    growth: boolean;
    dividend: boolean;
    balanced: boolean;
    core: boolean;
  };
}

interface BalancedFormValues {
  lookbackYears: number;
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

export default function BalancedConfig({ value, onChange, availableTagAllocations }: BalancedConfigProps) {
  const { control, register, setValue } = useForm<BalancedFormValues>({
    mode: 'onChange',
    defaultValues: {
      lookbackYears: Number.isFinite(value.lookbackYears) ? value.lookbackYears : 7,
      targetAllocations: {
        growth: toPercent(value.targetAllocations.growth != null ? value.targetAllocations.growth * 100 : undefined, 40),
        dividend: toPercent(value.targetAllocations.dividend != null ? value.targetAllocations.dividend * 100 : undefined, 30),
        balanced: toPercent(value.targetAllocations.balanced != null ? value.targetAllocations.balanced * 100 : undefined, 20),
        core: toPercent(value.targetAllocations.Core != null ? value.targetAllocations.Core * 100 : undefined, 10),
      },
    },
  });

  const lookbackYears = useWatch({ control, name: 'lookbackYears' });
  const growth = useWatch({ control, name: 'targetAllocations.growth' });
  const dividend = useWatch({ control, name: 'targetAllocations.dividend' });
  const balanced = useWatch({ control, name: 'targetAllocations.balanced' });
  const core = useWatch({ control, name: 'targetAllocations.core' });

  const effectiveGrowth = availableTagAllocations.growth ? (growth ?? 0) : 0;
  const effectiveDividend = availableTagAllocations.dividend ? (dividend ?? 0) : 0;
  const effectiveBalanced = availableTagAllocations.balanced ? (balanced ?? 0) : 0;
  const effectiveCore = availableTagAllocations.core ? (core ?? 0) : 0;
  const total = effectiveGrowth + effectiveDividend + effectiveBalanced + effectiveCore;
  const tone = total === 100 ? 'text-emerald-300' : total > 100 ? 'text-rose-300' : 'text-amber-300';

  const payloadAllocations = useMemo(
    () => ({
      growth: Number(((effectiveGrowth ?? 0) / 100).toFixed(4)),
      dividend: Number(((effectiveDividend ?? 0) / 100).toFixed(4)),
      balanced: Number(((effectiveBalanced ?? 0) / 100).toFixed(4)),
      Core: Number(((effectiveCore ?? 0) / 100).toFixed(4)),
    }),
    [effectiveBalanced, effectiveCore, effectiveDividend, effectiveGrowth]
  );

  const lastSentRef = useRef<string>('');

  useEffect(() => {
    const clampWithAvailable = (rawValue: number, currentTotal: number, isAvailable: boolean): number => {
      if (!isAvailable) return 0;
      const safeRaw = Math.max(0, Math.min(100, Math.round(Number(rawValue) || 0)));
      return Math.min(safeRaw, Math.max(0, 100 - currentTotal));
    };

    const currentGrowth = growth ?? 0;
    const currentDividend = dividend ?? 0;
    const currentBalanced = balanced ?? 0;
    const currentCore = core ?? 0;

    const nextGrowth = clampWithAvailable(currentGrowth, 0, availableTagAllocations.growth);
    const nextDividend = clampWithAvailable(currentDividend, nextGrowth, availableTagAllocations.dividend);
    const nextBalanced = clampWithAvailable(currentBalanced, nextGrowth + nextDividend, availableTagAllocations.balanced);
    const nextCore = clampWithAvailable(currentCore, nextGrowth + nextDividend + nextBalanced, availableTagAllocations.core);

    if (nextGrowth !== currentGrowth) {
      setValue('targetAllocations.growth', nextGrowth, { shouldValidate: true });
    }
    if (nextDividend !== currentDividend) {
      setValue('targetAllocations.dividend', nextDividend, { shouldValidate: true });
    }
    if (nextBalanced !== currentBalanced) {
      setValue('targetAllocations.balanced', nextBalanced, { shouldValidate: true });
    }
    if (nextCore !== currentCore) {
      setValue('targetAllocations.core', nextCore, { shouldValidate: true });
    }
  }, [availableTagAllocations.balanced, availableTagAllocations.core, availableTagAllocations.dividend, availableTagAllocations.growth, balanced, core, dividend, growth, setValue]);

  useEffect(() => {
    const next: PortfolioConfigurationState = {
      preset: 'balanced',
      customMethod: 'auto',
      lookbackYears: Math.max(3, Math.min(15, Math.round(Number(lookbackYears) || 7))),
      span: 250,
      targetAllocations: payloadAllocations,
      assetFilterTag: 'all',
    };

    const serialized = JSON.stringify(next);
    if (serialized === lastSentRef.current) return;

    lastSentRef.current = serialized;
    onChange(next);
  }, [lookbackYears, onChange, payloadAllocations]);

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

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-gray-900 to-gray-900 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/10">
            <Blend className="h-5 w-5 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white sm:text-lg">Balanced Mode</h3>
            <p className="text-xs text-indigo-200/80">สายผสมผสาน เน้นกระจายความเสี่ยง</p>
          </div>
        </div>
        <span className="rounded-md border border-indigo-300/40 bg-indigo-400/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-200">
          auto locked
        </span>
      </div>

      <div>
        <label htmlFor="balanced-lookback-years" className="mb-1 block text-sm font-medium text-gray-300">
          Lookback Years
        </label>
        <input
          id="balanced-lookback-years"
          type="number"
          min={3}
          max={15}
          className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
          {...register('lookbackYears', { valueAsNumber: true, min: 3, max: 15 })}
        />
        <p className="mt-1 text-xs text-gray-400">แนะนำช่วง 5 - 10 ปี และระบบจะส่ง span ค่าเริ่มต้น 250 อัตโนมัติ</p>
      </div>

      <div className="space-y-3 rounded-xl border border-gray-700 bg-gray-900/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-100">Target Allocations</p>
            <p className="text-xs text-gray-400">ลองปรับสัดส่วน Growth / Dividend / Balanced / Core ให้รวมกันใกล้ 100%</p>
          </div>
          <div className={`text-sm font-semibold ${tone}`}>รวม {total}%</div>
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

        <p className="text-xs text-gray-400">ตัวอย่าง payload: {"{\"growth\": 0.40, \"dividend\": 0.30, \"balanced\": 0.20, \"Core\": 0.10}"}</p>
      </div>
    </section>
  );
}
