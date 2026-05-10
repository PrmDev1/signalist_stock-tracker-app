import type { FilteredStock } from '@/lib/portfolio-filtered-stocks';
import type { ReactNode } from 'react';
import type {
  BacktestAndMetrics,
  EducationalInsights,
  RiskRewardProfile,
} from '@/components/portfolio/analysis-types';
import type {
  PortfolioConfigurationState,
  PortfolioPreset,
} from './preset-config.types';

export interface PortfolioResult {
  allocations: Record<string, { weight: number; allocatedAmount: number }>;
  expectedReturn: number;
  volatility: number;
  riskLevel?: string | null;
}

export type InvestmentHorizon = 'short' | 'medium' | 'long';

export interface RiskBounds {
  minRisk: number;
  maxRisk: number;
  minReturn?: number;
  maxReturn?: number;
  warningMsg?: string | null;
}

export type PortfolioRiskLevel = 'LOW' | 'MED' | 'HIGH' | 'low' | 'medium' | 'high';

export interface ParameterPanelProps {
  investmentAmount: number;
  setInvestmentAmount: (value: number) => void;
  monthlyDca: number;
  setMonthlyDca: (value: number) => void;
  targetYears: number;
  setTargetYears: (value: number) => void;
  targetRisk: number | null;
  setTargetRisk: (value: number) => void;
  riskBounds: RiskBounds | null;
  isFetchingRiskBounds: boolean;
  riskBoundsError: string | null;
  derivedRiskLevel: PortfolioRiskLevel | null;
  investmentHorizon: InvestmentHorizon;
  setInvestmentHorizon: (value: InvestmentHorizon) => void;
  modelName: 'mvo' | 'semi';
  setModelName: (value: 'mvo' | 'semi') => void;
  brokerMinOrder: number;
  setBrokerMinOrder: (value: number) => void;
  requireDiversification: boolean;
  setRequireDiversification: (value: boolean) => void;
  activePreset: PortfolioPreset;
  presetConfigPanel: ReactNode;
  status: 'IDLE' | 'PROCESSING' | 'READY' | 'FAILED';
  statusMessage: string | null;
  canRunOptimization: boolean;
  onOptimize: () => void;
  onReset: () => void;
  onBack: () => void;
}

export interface PreviewPanelProps {
  selectedStocks: FilteredStock[];
  onRemoveStock: (symbol: string) => void;
}

export interface ResultsPanelProps {
  status: 'IDLE' | 'PROCESSING' | 'READY' | 'FAILED';
  errorMsg: string | null;
  result: PortfolioResult | null;
  modelUsed: string | null;
  backtestAndMetrics?: BacktestAndMetrics | null;
  educationalInsights?: EducationalInsights | null;
  riskRewardProfile?: RiskRewardProfile | null;
  portfolioName: string;
  setPortfolioName: (value: string) => void;
  onSavePortfolio: () => void;
  isSaving: boolean;
  canCreatePortfolio: boolean;
}
