'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, Loader2, PiggyBank, Shield, Sparkles, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { savePortfolioToDatabase } from '@/lib/actions/cloudflare.actions';
import type { BacktestAndMetrics, RiskRewardProfile } from '@/components/portfolio/analysis-types';
import type { CommunityAllocationEntry, CommunityPortfolioData } from './types';
import { normalizeCommunityAllocations } from './types';

type DetailStep = 1 | 2;

interface CommunityPortfolioApplyPageProps {
  mvoId: string;
}

interface PortfolioPreviewResponse {
  reqId?: string;
  status: string;
  message?: string;
  modelUsed?: string;
  portfolio?: {
    allocations: Record<string, { weight: number; allocatedAmount: number }>;
    expectedReturn: number;
    volatility: number;
    sharpeRatio: number;
  };
  explainability?: {
    riskRewardProfile?: RiskRewardProfile;
  };
  backtestAndMetrics?: BacktestAndMetrics;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCurrency(value?: number): string {
  if (!Number.isFinite(value)) return 'N/A';

  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number(value));
}

function formatModel(value: string): string {
  return value.toLowerCase() === 'semi' ? 'Semi-Variance' : value.toUpperCase();
}

function formatCreatedDate(value?: string | null): string {
  if (!value) return 'N/A';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(parsed);
}

function roundToCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export default function CommunityPortfolioApplyPage({ mvoId }: CommunityPortfolioApplyPageProps) {
  const router = useRouter();
  const [selectedPortfolio, setSelectedPortfolio] = useState<CommunityPortfolioData | null>(null);
  const [portfolioName, setPortfolioName] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('10000');
  const [monthlyDca, setMonthlyDca] = useState('0');
  const [targetYears, setTargetYears] = useState('10');
  const [detailStep, setDetailStep] = useState<DetailStep>(1);
  const [brokerMinOrder] = useState<number>(5);
  const [previewData, setPreviewData] = useState<PortfolioPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [isCreatingPortfolio, setIsCreatingPortfolio] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.sessionStorage.getItem(`community-portfolio:${mvoId}`);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as CommunityPortfolioData;
      setSelectedPortfolio(parsed);
      setPortfolioName(`${parsed.mvoId.slice(0, 8).toUpperCase()} Strategy`);
      setTargetYears(String(Math.min(20, Math.max(1, Number(parsed.lookbackYears || 10)))));
    } catch {
      setSelectedPortfolio(null);
    }
  }, [mvoId]);

  const selectedTopAllocations: CommunityAllocationEntry[] = useMemo(
    () => (selectedPortfolio ? normalizeCommunityAllocations(selectedPortfolio.allocations).slice(0, 8) : []),
    [selectedPortfolio]
  );

  const selectedAllocations: CommunityAllocationEntry[] = useMemo(
    () => (selectedPortfolio ? normalizeCommunityAllocations(selectedPortfolio.allocations) : []),
    [selectedPortfolio]
  );

  const displayAllocations = useMemo(() => {
    if (detailStep === 2 && previewData?.portfolio) {
      return Object.entries(previewData.portfolio.allocations)
        .map(([ticker, allocation]) => ({
          ticker,
          weight: Number(allocation.weight || 0),
          allocatedAmount: Number(allocation.allocatedAmount || 0),
        }))
        .filter((entry) => entry.weight > 0)
        .sort((left, right) => right.weight - left.weight);
    }

    return selectedAllocations;
  }, [detailStep, previewData, selectedAllocations]);

  const displayTopAllocations = useMemo(() => displayAllocations.slice(0, 8), [displayAllocations]);

  const handlePreparePreview = async () => {
    if (!selectedPortfolio) return;

    const normalizedName = portfolioName.trim();
    const normalizedInitialCapital = Number(investmentAmount);
    const normalizedMonthlyDca = Number(monthlyDca);
    const normalizedTargetYears = Number(targetYears);

    if (!normalizedName) {
      toast.error('Please enter a portfolio name.');
      return;
    }

    if (!Number.isFinite(normalizedInitialCapital) || normalizedInitialCapital <= 0) {
      toast.error('Investment amount must be greater than 0.');
      return;
    }

    if (!Number.isFinite(normalizedMonthlyDca) || normalizedMonthlyDca < 0) {
      toast.error('Monthly DCA must be 0 or greater.');
      return;
    }

    if (!Number.isFinite(normalizedTargetYears) || normalizedTargetYears < 1 || normalizedTargetYears > 20) {
      toast.error('Target number of years must be between 1 and 20.');
      return;
    }

    setIsPreparingPreview(true);
    setPreviewError(null);

    try {
      const response = await fetch(
        `/api/v1/portfolio/allocation/${encodeURIComponent(selectedPortfolio.mvoId)}?initialCapital=${encodeURIComponent(String(normalizedInitialCapital))}&brokerMinOrder=${encodeURIComponent(String(brokerMinOrder))}`,
        {
          method: 'GET',
          cache: 'no-store',
        }
      );

      const payload = (await response.json().catch(() => ({}))) as PortfolioPreviewResponse & { error?: string; detail?: string };

      if (!response.ok) {
        throw new Error(payload.error || payload.detail || payload.message || 'Unable to prepare a portfolio preview.');
      }

      if (!payload.portfolio || Object.keys(payload.portfolio.allocations || {}).length < 2) {
        throw new Error('Preview data is incomplete. Please try another community strategy or adjust your investment amount.');
      }

      setPreviewData(payload);
      setDetailStep(2);
    } catch (previewIssue) {
      const message = previewIssue instanceof Error ? previewIssue.message : 'Unable to prepare portfolio preview.';
      setPreviewError(message);
      toast.error(message);
    } finally {
      setIsPreparingPreview(false);
    }
  };

  const handleCreatePortfolio = async () => {
    if (!selectedPortfolio) return;

    const normalizedName = portfolioName.trim();
    const normalizedInitialCapital = Number(investmentAmount);
    const normalizedMonthlyDca = Number(monthlyDca);
    const normalizedTargetYears = Math.min(20, Math.max(1, Number(targetYears || selectedPortfolio.lookbackYears || 10)));

    if (!previewData?.portfolio || Object.keys(previewData.portfolio.allocations || {}).length < 2) {
      toast.error('Please generate the final portfolio preview before saving.');
      return;
    }

    if (!Number.isFinite(normalizedTargetYears) || normalizedTargetYears < 1 || normalizedTargetYears > 20) {
      toast.error('Target number of years must be between 1 and 20.');
      return;
    }

    setIsCreatingPortfolio(true);

    try {
      const allocations = Object.fromEntries(
        Object.entries(previewData.portfolio.allocations).map(([ticker, allocation]) => [
          ticker.trim().toUpperCase(),
          {
            weight: Number(allocation.weight || 0),
            allocatedAmount: roundToCurrency(Number(allocation.allocatedAmount || 0)),
          },
        ])
      ) as Record<string, { weight: number; allocatedAmount: number }>;

      const simulatePromise = fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mvoHashId: selectedPortfolio.mvoId,
          initialCapital: normalizedInitialCapital,
          monthlyDca: normalizedMonthlyDca,
          investmentHorizon: normalizedTargetYears,
        }),
      });

      const saveResponse = await savePortfolioToDatabase(
        normalizedName,
        Object.keys(allocations),
        {},
        allocations,
        previewData.portfolio.expectedReturn,
        previewData.portfolio.volatility,
        normalizedInitialCapital,
        selectedPortfolio.riskLv === 'low' || selectedPortfolio.riskLv === 'high' || selectedPortfolio.riskLv === 'medium'
          ? selectedPortfolio.riskLv
          : 'medium',
        selectedPortfolio.modelName === 'semi' ? 'semi' : 'mvo',
        selectedPortfolio.mvoId,
        normalizedMonthlyDca,
        normalizedTargetYears,
        previewData.backtestAndMetrics,
        previewData.explainability?.riskRewardProfile,
        selectedPortfolio.lookbackYears,
        selectedPortfolio.isDiversified,
        previewData.portfolio.sharpeRatio
      );

      const simulateResponse = await simulatePromise;
      const simulatePayload = (await simulateResponse.json().catch(() => ({}))) as { error?: string; message?: string };

      if (!saveResponse.success || !saveResponse.portfolioId) {
        throw new Error(saveResponse.error || 'Unable to create portfolio from this community strategy.');
      }

      if (!simulateResponse.ok) {
        toast.warning(
          simulatePayload.error ||
            simulatePayload.message ||
            'Portfolio saved, but Monte Carlo warm-up could not be started. The detail page will retry automatically.'
        );
      }

      toast.success('Portfolio created and added to your workspace.');
      router.push(`/portfolio/${saveResponse.portfolioId}`);
    } catch (creationError) {
      const message = creationError instanceof Error ? creationError.message : 'Unable to create portfolio.';
      toast.error(message);
    } finally {
      setIsCreatingPortfolio(false);
    }
  };

  if (!selectedPortfolio) {
    return (
      <section className="space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,16,27,0.92),rgba(8,11,18,0.92))] p-6 backdrop-blur-xl sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#7db8ff]/25 bg-[#7db8ff]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b9d8ff]">
            <Sparkles className="h-3.5 w-3.5" />
            Community Portfolio Apply
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-white">Community portfolio session not found</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Re-open this strategy from the Community Portfolio discovery page so the selected portfolio data can be loaded into the setup flow.
          </p>
          <Button
            type="button"
            onClick={() => router.push('/community-portfolio')}
            className="mt-5 rounded-2xl bg-gradient-to-r from-[#5862ff] to-[#0fedbe] text-[#030712]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to community portfolios
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(125,184,255,0.24),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,237,190,0.16),transparent_24%),linear-gradient(135deg,#0b0f19_0%,#0f1628_48%,#070b14_100%)] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-8">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(88,98,255,0.1),transparent_32%,rgba(15,237,190,0.08))]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/community-portfolio')}
              className="-ml-3 mb-3 h-auto px-3 py-2 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to community portfolios
            </Button>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7db8ff]/25 bg-[#7db8ff]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b9d8ff]">
              <Sparkles className="h-3.5 w-3.5" />
              Community Portfolio Apply
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {selectedPortfolio.mvoId.slice(0, 8).toUpperCase()} Strategy
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-400">
              Step {detailStep} of 2. Configure your investment plan first, then review the final portfolio with Sharpe Ratio and backtest metrics before saving it to your workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[420px]">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Model</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatModel(selectedPortfolio.modelName)}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Risk Level</p>
              <p className="mt-2 text-xl font-semibold capitalize text-white">{selectedPortfolio.riskLv}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Sharpe Ratio</p>
              <p className="mt-2 text-xl font-semibold text-[#b9d8ff]">{(previewData?.portfolio?.sharpeRatio ?? selectedPortfolio.sharpeRatio).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Expected Return</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">
                {formatPercent((previewData?.portfolio?.expectedReturn ?? selectedPortfolio.expectedReturn))}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Volatility</p>
              <p className="mt-2 text-2xl font-semibold text-rose-300">
                {formatPercent((previewData?.portfolio?.volatility ?? selectedPortfolio.volatility))}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Sharpe Ratio</p>
              <p className="mt-2 text-2xl font-semibold text-[#b9d8ff]">
                {(previewData?.portfolio?.sharpeRatio ?? selectedPortfolio.sharpeRatio).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">Top allocation map</p>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
                {displayAllocations.length} ranked holdings
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {displayTopAllocations.map(({ ticker, weight }) => (
                <div key={ticker}>
                  <div className="mb-1 flex items-center justify-between text-sm text-gray-300">
                    <span>{ticker}</span>
                    <span>{formatPercent(weight)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#5862ff] via-[#7db8ff] to-[#0fedbe]"
                      style={{ width: `${Math.min(weight * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">Portfolio details</p>
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{displayAllocations.length} ranked holdings</p>
            </div>
            <div className="mt-4 overflow-hidden rounded-[22px] border border-white/8 bg-black/20">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-left text-[11px] uppercase tracking-[0.18em] text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Ticker</th>
                    <th className="px-4 py-3 text-right font-medium">Weight</th>
                    <th className="px-4 py-3 text-right font-medium">Allocated</th>
                  </tr>
                </thead>
                <tbody>
                  {displayAllocations.map(({ ticker, weight, allocatedAmount }) => (
                    <tr key={`detail-${ticker}`} className="border-t border-white/6 text-gray-200">
                      <td className="px-4 py-3 font-medium text-white">{ticker}</td>
                      <td className="px-4 py-3 text-right">{formatPercent(weight)}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{formatCurrency(allocatedAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-medium text-white">Portfolio metadata</p>
            <dl className="mt-4 space-y-3 text-sm text-gray-300">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Model</dt>
                <dd>{formatModel(selectedPortfolio.modelName)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Risk level</dt>
                <dd className="capitalize">{selectedPortfolio.riskLv}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Lookback</dt>
                <dd>{selectedPortfolio.lookbackYears} years</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Diversification</dt>
                <dd>{selectedPortfolio.isDiversified ? 'Diversified' : 'Concentrated'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Created</dt>
                <dd>{formatCreatedDate(selectedPortfolio.createAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[28px] border border-[#0fedbe]/15 bg-[linear-gradient(180deg,rgba(15,237,190,0.08),rgba(88,98,255,0.08))] p-5 shadow-[0_0_30px_rgba(15,237,190,0.06)]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-2xl border border-[#0fedbe]/20 bg-[#0fedbe]/10 p-2 text-[#93fff0]">
                {detailStep === 1 ? <PiggyBank className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{detailStep === 1 ? 'Step 1: Portfolio setup' : 'Step 2: Final portfolio review'}</p>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  {detailStep === 1
                    ? 'Enter the parameters needed to build your portfolio from this community strategy. Once ready, generate a complete preview with accurate allocations and backtest metrics.'
                    : 'Review the final generated portfolio, including Sharpe Ratio and backtest metrics, before saving it into your personal portfolio workspace.'}
                </p>
              </div>
            </div>

            {detailStep === 1 ? (
              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="community-portfolio-name" className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-gray-400">Portfolio name</label>
                  <Input
                    id="community-portfolio-name"
                    value={portfolioName}
                    onChange={(event) => setPortfolioName(event.target.value)}
                    placeholder="My Community Portfolio"
                    disabled={isPreparingPreview || isCreatingPortfolio}
                    className="h-11 rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="community-investment-amount" className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                      <DollarSign className="h-3.5 w-3.5 text-[#0fedbe]" />
                      Investment amount
                    </label>
                    <Input
                      id="community-investment-amount"
                      type="number"
                      min={1}
                      step="1"
                      inputMode="decimal"
                      value={investmentAmount}
                      onChange={(event) => setInvestmentAmount(event.target.value)}
                      disabled={isPreparingPreview || isCreatingPortfolio}
                      className="h-11 rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="community-monthly-dca" className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                      <PiggyBank className="h-3.5 w-3.5 text-[#7db8ff]" />
                      Monthly DCA
                    </label>
                    <Input
                      id="community-monthly-dca"
                      type="number"
                      min={0}
                      step="1"
                      inputMode="decimal"
                      value={monthlyDca}
                      onChange={(event) => setMonthlyDca(event.target.value)}
                      disabled={isPreparingPreview || isCreatingPortfolio}
                      className="h-11 rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="community-target-years" className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                    <TrendingUp className="h-3.5 w-3.5 text-[#b9d8ff]" />
                    Target Number of Years
                  </label>
                  <Input
                    id="community-target-years"
                    type="number"
                    min={1}
                    max={20}
                    step="1"
                    inputMode="numeric"
                    value={targetYears}
                    onChange={(event) => setTargetYears(event.target.value)}
                    disabled={isPreparingPreview || isCreatingPortfolio}
                    className="h-11 rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
                  <div className="flex items-center justify-between gap-3">
                    <span>Projection setup</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
                      {Math.min(20, Math.max(1, Number(targetYears || selectedPortfolio.lookbackYears || 10)))} year horizon
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-gray-400">
                    We use your investment amount to request the final portfolio allocation and backtest preview, then submit your initial capital, monthly DCA, and target number of years as the Monte Carlo investment horizon when saving the portfolio.
                  </p>
                </div>

                {previewError ? <div className="rounded-[22px] border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">{previewError}</div> : null}

                <Button
                  type="button"
                  onClick={handlePreparePreview}
                  disabled={isPreparingPreview || isCreatingPortfolio}
                  className="mt-1 h-11 w-full rounded-2xl bg-gradient-to-r from-[#0fedbe] via-[#7db8ff] to-[#5862ff] text-[#030712] shadow-[0_0_28px_rgba(15,237,190,0.24)] hover:scale-[1.01]"
                >
                  {isPreparingPreview ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preparing final portfolio...
                    </>
                  ) : (
                    'Continue to final portfolio review'
                  )}
                </Button>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Sharpe Ratio</p>
                    <p className="mt-2 text-2xl font-semibold text-[#b9d8ff]">{previewData?.portfolio?.sharpeRatio?.toFixed(2) ?? 'N/A'}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Backtest Return</p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-300">
                      {typeof previewData?.backtestAndMetrics?.realizedMetrics?.realizedAnnualReturnPct === 'number'
                        ? `${previewData.backtestAndMetrics.realizedMetrics.realizedAnnualReturnPct.toFixed(1)}%`
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">Final portfolio review</p>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
                      <Shield className="h-3.5 w-3.5 text-[#0fedbe]" />
                      Ready to save
                    </span>
                  </div>
                  <dl className="mt-4 space-y-3 text-sm text-gray-300">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Portfolio name</dt>
                      <dd>{portfolioName}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Initial investment</dt>
                      <dd>{formatCurrency(Number(investmentAmount))}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Monthly DCA</dt>
                      <dd>{formatCurrency(Number(monthlyDca))}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Target years</dt>
                      <dd>{Math.min(20, Math.max(1, Number(targetYears || selectedPortfolio.lookbackYears || 10)))} years</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Expected annual return</dt>
                      <dd className="text-emerald-300">{previewData?.portfolio ? formatPercent(previewData.portfolio.expectedReturn) : 'N/A'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Expected volatility</dt>
                      <dd className="text-rose-300">{previewData?.portfolio ? formatPercent(previewData.portfolio.volatility) : 'N/A'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Historical max drawdown</dt>
                      <dd>
                        {typeof previewData?.backtestAndMetrics?.realizedMetrics?.historicalMaxDrawdownPct === 'number'
                          ? `${previewData.backtestAndMetrics.realizedMetrics.historicalMaxDrawdownPct.toFixed(1)}%`
                          : 'N/A'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDetailStep(1)}
                    disabled={isCreatingPortfolio}
                    className="h-11 flex-1 rounded-2xl border-white/10 bg-black/20 text-white hover:bg-white/8"
                  >
                    Back to setup
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreatePortfolio}
                    disabled={isCreatingPortfolio}
                    className="h-11 flex-1 rounded-2xl bg-gradient-to-r from-[#0fedbe] via-[#7db8ff] to-[#5862ff] text-[#030712] shadow-[0_0_28px_rgba(15,237,190,0.24)] hover:scale-[1.01]"
                  >
                    {isCreatingPortfolio ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving portfolio...
                      </>
                    ) : (
                      'Save portfolio to my workspace'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}