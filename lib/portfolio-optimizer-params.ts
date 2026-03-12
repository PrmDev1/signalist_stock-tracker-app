export interface PortfolioOptimizerParams {
  investmentAmount: number;
  monthlyDca: number;
  targetYears: number;
  riskTolerance: 'low' | 'medium' | 'high';
  investmentHorizon: 'short' | 'medium' | 'long';
  modelName: 'mvo' | 'semi';
  brokerMinOrder: number;
  requireDiversification: boolean;
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
      !parsed.riskTolerance ||
      !parsed.investmentHorizon ||
      !parsed.modelName ||
      !Number.isFinite(parsed.brokerMinOrder) ||
      typeof parsed.requireDiversification !== 'boolean'
    ) {
      return null;
    }

    return {
      investmentAmount: Number(parsed.investmentAmount),
      monthlyDca: Number(parsed.monthlyDca),
      targetYears: Number(parsed.targetYears),
      riskTolerance: parsed.riskTolerance,
      investmentHorizon: parsed.investmentHorizon,
      modelName: parsed.modelName,
      brokerMinOrder: Number(parsed.brokerMinOrder),
      requireDiversification: parsed.requireDiversification,
    };
  } catch {
    return null;
  }
}
