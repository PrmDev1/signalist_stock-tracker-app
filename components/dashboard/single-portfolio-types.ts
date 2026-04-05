export interface DashboardPortfolioOption {
  id: string;
  name: string;
  riskLevel: 'low' | 'medium' | 'high';
  tickersCount: number;
  updatedAt: string;
}

export interface InvestedBreakdownItem {
  label: string;
  percent: number;
  amount: number;
  color: string;
}

export interface DashboardHistoryPoint {
  timestamp: number;
  portfolioValue: number;
  investedCapital: number;
}

export interface PortfolioScenarioSummary {
  title: string;
  years: string;
  finalValue: number;
  totalInvested: number;
  netProfitLoss: number;
  drawdown: number;
  profitTone: 'positive' | 'negative';
}

export interface SelectedDashboardPortfolio {
  id: string;
  name: string;
  riskLevel: 'low' | 'medium' | 'high';
  updatedAt: string;
  tickersCount: number;
  currentValue: number;
  totalInvestment: number;
  profitLoss: number;
  profitLossPercent: number;
  expectedReturnPercent: number;
  volatilityPercent: number;
  mvoId?: string;
  initialCapital: number;
  monthlyDca: number;
  investmentHorizon: number;
  assetYearChange: number;
  assetYearChangePercent: number;
  investedBreakdown: InvestedBreakdownItem[];
  investmentHistory: DashboardHistoryPoint[];
}