export type CommunityRiskLevel = 'low' | 'medium' | 'high';
export type CommunityModelName = 'mvo' | 'semi';

export interface CommunityAllocationDetail {
  weight?: number;
  allocatedAmount?: number;
}

export type CommunityAllocationValue = number | CommunityAllocationDetail;

export interface CommunityPortfolioData {
  mvoId: string;
  allocations: Record<string, CommunityAllocationValue>;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  modelName: string;
  riskLv: string;
  lookbackYears: number;
  isDiversified: boolean;
  createAt: string;
}

export interface CommunityPortfolioResponse {
  status: string;
  count: number;
  total?: number;
  data: CommunityPortfolioData[];
}

export interface CommunityPortfolioQuery {
  page: number;
  size: number;
  riskLevel?: CommunityRiskLevel;
  modelName?: CommunityModelName;
  minReturn?: number;
  maxReturn?: number;
  minRisk?: number;
  maxRisk?: number;
  isDiversified?: boolean;
}

export interface CommunityPortfolioFilterDraft {
  minReturn: string;
  maxReturn: string;
  minRisk: string;
  maxRisk: string;
  riskLevel: 'all' | CommunityRiskLevel;
  modelName: 'all' | CommunityModelName;
  isDiversified: 'all' | 'yes' | 'no';
}

export interface CommunityAllocationEntry {
  ticker: string;
  weight: number;
  allocatedAmount?: number;
}

export function normalizeCommunityAllocationWeight(value: CommunityAllocationValue): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    return value > 1 ? value / 100 : value;
  }

  const nextWeight = Number(value?.weight);
  if (!Number.isFinite(nextWeight)) return 0;
  return nextWeight > 1 ? nextWeight / 100 : nextWeight;
}

export function normalizeCommunityAllocations(
  allocations: Record<string, CommunityAllocationValue> | null | undefined
): CommunityAllocationEntry[] {
  if (!allocations || typeof allocations !== 'object') return [];

  return Object.entries(allocations)
    .map(([ticker, value]) => {
      const weight = normalizeCommunityAllocationWeight(value);
      const allocatedAmount =
        typeof value === 'object' && value !== null && Number.isFinite(Number(value.allocatedAmount))
          ? Number(value.allocatedAmount)
          : undefined;

      return {
        ticker,
        weight,
        allocatedAmount,
      } satisfies CommunityAllocationEntry;
    })
    .filter((entry) => entry.ticker && entry.weight > 0)
    .sort((left, right) => right.weight - left.weight);
}