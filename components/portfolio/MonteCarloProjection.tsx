'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface MonteCarloPaths {
  optimisticPath: number[];
  expectedPath: number[];
  pessimisticPath: number[];
}

export interface ScenarioSummary {
  finalValue: number;
  totalInvested: number;
  netProfitOrLoss: number;
  isProfit: boolean;
  worstDropAlongTheWay_pct: number;
}

export interface MonteCarloResult {
  chartPaths: MonteCarloPaths;
  pathSummaries: {
    optimisticScenario: ScenarioSummary;
    expectedScenario: ScenarioSummary;
    pessimisticScenario: ScenarioSummary;
  };
  metadata: {
    inflationRate: number;
    probabilityOfShortfall_pct: number;
  };
}

interface TriggerSimulationResponse {
  mcHashId: string;
  error?: string;
}

interface PollProcessingResponse {
  status: 'PROCESSING';
  message?: string;
}

interface PollCompletedResponse {
  status: 'COMPLETED';
  mcHashId: string;
  monteCarlo: MonteCarloResult;
}

interface PollFailedResponse {
  status: 'FAILED' | 'ERROR';
  message?: string;
}

type PollResponse = PollProcessingResponse | PollCompletedResponse | PollFailedResponse;

interface MonteCarloProjectionProps {
  mvoId?: string;
  initialCapital?: number;
  monthlyDca?: number;
  investmentHorizon?: number;
}

type LoadState = 'idle' | 'triggering' | 'processing' | 'completed' | 'error';

interface ChartPoint {
  step: number;
  year: number;
  optimistic: number;
  expected: number;
  pessimistic: number;
}

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 120;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

async function parseJsonOrThrow<T>(res: Response, defaultErrorMessage: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    const bodyText = await res.text();
    throw new Error(bodyText || defaultErrorMessage);
  }

  return (await res.json()) as T;
}

function scenarioColor(name: 'Optimistic' | 'Expected' | 'Pessimistic'): string {
  if (name === 'Optimistic') return '#10b981';
  if (name === 'Expected') return '#3b82f6';
  return '#ef4444';
}

function ScenarioCard({
  title,
  summary,
}: {
  title: 'Optimistic' | 'Expected' | 'Pessimistic';
  summary: ScenarioSummary;
}) {
  const tone = scenarioColor(title);
  const pnlClass = summary.isProfit ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="rounded-2xl border border-gray-700/80 bg-gray-800/35 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
      <div className="mb-4 flex items-center justify-between border-b border-gray-700/70 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tone }} />
          <h4 className="text-sm font-semibold text-white">{title} Scenario</h4>
        </div>
        <span className="rounded-full border border-gray-600 px-2 py-0.5 text-[11px] text-gray-300">10Y</span>
      </div>

      <div className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Final Value</span>
          <span className="font-semibold text-white">{formatCurrency(summary.finalValue)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Total Invested</span>
          <span className="font-medium text-gray-200">{formatCurrency(summary.totalInvested)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Net Profit / Loss</span>
          <span className={`font-semibold ${pnlClass}`}>
            {summary.isProfit ? '+' : '-'}
            {formatCurrency(Math.abs(summary.netProfitOrLoss))}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Worst Drawdown</span>
          <span className="font-medium text-red-300">{formatPercent(summary.worstDropAlongTheWay_pct)}</span>
        </div>
      </div>
    </div>
  );
}

export default function MonteCarloProjection({
  mvoId,
  initialCapital = 100000,
  monthlyDca = 0,
  investmentHorizon = 10,
}: MonteCarloProjectionProps) {
  const [state, setState] = useState<LoadState>('idle');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [monteCarlo, setMonteCarlo] = useState<MonteCarloResult | null>(null);

  const runProjection = useCallback(async () => {
    if (!mvoId) {
      setError('MVO ID not found for this portfolio. Please re-optimize and save again.');
      setState('error');
      return;
    }

    setState('triggering');
    setError(null);
    setMessage('Triggering simulation request...');
    setMonteCarlo(null);

    try {
      const triggerRes = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mvoHashId: mvoId,
          initialCapital,
          monthlyDca,
          investmentHorizon,
        }),
      });

      const triggerData = await parseJsonOrThrow<TriggerSimulationResponse>(
        triggerRes,
        'Trigger endpoint did not return JSON.'
      );

      if (!triggerRes.ok) {
        throw new Error(triggerData.error || `Trigger failed with status ${triggerRes.status}`);
      }

      if (!triggerData.mcHashId) {
        throw new Error('Simulation started but mcHashId is missing.');
      }

      setState('processing');
      setMessage('Generating Monte Carlo Projection... Running thousands of simulations...');

      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
        const pollRes = await fetch(
          `/api/v1/portfolio/simulate/monte-carlo/${encodeURIComponent(triggerData.mcHashId)}`,
          {
            method: 'GET',
            cache: 'no-store',
          }
        );

        const pollData = await parseJsonOrThrow<PollResponse>(
          pollRes,
          'Polling endpoint did not return JSON.'
        );

        if (!pollRes.ok) {
          const maybeError = (pollData as { error?: string }).error;
          throw new Error(maybeError || `Polling failed with status ${pollRes.status}`);
        }

        if (pollData.status === 'COMPLETED') {
          setMonteCarlo(pollData.monteCarlo);
          setState('completed');
          setMessage('');
          return;
        }

        if (pollData.status === 'FAILED' || pollData.status === 'ERROR') {
          throw new Error(pollData.message || 'Monte Carlo simulation failed.');
        }

        setMessage(pollData.message || 'The system is generating your Monte Carlo projection...');
        await sleep(POLL_INTERVAL_MS);
      }

      throw new Error('Simulation timeout. Please try again.');
    } catch (runError) {
      const errorMessage = runError instanceof Error ? runError.message : 'Unknown error occurred';
      setError(errorMessage);
      setState('error');
      setMessage('');
    }
  }, [initialCapital, investmentHorizon, monthlyDca, mvoId]);

  useEffect(() => {
    void runProjection();
  }, [runProjection]);

  const chartData = useMemo(() => {
    if (!monteCarlo) return [] as ChartPoint[];

    const { optimisticPath, expectedPath, pessimisticPath } = monteCarlo.chartPaths;
    const maxLength = Math.max(optimisticPath.length, expectedPath.length, pessimisticPath.length);
    const safeHorizon = Math.max(1, investmentHorizon);
    const pointsPerYear = maxLength > 1 ? (maxLength - 1) / safeHorizon : 1;

    const rows: ChartPoint[] = [];

    for (let index = 0; index < maxLength; index += 1) {
      rows.push({
        step: index,
        year: pointsPerYear > 0 ? index / pointsPerYear : 0,
        optimistic: optimisticPath[index] ?? optimisticPath[optimisticPath.length - 1] ?? 0,
        expected: expectedPath[index] ?? expectedPath[expectedPath.length - 1] ?? 0,
        pessimistic: pessimisticPath[index] ?? pessimisticPath[pessimisticPath.length - 1] ?? 0,
      });
    }

    return rows;
  }, [investmentHorizon, monteCarlo]);

  const xTicks = useMemo(() => {
    if (!chartData.length) return [] as number[];

    const maxStep = chartData[chartData.length - 1]?.step ?? 0;
    const safeHorizon = Math.max(1, investmentHorizon);
    const pointsPerYear = maxStep > 0 ? maxStep / safeHorizon : 1;
    const ticks: number[] = [];

    for (let year = 0; year <= safeHorizon; year += 1) {
      ticks.push(Math.round(year * pointsPerYear));
    }

    return ticks;
  }, [chartData, investmentHorizon]);

  const overviewStats = useMemo(() => {
    if (!monteCarlo) return null;

    const expected = monteCarlo.pathSummaries.expectedScenario;
    const optimistic = monteCarlo.pathSummaries.optimisticScenario;

    return {
      expectedFinal: expected.finalValue,
      expectedProfit: expected.netProfitOrLoss,
      shortfall: monteCarlo.metadata.probabilityOfShortfall_pct,
      bestFinal: optimistic.finalValue,
    };
  }, [monteCarlo]);

  return (
    <section className="rounded-3xl border border-gray-700/80 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_38%),linear-gradient(160deg,_rgba(20,20,20,0.96),_rgba(5,5,5,0.98))] p-4 sm:p-6 lg:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.16em] text-teal-300/80">Portfolio Intelligence</p>
          <h3 className="text-xl font-semibold text-white sm:text-2xl">Investment Projection</h3>
          <p className="text-sm text-gray-400">Monte Carlo Simulation ({Math.max(5, investmentHorizon)}-{Math.max(20, investmentHorizon)} Years)</p>
        </div>

        <button
          type="button"
          onClick={() => void runProjection()}
          className="rounded-xl border border-gray-500/70 bg-gray-800/80 px-4 py-2.5 text-xs font-semibold text-gray-100 transition hover:border-teal-400 hover:text-teal-300"
          disabled={state === 'triggering' || state === 'processing'}
        >
          {state === 'triggering' || state === 'processing' ? 'Running...' : 'Run Again'}
        </button>
      </div>

      {overviewStats ? (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-700/70 bg-gray-900/60 p-3.5">
            <p className="text-xs uppercase tracking-[0.12em] text-gray-500">Expected Final Value</p>
            <p className="mt-1.5 text-lg font-semibold text-white">{formatCurrency(overviewStats.expectedFinal)}</p>
          </div>
          <div className="rounded-xl border border-gray-700/70 bg-gray-900/60 p-3.5">
            <p className="text-xs uppercase tracking-[0.12em] text-gray-500">Expected Net P/L</p>
            <p className={`mt-1.5 text-lg font-semibold ${overviewStats.expectedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {overviewStats.expectedProfit >= 0 ? '+' : '-'}{formatCurrency(Math.abs(overviewStats.expectedProfit))}
            </p>
          </div>
          <div className="rounded-xl border border-gray-700/70 bg-gray-900/60 p-3.5">
            <p className="text-xs uppercase tracking-[0.12em] text-gray-500">Best Case Final Value</p>
            <p className="mt-1.5 text-lg font-semibold text-teal-300">{formatCurrency(overviewStats.bestFinal)}</p>
          </div>
          <div className="rounded-xl border border-gray-700/70 bg-gray-900/60 p-3.5">
            <p className="text-xs uppercase tracking-[0.12em] text-gray-500">Probability Of Shortfall</p>
            <p className="mt-1.5 text-lg font-semibold text-red-300">{formatPercent(overviewStats.shortfall)}</p>
          </div>
        </div>
      ) : null}

      {(state === 'triggering' || state === 'processing') && (
        <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <p className="text-sm font-medium text-blue-200">Generating Monte Carlo Projection...</p>
          <p className="mt-1 text-xs text-blue-100/80">Running thousands of simulations...</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-blue-950/60">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-400" />
          </div>
          {message ? <p className="mt-3 text-xs text-blue-100/80">{message}</p> : null}
        </div>
      )}

      {error ? (
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="h-[430px] w-full rounded-2xl border border-gray-700/80 bg-black/70 p-3 sm:h-[520px] sm:p-5">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 16 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#30333A" />
              <XAxis
                dataKey="step"
                type="number"
                domain={[0, 'dataMax']}
                ticks={xTicks}
                tick={{ fill: '#CCDADC', fontSize: 12 }}
                axisLine={{ stroke: '#30333A' }}
                tickLine={false}
                tickFormatter={(step) => {
                  const maxStep = chartData[chartData.length - 1]?.step ?? 1;
                  const yearValue = (Number(step) / Math.max(1, maxStep)) * Math.max(1, investmentHorizon);
                  return `${Math.round(yearValue)}`;
                }}
                label={{ value: 'Years', position: 'insideBottom', offset: -8, fill: '#9095A1' }}
              />
              <YAxis
                tick={{ fill: '#CCDADC', fontSize: 12 }}
                axisLine={{ stroke: '#30333A' }}
                tickLine={false}
                tickFormatter={(value) => formatCurrency(Number(value))}
                width={110}
                label={{ value: 'Portfolio Value ($)', angle: -90, position: 'insideLeft', fill: '#9095A1' }}
              />
              <Tooltip
                contentStyle={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  color: '#0F172A',
                }}
                labelFormatter={(label) => {
                  const maxStep = chartData[chartData.length - 1]?.step ?? 1;
                  const yearValue = (Number(label) / Math.max(1, maxStep)) * Math.max(1, investmentHorizon);
                  return `Year ${yearValue.toFixed(1)}`;
                }}
                formatter={(value, name) => [formatCurrency(Number(value ?? 0)), String(name)]}
              />
              <Line type="monotone" dataKey="optimistic" name="Optimistic" stroke="#10b981" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="expected" name="Expected" stroke="#3b82f6" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="pessimistic" name="Pessimistic" stroke="#ef4444" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Projection chart will appear after simulation completes.
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-xl border border-gray-700/60 bg-gray-900/60 px-3 py-2">
        <div className="inline-flex items-center gap-2 text-lg font-medium text-blue-400">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
          <span>Expected</span>
        </div>
        <div className="inline-flex items-center gap-2 text-lg font-medium text-teal-400">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-400" />
          <span>Optimistic</span>
        </div>
        <div className="inline-flex items-center gap-2 text-lg font-medium text-red-400">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span>Pessimistic</span>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        X-axis is converted from simulation steps to years based on selected horizon ({investmentHorizon} years).
      </p>

      {monteCarlo ? (
        <>
          <div className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-3">
            <ScenarioCard title="Optimistic" summary={monteCarlo.pathSummaries.optimisticScenario} />
            <ScenarioCard title="Expected" summary={monteCarlo.pathSummaries.expectedScenario} />
            <ScenarioCard title="Pessimistic" summary={monteCarlo.pathSummaries.pessimisticScenario} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-700/70 bg-gray-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Risk Indicator</p>
              <p className="mt-2 text-lg font-semibold text-red-300">
                Probability Of Shortfall: {formatPercent(monteCarlo.metadata.probabilityOfShortfall_pct)}
              </p>
              <p className="mt-1 text-xs text-gray-400">Higher value means a greater chance to end below target return.</p>
            </div>

            <div className="rounded-xl border border-gray-700/70 bg-gray-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Inflation Context</p>
              <p className="mt-2 text-lg font-semibold text-blue-300">
                Inflation Rate: {formatPercent(monteCarlo.metadata.inflationRate)}
              </p>
              <p className="mt-1 text-xs text-gray-400">Returns above this level represent stronger real purchasing power growth.</p>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
