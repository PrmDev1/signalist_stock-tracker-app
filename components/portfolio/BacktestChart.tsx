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
import type { BacktestAndMetrics } from "@/components/portfolio/analysis-types";
import InfoPopover from "@/components/portfolio/optimizer/InfoPopover";

interface BacktestChartProps {
  backtestAndMetrics?: BacktestAndMetrics | null;
  loading?: boolean;
}

interface BacktestChartPoint {
  date: string;
  portfolioValue: number;
  spyValue: number;
  bilValue: number;
}

function formatDateLabel(rawDate: string): string {
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return rawDate;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
  }).format(date);
}

function toChartData(backtest: BacktestAndMetrics): BacktestChartPoint[] {
  const { dates, portfolioValue, benchmarkValues } = backtest.timeSeries;
  const spy = benchmarkValues.SPY ?? [];
  const bil = benchmarkValues.BIL ?? [];

  const maxLength = Math.max(dates.length, portfolioValue.length, spy.length, bil.length);

  const rows: BacktestChartPoint[] = [];
  for (let index = 0; index < maxLength; index += 1) {
    rows.push({
      date: dates[index] ?? '',
      portfolioValue: portfolioValue[index] ?? portfolioValue[portfolioValue.length - 1] ?? 0,
      spyValue: spy[index] ?? spy[spy.length - 1] ?? 0,
      bilValue: bil[index] ?? bil[bil.length - 1] ?? 0,
    });
  }

  return rows;
}

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-4 sm:p-5">
      <div className="h-6 w-52 animate-pulse rounded bg-gray-700" />
      <div className="mt-2 h-4 w-72 animate-pulse rounded bg-gray-700" />
      <div className="mt-4 h-[320px] w-full animate-pulse rounded-xl bg-gray-700/70" />
    </div>
  );
}

export default function BacktestChart({ backtestAndMetrics, loading = false }: BacktestChartProps) {
  const chartData = useMemo(() => {
    if (!backtestAndMetrics) return [] as BacktestChartPoint[];
    return toChartData(backtestAndMetrics);
  }, [backtestAndMetrics]);

  const historicalMaxDrawdownPct = backtestAndMetrics?.realizedMetrics?.historicalMaxDrawdownPct;

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!backtestAndMetrics || chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-600 bg-gray-800/30 p-5 text-sm text-gray-300">
        ข้อมูล Backtest จะแสดงที่นี่เมื่อระบบมีข้อมูลผลจัดพอร์ตแล้ว
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800/60 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">กราฟย้อนหลัง (Backtest)</h3>
          <p className="mt-1 text-sm text-gray-400">เปรียบเทียบมูลค่าพอร์ตกับ SPY และ BIL ตามข้อมูลอดีต</p>
        </div>
        {typeof historicalMaxDrawdownPct === "number" && (
          <div className="flex items-start gap-2">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-right">
              <p className="text-xs text-red-300">Max Drawdown</p>
              <p className="mt-0.5 text-base font-semibold text-red-200">
                {historicalMaxDrawdownPct.toFixed(2)}%
              </p>
            </div>
            <InfoPopover
              title="Max Drawdown"
              description="ช่วงที่พอร์ตปรับตัวลงจากจุดสูงสุดมากที่สุดในอดีต"
            />
          </div>
        )}
      </div>

      <div className="h-[320px] w-full sm:h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              minTickGap={28}
              tickFormatter={formatDateLabel}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
              width={90}
            />
            <Tooltip
              formatter={(value, name) => [
                new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }).format(Number(value ?? 0)),
                name ?? "Value",
              ]}
              labelFormatter={(value) => {
                const dateLabel = String(value ?? "");
                const date = new Date(dateLabel);
                return Number.isNaN(date.getTime())
                  ? dateLabel
                  : new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date);
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
              dataKey="portfolioValue"
              stroke="#10b981"
              strokeWidth={2.4}
              dot={false}
              name="มูลค่าพอร์ต"
            />
            <Line type="monotone" dataKey="spyValue" stroke="#60a5fa" strokeWidth={2} dot={false} name="SPY" />
            <Line type="monotone" dataKey="bilValue" stroke="#93c5fd" strokeWidth={2} dot={false} name="BIL" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
