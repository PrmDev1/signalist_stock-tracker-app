export type PortfolioPreset = 'growth' | 'dividend' | 'balanced' | 'custom';

export type CustomMethod = 'auto' | 'ema' | 'mhr';

export interface PortfolioTargetAllocations {
  growth: number;
  dividend: number;
  balanced: number;
  core: number;
}

export interface PortfolioConfiguratorFormValues {
  preset: PortfolioPreset;
  customMethod: CustomMethod;
  lookbackYears: number;
  span: number;
  enableTargetAllocations: boolean;
  targetAllocations: PortfolioTargetAllocations;
}

export interface PortfolioConfigurationState {
  preset: PortfolioPreset;
  customMethod: CustomMethod;
  lookbackYears: number;
  span: number;
  targetAllocations: Record<string, number>;
  assetFilterTag: 'growth' | 'dividend' | 'all';
}

export interface OptimizePayload {
  userId: string;
  modelName: string;
  lookbackYears: number;
  riskLevel: string;
  tickers: Record<string, string>;
  requireDiversification: boolean;
  preset: PortfolioPreset;
  customMethod: CustomMethod;
  span: number;
  targetAllocations: Record<string, number>;
}

export function getDefaultPresetFormValues(preset: PortfolioPreset): PortfolioConfiguratorFormValues {
  switch (preset) {
    case 'growth':
      return {
        preset,
        customMethod: 'ema',
        lookbackYears: 7,
        span: 250,
        enableTargetAllocations: false,
        targetAllocations: { growth: 40, dividend: 30, balanced: 20, core: 10 },
      };
    case 'dividend':
      return {
        preset,
        customMethod: 'mhr',
        lookbackYears: 10,
        span: 250,
        enableTargetAllocations: false,
        targetAllocations: { growth: 30, dividend: 40, balanced: 20, core: 10 },
      };
    case 'balanced':
      return {
        preset,
        customMethod: 'auto',
        lookbackYears: 7,
        span: 250,
        enableTargetAllocations: true,
        targetAllocations: { growth: 40, dividend: 30, balanced: 20, core: 10 },
      };
    default:
      return {
        preset: 'custom',
        customMethod: 'auto',
        lookbackYears: 5,
        span: 250,
        enableTargetAllocations: false,
        targetAllocations: { growth: 40, dividend: 30, balanced: 20, core: 10 },
      };
  }
}

export function toConfigurationState(
  values: PortfolioConfiguratorFormValues
): PortfolioConfigurationState {
  const preset = values.preset;
  const customMethod: CustomMethod =
    preset === 'growth' ? 'ema' : preset === 'dividend' ? 'mhr' : preset === 'balanced' ? 'auto' : values.customMethod;

  const shouldIncludeAllocations = preset === 'balanced' || (preset === 'custom' && values.enableTargetAllocations);

  const allocationSum =
    values.targetAllocations.growth +
    values.targetAllocations.dividend +
    values.targetAllocations.balanced +
    values.targetAllocations.core;

  if (shouldIncludeAllocations && Math.abs(allocationSum - 100) > 0.01) {
    throw new Error(`Target allocations must sum to 100%, got ${allocationSum}%`);
  }

  const targetAllocations: Record<string, number> = shouldIncludeAllocations
    ? {
        growth: Number((values.targetAllocations.growth / 100).toFixed(4)),
        dividend: Number((values.targetAllocations.dividend / 100).toFixed(4)),
        balanced: Number((values.targetAllocations.balanced / 100).toFixed(4)),
        Core: Number((values.targetAllocations.core / 100).toFixed(4)),
      }
    : {};
  return {
    preset,
    customMethod,
    lookbackYears: Math.round(values.lookbackYears),
    span: Math.max(180, Math.round(values.span)),
    targetAllocations,
    assetFilterTag: preset === 'growth' ? 'growth' : preset === 'dividend' ? 'dividend' : 'all',
  };
}
