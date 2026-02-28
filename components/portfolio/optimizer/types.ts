import type { FilteredStock } from '@/lib/portfolio-filtered-stocks';

export interface PortfolioResult {
  allocations: Record<string, { weight: number; allocatedAmount: number }>;
  expectedReturn: number;
  volatility: number;
}

export type RiskTolerance = 'low' | 'medium' | 'high';
export type InvestmentHorizon = 'short' | 'medium' | 'long';
export type RebalancingFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export interface ParameterPanelProps {
  investmentAmount: number;
  setInvestmentAmount: (value: number) => void;
  riskTolerance: RiskTolerance;
  setRiskTolerance: (value: RiskTolerance) => void;
  investmentHorizon: InvestmentHorizon;
  setInvestmentHorizon: (value: InvestmentHorizon) => void;
  rebalancingFrequency: RebalancingFrequency;
  setRebalancingFrequency: (value: RebalancingFrequency) => void;
  modelName: 'mvo' | 'semi';
  setModelName: (value: 'mvo' | 'semi') => void;
  brokerMinOrder: number;
  setBrokerMinOrder: (value: number) => void;
  maxAllocationPerStock: number;
  setMaxAllocationPerStock: (value: number) => void;
  returnPriority: number;
  setReturnPriority: (value: number) => void;
  requireDiversification: boolean;
  setRequireDiversification: (value: boolean) => void;
  lookbackYears: number;
  status: 'IDLE' | 'PROCESSING' | 'READY' | 'FAILED';
  statusMessage: string | null;
  canRunOptimization: boolean;
  onOptimize: () => void;
  onReset: () => void;
  onBack: () => void;
}

export interface PreviewPanelProps {
  selectedStocks: FilteredStock[];
  riskTolerance: RiskTolerance;
  investmentHorizon: InvestmentHorizon;
  returnPriority: number;
  rebalancingFrequency: RebalancingFrequency;
  maxAllocationPerStock: number;
  onRemoveStock: (symbol: string) => void;
}

export interface ResultsPanelProps {
  status: 'IDLE' | 'PROCESSING' | 'READY' | 'FAILED';
  errorMsg: string | null;
  reqId: string | null;
  result: PortfolioResult | null;
  modelUsed: string | null;
  portfolioName: string;
  setPortfolioName: (value: string) => void;
  onSavePortfolio: () => void;
  isSaving: boolean;
  canCreatePortfolio: boolean;
}
