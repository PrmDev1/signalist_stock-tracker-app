'use client';

import { AlertTriangle, Info } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import AllocationSlider from './AllocationSlider';
import PresetSelector from './PresetSelector';
import type {
  PortfolioConfigurationState,
  PortfolioConfiguratorFormValues,
  PortfolioPreset,
} from './preset-config.types';
import {
  getDefaultPresetFormValues,
  toConfigurationState,
} from './preset-config.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PortfolioConfiguratorProps {
  initialPreset?: PortfolioPreset;
  initialConfig?: PortfolioConfigurationState;
  onConfigChange: (config: PortfolioConfigurationState) => void;
}

const HARD_CODED_METHOD_BY_PRESET: Record<Exclude<PortfolioPreset, 'custom'>, 'auto' | 'ema' | 'mhr'> = {
  growth: 'ema',
  dividend: 'mhr',
  balanced: 'auto',
};

function getPresetHelper(preset: PortfolioPreset): string {
  if (preset === 'dividend') return 'Recommended 10-15 years for dividend consistency.';
  if (preset === 'balanced') return 'Recommended 5-10 years.';
  return '';
}

export default function PortfolioConfigurator({
  initialPreset = 'custom',
  initialConfig,
  onConfigChange,
}: PortfolioConfiguratorProps) {
  const defaultValues = useMemo<PortfolioConfiguratorFormValues>(() => {
    if (!initialConfig) return getDefaultPresetFormValues(initialPreset);

    const base = getDefaultPresetFormValues(initialConfig.preset);
    return {
      ...base,
      preset: initialConfig.preset,
      customMethod: initialConfig.customMethod,
      lookbackYears: initialConfig.lookbackYears,
      span: initialConfig.span,
      enableTargetAllocations: Object.keys(initialConfig.targetAllocations || {}).length > 0,
      targetAllocations: {
        growth: Math.round((initialConfig.targetAllocations?.growth ?? 0) * 100),
        dividend: Math.round((initialConfig.targetAllocations?.dividend ?? 0) * 100),
        balanced: Math.round((initialConfig.targetAllocations?.balanced ?? 0) * 100),
      },    };
  }, [initialConfig, initialPreset]);

  const {
    register,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<PortfolioConfiguratorFormValues>({
    mode: 'onChange',
    defaultValues,
  });

  const lastSentConfigRef = useRef<string>('');

  const preset = useWatch({ control, name: 'preset' });
  const lookbackYears = useWatch({ control, name: 'lookbackYears' });
  const span = useWatch({ control, name: 'span' });
  const enableTargetAllocations = useWatch({ control, name: 'enableTargetAllocations' });
  const growthAllocation = useWatch({ control, name: 'targetAllocations.growth' });
  const dividendAllocation = useWatch({ control, name: 'targetAllocations.dividend' });
  const balancedAllocation = useWatch({ control, name: 'targetAllocations.balanced' });

  useEffect(() => {
    if (!preset) return;

    if (preset !== 'custom') {
      setValue('customMethod', HARD_CODED_METHOD_BY_PRESET[preset], { shouldValidate: true });
    }

    if (preset === 'dividend') {
      const currentLookback = getValues('lookbackYears');
      if (!Number.isFinite(currentLookback) || currentLookback < 5) {
        setValue('lookbackYears', 5, { shouldValidate: true });
      }
      setValue('enableTargetAllocations', false, { shouldValidate: true });
    }

    if (preset === 'growth') {
      setValue('enableTargetAllocations', false, { shouldValidate: true });
    }

    if (preset === 'balanced') {
      const currentSpan = getValues('span');
      if (currentSpan !== 250 && currentSpan !== 500) {
        setValue('span', 250, { shouldValidate: true });
      }
      setValue('enableTargetAllocations', true, { shouldValidate: true });

      const currentAllocations = getValues('targetAllocations');
      const sum = (currentAllocations?.growth ?? 0) + (currentAllocations?.dividend ?? 0) + (currentAllocations?.balanced ?? 0);
      if (sum === 0) {
        setValue('targetAllocations.growth', 40, { shouldValidate: true });
        setValue('targetAllocations.dividend', 30, { shouldValidate: true });
        setValue('targetAllocations.balanced', 30, { shouldValidate: true });
      }
    }
  }, [getValues, preset, setValue]);

  useEffect(() => {
    const values = getValues();
    const nextConfig = toConfigurationState(values);
    const serialized = JSON.stringify(nextConfig);

    if (serialized === lastSentConfigRef.current) {
      return;
    }

    lastSentConfigRef.current = serialized;
    onConfigChange(nextConfig);
  }, [
    balancedAllocation,
    dividendAllocation,
    enableTargetAllocations,
    getValues,
    growthAllocation,
    lookbackYears,
    onConfigChange,
    preset,
    span,
  ]);

  const allocationSum = (growthAllocation ?? 0) + (dividendAllocation ?? 0) + (balancedAllocation ?? 0);
  const shouldShowAllocation = preset === 'balanced' || (preset === 'custom' && Boolean(enableTargetAllocations));

  const allocationTone = allocationSum === 100 ? 'text-emerald-300' : allocationSum > 100 ? 'text-rose-300' : 'text-amber-300';
  const allocationStatus = allocationSum === 100 ? 'Exactly 100%' : allocationSum > 100 ? 'Over-allocated' : 'Under-allocated';

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-[#27515f] bg-[linear-gradient(155deg,rgba(8,22,32,0.96),rgba(9,18,29,0.94))] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white sm:text-lg">Preset Configuration</h3>
          <p className="mt-1 text-xs text-gray-400 sm:text-sm">
            Configure the backend strategy payload for /api/v1/portfolio/optimize-async.
          </p>
        </div>
        <span className="rounded-md border border-cyan-300/30 bg-cyan-400/10 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-200">
          dynamic
        </span>
      </div>

      <PresetSelector value={preset} onChange={(nextPreset) => setValue('preset', nextPreset, { shouldValidate: true })} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Custom Method</label>
          {preset === 'custom' ? (
          {preset === 'custom' ? (
            <Select value={customMethod} onValueChange={(value) => setValue('customMethod', value as 'auto' | 'ema' | 'mhr', { shouldValidate: true })}>
              <SelectTrigger className="w-full rounded-lg border-gray-600 bg-gray-800 text-white">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent className="border-gray-600 bg-gray-800 text-gray-100">
                <SelectItem value="auto">auto</SelectItem>
                <SelectItem value="ema">ema</SelectItem>
                <SelectItem value="mhr">mhr</SelectItem>
              </SelectContent>
            </Select>            <input
              value={HARD_CODED_METHOD_BY_PRESET[preset]}
              disabled
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300"
            />
          )}
        </div>

        <div>
          <label htmlFor="lookbackYears" className="mb-1 block text-sm font-medium text-gray-300">
            Lookback Years
          </label>
          <input
            id="lookbackYears"
            type="number"
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none"
            {...register('lookbackYears', {
              valueAsNumber: true,
              required: 'Lookback years is required',
              validate: (value) => {
                if (!Number.isFinite(value)) return 'Lookback years must be a number';
                if (preset === 'dividend' && value < 5) return 'Dividend preset requires at least 5 years';
                if (preset === 'custom' && (value < 3 || value > 20)) return 'Custom preset accepts 3-20 years';
                if (value < 1 || value > 20) return 'Lookback years must be between 1 and 20';
                return true;
              },
            })}
          />
          {getPresetHelper(preset) ? <p className="mt-1 text-xs text-cyan-200/80">{getPresetHelper(preset)}</p> : null}
          {preset === 'growth' && Number(lookbackYears) > 10 ? (
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-yellow-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              Growth stocks change rapidly. Data older than 10 years may be inaccurate.
            </p>
          ) : null}
          {errors.lookbackYears ? <p className="mt-1 text-xs text-rose-300">{errors.lookbackYears.message}</p> : null}
        </div>
      </div>

      {preset !== 'dividend' ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Span</label>
          {(preset === 'growth' || preset === 'balanced') ? (
            <div className="grid grid-cols-3 gap-2 sm:max-w-sm">
              {(preset === 'balanced' ? [250, 500] : [180, 250, 500]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setValue('span', option, { shouldValidate: true })}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    Number(span) === option
                      ? 'border-cyan-400 bg-cyan-400/10 text-cyan-200'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="number"
              min={180}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none"
              {...register('span', {
                valueAsNumber: true,
                required: 'Span is required',
                min: { value: 180, message: 'Span cannot be lower than 180' },
              })}
            />
          )}
          {errors.span ? <p className="mt-1 text-xs text-rose-300">{errors.span.message}</p> : null}
        </div>
      ) : null}

      {preset === 'custom' ? (
        <label className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-300">
          <input
            type="checkbox"
            {...register('enableTargetAllocations')}
            className="h-4 w-4"
          />
          Enable optional target allocations
        </label>
      ) : null}

      {shouldShowAllocation ? (
        <div className="space-y-3 rounded-xl border border-gray-700 bg-gray-900/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-100">Target Allocations</p>
              <p className="mt-1 text-xs text-gray-400">
                Recommended total is up to 100% (example: {'{"growth": 0.40, "dividend": 0.30, "balanced": 0.30}'}).
              </p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${allocationTone}`}>Total {allocationSum}%</p>
              <p className={`text-xs ${allocationTone}`}>{allocationStatus}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <AllocationSlider
              label="Growth"
              value={growthAllocation ?? 0}
              onChange={(value) => setValue('targetAllocations.growth', value, { shouldValidate: true })}
              colorClassName="bg-cyan-500/10 text-cyan-200"
            />
            <AllocationSlider
              label="Dividend"
              value={dividendAllocation ?? 0}
              onChange={(value) => setValue('targetAllocations.dividend', value, { shouldValidate: true })}
              colorClassName="bg-emerald-500/10 text-emerald-200"
            />
            <AllocationSlider
              label="Balanced"
              value={balancedAllocation ?? 0}
              onChange={(value) => setValue('targetAllocations.balanced', value, { shouldValidate: true })}
              colorClassName="bg-indigo-500/10 text-indigo-200"
            />
          </div>
        </div>
      ) : null}

      <div className="flex items-start gap-2 rounded-lg border border-gray-700 bg-gray-900/80 px-3 py-2 text-xs text-gray-300">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-300" />
        <p>
          Asset filter for Select Assets: {preset === 'growth' ? 'show only growth-tag stocks' : preset === 'dividend' ? 'show only dividend-tag stocks' : 'show all stock tags'}.
        </p>
      </div>
    </section>
  );
}
