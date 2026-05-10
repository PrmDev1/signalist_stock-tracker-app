import type { RiskBounds } from '@/components/portfolio/optimizer/types';
import type { PortfolioConfigurationState } from '@/components/portfolio/optimizer/preset-config.types';

export interface PortfolioOptimizerParams {
  investmentAmount: number;
  monthlyDca: number;
  targetYears: number;
  targetRisk: number;
  riskBounds: RiskBounds;
  investmentHorizon: 'short' | 'medium' | 'long';
  modelName: 'mvo' | 'semi';
  brokerMinOrder: number;
  requireDiversification: boolean;
  presetConfig: PortfolioConfigurationState;
}

const STORAGE_KEY = 'portfolioOptimizerParams';

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function setOptimizerParamsInSession(params: PortfolioOptimizerParams): void {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(params));
}

export function getOptimizerParamsFromSession(): PortfolioOptimizerParams | null {
  if (!canUseSessionStorage()) return null;

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PortfolioOptimizerParams>;

    if (
      !Number.isFinite(parsed.investmentAmount) ||
      !Number.isFinite(parsed.monthlyDca) ||
      !Number.isFinite(parsed.targetYears) ||
      !Number.isFinite(parsed.targetRisk) ||
      !parsed.riskBounds ||
      !Number.isFinite(parsed.riskBounds.minRisk) ||
      !Number.isFinite(parsed.riskBounds.maxRisk) ||
      !parsed.investmentHorizon ||
      !parsed.modelName ||
      !Number.isFinite(parsed.brokerMinOrder) ||
      typeof parsed.requireDiversification !== 'boolean' ||
      !parsed.presetConfig ||
      typeof parsed.presetConfig !== 'object'
    ) {
      return null;
    }

    return {
      investmentAmount: Number(parsed.investmentAmount),
      monthlyDca: Number(parsed.monthlyDca),
      targetYears: Number(parsed.targetYears),
      targetRisk: Number(parsed.targetRisk),
      riskBounds: {
        minRisk: Number(parsed.riskBounds.minRisk),
        maxRisk: Number(parsed.riskBounds.maxRisk),
        minReturn: Number.isFinite(parsed.riskBounds.minReturn) ? Number(parsed.riskBounds.minReturn) : undefined,
        maxReturn: Number.isFinite(parsed.riskBounds.maxReturn) ? Number(parsed.riskBounds.maxReturn) : undefined,
        warningMsg: typeof parsed.riskBounds.warningMsg === 'string' ? parsed.riskBounds.warningMsg : undefined,
      },
      investmentHorizon: parsed.investmentHorizon,
      modelName: parsed.modelName,
      brokerMinOrder: Number(parsed.brokerMinOrder),
      requireDiversification: parsed.requireDiversification,
      presetConfig: parsed.presetConfig as PortfolioConfigurationState,
    };
  } catch {
    return null;
  }
}
