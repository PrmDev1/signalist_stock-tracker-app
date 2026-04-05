export interface DashboardPortfolioListItem {
  id: string;
  name: string;
  tickersCount: number;
  riskLevel: 'low' | 'medium' | 'high';
  updatedAt: string;
}

export interface DashboardHoldingSnapshot {
  ticker: string;
  companyName: string;
  weight: number;
  allocatedAmount: number;
  latestPrice?: number;
  yesterdayPrice?: number;
  currentValue: number;
  dayChangePercent: number;
}

export interface DashboardChartPoint {
  label: string;
  value: number;
}

export interface DashboardPortfolioWidgetData extends DashboardPortfolioListItem {
  totalInvestment: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
  holdings: DashboardHoldingSnapshot[];
  chart: DashboardChartPoint[];
}