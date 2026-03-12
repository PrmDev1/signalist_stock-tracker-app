"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonteCarloResult, PathSummary } from "@/components/portfolio/analysis-types";

interface MonteCarloChartProps {
  data?: MonteCarloResult | null;
  investmentHorizon: number;
  loading?: boolean;
  summaryScenario?: "expectedScenario" | "pessimisticScenario";
}

interface MonteCarloPoint {
  step: number;
  year: number;
  portfolioExpected: number;
  portfolioPessimistic: number;
  spyExpected: number;
  bilExpected: number;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function toChartData(result: MonteCarloResult, investmentHorizon: number): MonteCarloPoint[] {
  const { expectedPath, pessimisticPath, spyExpectedPath, bilExpectedPath } = result.chartPaths;
  const maxLength = Math.max(
    expectedPath.length,
    pessimisticPath.length,
    spyExpectedPath.length,
    bilExpectedPath.length
  );

  const safeHorizon = Math.max(1, investmentHorizon);
  const pointsPerYear = maxLength > 1 ? (maxLength - 1) / safeHorizon : 1;

  const rows: MonteCarloPoint[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    rows.push({
      step: index,
      year: index / pointsPerYear,
      portfolioExpected: expectedPath[index] ?? expectedPath[expectedPath.length - 1] ?? 0,
      portfolioPessimistic: pessimisticPath[index] ?? pessimisticPath[pessimisticPath.length - 1] ?? 0,
      spyExpected: spyExpectedPath[index] ?? spyExpectedPath[spyExpectedPath.length - 1] ?? 0,
      bilExpected: bilExpectedPath[index] ?? bilExpectedPath[bilExpectedPath.length - 1] ?? 0,
    });
  }

  return rows;
}

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-4 sm:p-5">
      <div className="h-6 w-56 animate-pulse rounded bg-gray-700" />
      <div className="mt-2 h-4 w-72 animate-pulse rounded bg-gray-700" />
      <div className="mt-4 h-[320px] w-full animate-pulse rounded-xl bg-gray-700/70" />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="h-20 animate-pulse rounded-xl bg-gray-700/70" />
        <div className="h-20 animate-pulse rounded-xl bg-gray-700/70" />
        <div className="h-20 animate-pulse rounded-xl bg-gray-700/70" />
      </div>
    </div>
  );
}

function SummaryCard({ title, value, tone }: { title: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-400">{title}</p>
      <p className={`mt-1 text-lg font-semibold ${tone ?? "text-white"}`}>{value}</p>
    </div>
  );
}

export default function MonteCarloChart({
  data,
  investmentHorizon,
  loading = false,
  summaryScenario = "expectedScenario",
}: MonteCarloChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [] as MonteCarloPoint[];
    return toChartData(data, investmentHorizon);
  }, [data, investmentHorizon]);

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

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!data || chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-600 bg-gray-800/30 p-5 text-sm text-gray-300">
        กดเริ่มจำลองเพื่อแสดงกราฟคาดการณ์ Monte Carlo
      </div>
    );
  }

  const summary: PathSummary = data.pathSummaries[summaryScenario];

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800/60 p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">คาดการณ์มูลค่าพอร์ตด้วย Monte Carlo</h3>
        <p className="mt-1 text-sm text-gray-400">เปรียบเทียบพอร์ตกับ SPY และ BIL ทั้งกรณีคาดหวังและกรณีแย่ที่สุด</p>
      </div>

      <div className="h-[320px] w-full sm:h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="step"
              ticks={xTicks}
              stroke="#9ca3af"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickFormatter={(value) => {
                const maxStep = chartData[chartData.length - 1]?.step ?? 1;
                const year = (Number(value) / maxStep) * Math.max(1, investmentHorizon);
                return `${Math.round(year)}y`;
              }}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
              width={90}
            />
            <Tooltip
              formatter={(value, name) => [formatUsd(Number(value ?? 0)), name ?? "Value"]}
              labelFormatter={(value) => {
                const maxStep = chartData[chartData.length - 1]?.step ?? 1;
                const year = (Number(value) / maxStep) * Math.max(1, investmentHorizon);
                return `ปีที่ ${year.toFixed(1)}`;
              }}
              contentStyle={{
                backgroundColor: "#111827",
                border: "1px solid #374151",
                borderRadius: "12px",
                color: "#e5e7eb",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />

            <Line
              type="monotone"
              dataKey="portfolioExpected"
              stroke="#10b981"
              strokeWidth={2.4}
              dot={false}
              name="พอร์ต (คาดหวัง P50)"
            />
            <Line
              type="monotone"
              dataKey="portfolioPessimistic"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 4"
              name="พอร์ต (แย่ที่สุด P2.5)"
            />
            <Line
              type="monotone"
              dataKey="spyExpected"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              name="SPY"
            />
            <Line
              type="monotone"
              dataKey="bilExpected"
              stroke="#93c5fd"
              strokeWidth={2}
              dot={false}
              name="BIL (เทียบเงินฝาก)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard title="มูลค่าปลายทาง" value={formatUsd(summary.finalValue)} tone="text-emerald-300" />
        <SummaryCard title="เงินลงทุนรวม" value={formatUsd(summary.totalInvested)} />
        <SummaryCard
          title="จุดลดลงสูงสุด %"
          value={formatPercent(summary.worstDropAlongTheWayPct)}
          tone="text-orange-300"
        />
      </div>

      <p className="mt-3 text-xs text-gray-400">
        โอกาสที่ผลลัพธ์ต่ำกว่าเป้า: <span className="font-semibold text-gray-200">{formatPercent(data.metadata.probabilityOfShortfallPct)}</span>
      </p>
    </section>
  );
}
