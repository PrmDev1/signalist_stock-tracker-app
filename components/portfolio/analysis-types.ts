export interface MonteCarloRequest {
  mvoHashId: string;
  initialCapital: number;
  monthlyDca: number;
  investmentHorizon: number;
}

export interface PathSummary {
  finalValue: number;
  totalInvested: number;
  netProfitOrLoss: number;
  isProfit: boolean;
  worstDropAlongTheWayPct: number;
}

export interface MonteCarloChartPaths {
  expectedPath: number[];
  pessimisticPath: number[];
  spyExpectedPath: number[];
  bilExpectedPath: number[];
}

export interface MonteCarloResult {
  chartPaths: MonteCarloChartPaths;
  pathSummaries: {
    expectedScenario: PathSummary;
    pessimisticScenario: PathSummary;
  };
  metadata: {
    inflationRate: number;
    probabilityOfShortfallPct: number;
  };
}

export interface BacktestTimeSeries {
  dates: string[];
  portfolioValue: number[];
  benchmarkValues: Record<string, number[]>;
}

export interface ExpectedMetrics {
  expectedAnnualReturnPct: number;
  expectedAnnualVolatilityPct: number;
}

export interface RealizedMetrics {
  realizedAnnualReturnPct: number;
  realizedAnnualVolatilityPct: number;
  historicalMaxDrawdownPct: number;
}

export interface BacktestAndMetrics {
  initialCapital?: number;
  timeSeries: BacktestTimeSeries;
  expectedMetrics: ExpectedMetrics;
  realizedMetrics: RealizedMetrics;
}

export interface EducationalInsights {
  returnDescription?: string;
  riskDescription?: string;
  correlationDescription?: string;
  modelAccuracyReturnMsg?: string;
  modelAccuracyRiskMsg?: string;
}

export interface RiskRewardProfile {
  title?: string;
  ratioType: string;
  ratioValue: number;
  stars: number;
  label: string;
  description: string;
}
