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
  optimisticPath?: number[];
  expectedPath?: number[];
  pessimisticPath?: number[];
  spyExpectedPath?: number[];
  bilExpectedPath?: number[];
}

export interface ScenarioSummary {
  finalValue: number;
  totalInvested: number;
  netProfitOrLoss: number;
  isProfit: boolean;
  worstDropAlongTheWay_pct?: number;
  worstDropAlongTheWayPct?: number;
}

export interface MonteCarloResult {
  chartPaths: MonteCarloPaths;
  pathSummaries: {
    optimisticScenario?: ScenarioSummary;
    expectedScenario: ScenarioSummary;
    pessimisticScenario: ScenarioSummary;
  };
  metadata: {
    inflationRate: number;
    probabilityOfShortfall_pct?: number;
    probabilityOfShortfallPct?: number;
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
  investedBreakdown?: Array<{
    label: string;
    percent: number;
    amount: number;
    color: string;
  }>;
}

type LoadState = 'idle' | 'triggering' | 'processing' | 'completed' | 'error';

interface ChartPoint {
  step: number;
  year: number;
  expected: number;
  pessimistic: number;
  spyExpected: number;
  bilExpected: number;
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

function readWorstDrop(summary: ScenarioSummary): number {
  if (typeof summary.worstDropAlongTheWayPct === 'number') {
    return summary.worstDropAlongTheWayPct;
  }

  return summary.worstDropAlongTheWay_pct ?? 0;
}

async function parseJsonOrThrow<T>(res: Response, defaultErrorMessage: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    const bodyText = await res.text();
    throw new Error(bodyText || defaultErrorMessage);
  }

  return (await res.json()) as T;
}

export default function MonteCarloProjection({
  mvoId,
  initialCapital = 100000,
  monthlyDca = 0,
  investmentHorizon = 10,
  investedBreakdown = [],
}: MonteCarloProjectionProps) {
  const currentCalendarYear = new Date().getFullYear();
  const selectedYears = Math.min(20, Math.max(1, Math.round(investmentHorizon)));
  const useMonthAxis = selectedYears === 1;
  const [state, setState] = useState<LoadState>('idle');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [monteCarlo, setMonteCarlo] = useState<MonteCarloResult | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<'expected' | 'worst'>('expected');

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

    const expectedPath = monteCarlo.chartPaths.expectedPath ?? [];
    const pessimisticPath = monteCarlo.chartPaths.pessimisticPath ?? [];
    const spyExpectedPath = monteCarlo.chartPaths.spyExpectedPath ?? [];
    const bilExpectedPath = monteCarlo.chartPaths.bilExpectedPath ?? [];
    const maxLength = Math.max(
      expectedPath.length,
      pessimisticPath.length,
      spyExpectedPath.length,
      bilExpectedPath.length
    );
    const safeHorizon = Math.max(1, investmentHorizon);
    const pointsPerYear = maxLength > 1 ? (maxLength - 1) / safeHorizon : 1;

    const rows: ChartPoint[] = [];

    for (let index = 0; index < maxLength; index += 1) {
      const yearValue = pointsPerYear > 0 ? index / pointsPerYear : 0;
      rows.push({
        step: index,
        year: yearValue,
        expected: expectedPath[index] ?? expectedPath[expectedPath.length - 1] ?? 0,
        pessimistic: pessimisticPath[index] ?? pessimisticPath[pessimisticPath.length - 1] ?? 0,
        spyExpected: spyExpectedPath[index] ?? spyExpectedPath[spyExpectedPath.length - 1] ?? 0,
        bilExpected: bilExpectedPath[index] ?? bilExpectedPath[bilExpectedPath.length - 1] ?? 0,
      });
    }

    return rows;
  }, [investmentHorizon, monteCarlo]);

  const xTicks = useMemo(() => {
    if (!chartData.length) return [] as number[];

    const maxStep = chartData[chartData.length - 1]?.step ?? 0;
    if (useMonthAxis) {
      const ticks: number[] = [];
      for (let month = 0; month <= 12; month += 1) {
        ticks.push(Math.round((month / 12) * maxStep));
      }
      return ticks;
    }

    const safeHorizon = Math.max(1, investmentHorizon);
    const pointsPerYear = maxStep > 0 ? maxStep / safeHorizon : 1;
    const ticks: number[] = [];

    for (let year = 0; year <= safeHorizon; year += 1) {
      ticks.push(Math.round(year * pointsPerYear));
    }

    return ticks;
  }, [chartData, investmentHorizon, useMonthAxis]);

  const overviewStats = useMemo(() => {
    if (!monteCarlo) return null;

    const expected = monteCarlo.pathSummaries.expectedScenario;
    const pessimistic = monteCarlo.pathSummaries.pessimisticScenario;
    const spyFinal = (monteCarlo.chartPaths.spyExpectedPath ?? []).at(-1) ?? 0;
    const bilFinal = (monteCarlo.chartPaths.bilExpectedPath ?? []).at(-1) ?? 0;

    return {
      expectedFinal: expected.finalValue,
      expectedProfit: expected.netProfitOrLoss,
      worstFinal: pessimistic.finalValue,
      spyFinal,
      bilFinal,
    };
  }, [monteCarlo]);

  const selectedSummary = useMemo(() => {
    if (!monteCarlo) return null;

    return selectedScenario === 'expected'
      ? monteCarlo.pathSummaries.expectedScenario
      : monteCarlo.pathSummaries.pessimisticScenario;
  }, [monteCarlo, selectedScenario]);

  const selectedScenarioLabel =
    selectedScenario === 'expected' ? 'สถานการณ์ที่คาดหวัง' : 'สถานการณ์แย่ที่สุด';

  return (
    <section className="grid grid-cols-1 gap-3 xl:grid-cols-[390px_1fr]">
      <aside className="rounded-xl border border-[#1f2a3d] bg-[#070b13] p-5 xl:min-h-[760px]">
        <p className="text-[14px] uppercase tracking-[0.16em] text-gray-300">มูลค่าพอร์ตโฟลิโอ</p>
        <p className="mt-3 max-w-full break-all text-[clamp(2.2rem,7.2vw,3.9rem)] font-bold leading-[0.92] tracking-[-0.02em] text-white">
          {selectedSummary ? formatCurrency(selectedSummary.finalValue) : '--'}
        </p>

        {selectedSummary ? (
          <p className={`mt-2 text-base ${selectedSummary.netProfitOrLoss >= 0 ? 'text-[#00e7c2]' : 'text-[#ff6d6d]'}`}>
            {selectedSummary.netProfitOrLoss >= 0 ? '↑' : '↓'}
            <span className="ml-1.5">{formatPercent(Math.abs((selectedSummary.netProfitOrLoss / Math.max(1, selectedSummary.totalInvested)) * 100))} ROIC</span>
            <span className="ml-2.5 text-sm text-gray-400">
              {selectedSummary.netProfitOrLoss >= 0 ? '+' : '-'}
              {formatPercent(
                Math.abs(
                  (Math.pow(
                    Math.max(1, selectedSummary.finalValue) / Math.max(1, selectedSummary.totalInvested),
                    1 / Math.max(1, selectedYears)
                  ) - 1) *
                    100
                )
              )}{' '}
              CAGR est.
            </span>
          </p>
        ) : null}

        <div className="mt-4 inline-flex rounded-lg border border-[#2b3b54] bg-[#0b111d] p-1.5 text-base">
          <button
            type="button"
            onClick={() => setSelectedScenario('expected')}
            className={`rounded-md px-3 py-1.5 ${
              selectedScenario === 'expected' ? 'bg-[#13233c] text-[#8bc8ff]' : 'text-gray-400'
            }`}
          >
            คาดหวัง
          </button>
          <button
            type="button"
            onClick={() => setSelectedScenario('worst')}
            className={`rounded-md px-3 py-1.5 ${
              selectedScenario === 'worst' ? 'bg-[#2a1820] text-[#ff8e8e]' : 'text-gray-400'
            }`}
          >
            แย่ที่สุด
          </button>
        </div>

        {selectedSummary ? (
          <div className="mt-4 rounded-xl border border-[#1f2a3d] bg-[#0a1019] p-4 text-base">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xl font-semibold text-gray-100">{selectedScenarioLabel}</p>
              <span className="rounded border border-[#2b3b54] px-2 py-1 text-xs text-gray-400">{selectedYears}Y</span>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">มูลค่าสุดท้าย</span>
                <span className="font-semibold text-white">{formatCurrency(selectedSummary.finalValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">เงินลงทุนทั้งหมด</span>
                <span className="font-medium text-gray-200">{formatCurrency(selectedSummary.totalInvested)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">กำไร / ขาดทุนสุทธิ</span>
                <span className={`font-semibold ${selectedSummary.isProfit ? 'text-[#00e7c2]' : 'text-[#ff5b5b]'}`}>
                  {selectedSummary.isProfit ? '+' : '-'}{formatCurrency(Math.abs(selectedSummary.netProfitOrLoss))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">การดึงกลับสูงสุด</span>
                <span className="font-semibold text-[#ff5b5b]">-{formatPercent(Math.abs(readWorstDrop(selectedSummary)))}</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          <p className="text-xl text-gray-200">การกระจายการลงทุน</p>
          <div className="mt-3 flex h-4 overflow-hidden rounded-sm border border-[#2b3b54]">
            {investedBreakdown.map((item) => (
              <span
                key={`bar-${item.label}`}
                style={{ width: `${Math.max(3, item.percent)}%`, backgroundColor: item.color }}
              />
            ))}
          </div>

          <div className="mt-4 space-y-2.5">
            {investedBreakdown.map((item) => (
              <div key={`row-${item.label}`} className="flex items-center justify-between text-lg">
                <div className="inline-flex items-center gap-2.5">
                  <span className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-300">{item.label}</span>
                  <span className="rounded bg-[#111f37] px-1.5 py-0.5 text-sm text-[#7db8ff]">{item.percent.toFixed(0)}%</span>
                </div>
                <span className="text-gray-300">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="rounded-xl border border-[#1f2a3d] bg-[#070b13] p-3">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500">วิเคราะห์พอร์ตโฟลิโอ</p>
            <h3 className="text-3xl font-semibold text-white sm:text-4xl">คาดการณ์การลงทุน</h3>
            <p className="text-sm text-gray-400">Monte Carlo Simulation ({selectedYears} ปี)</p>
          </div>

          <span className="rounded border border-[#2b3b54] bg-[#0e1726] px-2 py-1 text-[10px] text-gray-300">ทำงานอัตโนมัติ</span>
        </div>

      {overviewStats ? (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[#1f2a3d] bg-[#070b13] p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-gray-500">มูลค่าสุดท้าย (กรณีคาดหวัง)</p>
            <p className="mt-1 text-2xl font-semibold text-white">{formatCurrency(overviewStats.expectedFinal)}</p>
          </div>
          <div className="rounded-lg border border-[#1f2a3d] bg-[#070b13] p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-gray-500">กำไร/ขาดทุนสุทธิ (คาดหวัง)</p>
            <p className={`mt-1 text-2xl font-semibold ${overviewStats.expectedProfit >= 0 ? 'text-[#00e7c2]' : 'text-[#ff5b5b]'}`}>
              {overviewStats.expectedProfit >= 0 ? '+' : '-'}{formatCurrency(Math.abs(overviewStats.expectedProfit))}
            </p>
          </div>
          <div className="rounded-lg border border-[#1f2a3d] bg-[#070b13] p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-gray-500">มูลค่าสุดท้าย (กรณีแย่สุด)</p>
            <p className="mt-1 text-2xl font-semibold text-[#ff5b5b]">{formatCurrency(overviewStats.worstFinal)}</p>
          </div>
          <div className="rounded-lg border border-[#1f2a3d] bg-[#070b13] p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-gray-500">เปรียบเทียบ SPY / BIL</p>
            <p className="mt-1 text-xl font-semibold text-[#5ea6ff]">SPY: {formatCurrency(overviewStats.spyFinal)}</p>
            <p className="mt-0.5 text-xl font-semibold text-[#97c9ff]">BIL: {formatCurrency(overviewStats.bilFinal)}</p>
          </div>
        </div>
      ) : null}

      {(state === 'triggering' || state === 'processing') && (
        <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <p className="text-sm font-medium text-blue-200">กำลังสร้าง Monte Carlo Projection...</p>
          <p className="mt-1 text-xs text-blue-100/80">ระบบกำลังจำลองสถานการณ์หลายพันครั้ง...</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-blue-950/60">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-400" />
          </div>
          {message ? <p className="mt-3 text-xs text-blue-100/80">{message}</p> : null}
        </div>
      )}

      {error ? (
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="h-[430px] w-full rounded-lg border border-[#1f2a3d] bg-[#02050c] p-2 sm:h-[520px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 16 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1f2a3d" />
              <XAxis
                dataKey="step"
                type="number"
                domain={[0, 'dataMax']}
                ticks={xTicks}
                tick={{ fill: '#6e7f99', fontSize: 10 }}
                axisLine={{ stroke: '#1f2a3d' }}
                tickLine={false}
                tickFormatter={(step) => {
                  const maxStep = chartData[chartData.length - 1]?.step ?? 1;
                  if (useMonthAxis) {
                    const monthValue = (Number(step) / Math.max(1, maxStep)) * 12;
                    return `${Math.round(monthValue)}`;
                  }
                  const yearValue = (Number(step) / Math.max(1, maxStep)) * Math.max(1, investmentHorizon);
                  return `${currentCalendarYear + Math.round(yearValue)}`;
                }}
              label={{ value: useMonthAxis ? 'เดือน' : 'ปี ค.ศ.', position: 'insideBottom', offset: -8, fill: '#6e7f99' }}
              />
              <YAxis
                tick={{ fill: '#6e7f99', fontSize: 10 }}
                axisLine={{ stroke: '#1f2a3d' }}
                tickLine={false}
                tickFormatter={(value) => formatCurrency(Number(value))}
                width={110}
              label={{ value: 'มูลค่าพอร์ต ($)', angle: -90, position: 'insideLeft', fill: '#6e7f99' }}
              />
              <Tooltip
                contentStyle={{
                  background: '#0f1522',
                  border: '1px solid #33425a',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                }}
                labelFormatter={(label) => {
                  const maxStep = chartData[chartData.length - 1]?.step ?? 1;
                  if (useMonthAxis) {
                    const monthValue = (Number(label) / Math.max(1, maxStep)) * 12;
                    return `เดือนที่ ${monthValue.toFixed(1)}`;
                  }
                  const yearValue = (Number(label) / Math.max(1, maxStep)) * Math.max(1, investmentHorizon);
                  return `${currentCalendarYear + Math.round(yearValue)}`;
                }}
                formatter={(value, name) => [formatCurrency(Number(value ?? 0)), String(name)]}
              />
              <Line type="monotone" dataKey="expected" name="พอร์ตคาดหวัง" stroke="#00e7c2" strokeWidth={3} dot={false} />
              <Line
                type="monotone"
                dataKey="pessimistic"
                name="กรณีแย่ที่สุด"
                stroke="#ff5b5b"
                strokeWidth={2.4}
                dot={false}
                strokeDasharray="5 5"
              />
              <Line type="monotone" dataKey="spyExpected" name="SPY" stroke="#5ea6ff" strokeWidth={2.1} dot={false} />
              <Line type="monotone" dataKey="bilExpected" name="BIL (เงินฝาก)" stroke="#97c9ff" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            กราฟคาดการณ์จะแสดงหลังการจำลองเสร็จสิ้น
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-md border border-[#1f2a3d] bg-[#050b16] px-3 py-2">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-[#00e7c2]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#00e7c2]" />
          <span>พอร์ตคาดหวัง</span>
        </div>
        <div className="inline-flex items-center gap-2 text-sm font-medium text-[#ff5b5b]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5b5b]" />
          <span>กรณีแย่ที่สุด</span>
        </div>
        <div className="inline-flex items-center gap-2 text-sm font-medium text-[#5ea6ff]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#5ea6ff]" />
          <span>SPY</span>
        </div>
        <div className="inline-flex items-center gap-2 text-sm font-medium text-[#97c9ff]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#97c9ff]" />
          <span>BIL (เงินฝาก)</span>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        แกน X แสดงปี ค.ศ. จากข้อมูลจำลอง ({selectedYears} {selectedYears === 1 ? 'ปี' : 'ปี'}) เริ่มต้น ค.ศ. {currentCalendarYear}
      </p>

      </div>
    </section>
  );
}
