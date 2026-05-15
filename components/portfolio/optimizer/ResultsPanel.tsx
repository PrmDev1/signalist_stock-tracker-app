"use client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ResultsPanelProps } from './types';
import { formatPercentWithoutRounding } from '@/lib/formatters';
import BacktestChart from '@/components/portfolio/BacktestChart';
import ModelAccuracyCard from '@/components/portfolio/ModelAccuracyCard';
import RiskRewardCard from '@/components/portfolio/RiskRewardCard';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6666'];

interface ChartData {
  name: string;
  value: number;
}

function getRiskLevelBadge(level?: string | null): { label: string; className: string } {
  const normalized = String(level ?? '').trim().toUpperCase();

  if (normalized === 'LOW') {
    return {
      label: 'LOW RISK',
      className: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
    };
  }

  if (normalized === 'HIGH') {
    return {
      label: 'HIGH RISK',
      className: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
    };
  }

  return {
    label: 'MEDIUM RISK',
    className: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  };
}

function formatChartData(allocations: Record<string, { weight: number; allocatedAmount: number }>): ChartData[] {
  return Object.keys(allocations).map((ticker) => ({
    name: ticker,
    value: allocations[ticker].allocatedAmount,
  }));
}

export default function ResultsPanel({
  status,
  errorMsg,
  result,
  modelUsed,
  backtestAndMetrics,
  educationalInsights,
  riskRewardProfile,
  portfolioName,
  setPortfolioName,
  onSavePortfolio,
  isSaving,
  canCreatePortfolio,
}: ResultsPanelProps) {
  const expectedReturnPercent = result ? result.expectedReturn * 100 : 0;
  const volatilityPercent = result ? result.volatility * 100 : 0;
  const riskBadge = getRiskLevelBadge(result?.riskLevel);

  return (
    <>
      {status === 'FAILED' && errorMsg && (
        <section className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">
          <p className="font-semibold">เกิดข้อผิดพลาดในการจัดพอร์ต</p>
          <p className="text-sm">{errorMsg}</p>
        </section>
      )}

      {status === 'PROCESSING' && (
        <section className="rounded-[28px] border border-blue-500/30 bg-blue-600/10 px-4 py-6 text-center text-gray-100">
          <p className="text-lg font-semibold">RoboAdvisor is analyzing your portfolio...</p>
        </section>
      )}

      {status === 'READY' && result && (
        <section className="space-y-6 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,35,0.96),rgba(11,15,24,0.98))] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.25)] sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">RoboAdvisor results</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${riskBadge.className}`}>
                {riskBadge.label}
              </span>
              {modelUsed && (
                <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
                  โมเดล: {modelUsed.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-teal-400/30 bg-teal-400/10 p-4">
              <p className="text-xs uppercase tracking-wide text-teal-400">ผลตอบแทนคาดหวังต่อปี</p>
              <p className="mt-1 text-2xl font-bold text-teal-400">{formatPercentWithoutRounding(expectedReturnPercent)}</p>
            </div>
            <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4">
              <p className="text-xs uppercase tracking-wide text-yellow-400">ความผันผวน (ความเสี่ยง)</p>
              <p className="mt-1 text-2xl font-bold text-yellow-400">{formatPercentWithoutRounding(volatilityPercent)}</p>
            </div>
            <div className={`rounded-xl border p-4 ${riskBadge.className}`}>
              <p className="text-xs uppercase tracking-wide">Risk level</p>
              <p className="mt-1 text-2xl font-bold">{riskBadge.label}</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-gray-700 bg-gray-700/40 p-4">
            <h3 className="mb-3 text-base font-semibold text-white">สัดส่วนเงินลงทุน (USD)</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formatChartData(result.allocations)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  >
                    {formatChartData(result.allocations).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => (value != null ? `$${value.toLocaleString()}` : '$0')} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <BacktestChart backtestAndMetrics={backtestAndMetrics || undefined} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ModelAccuracyCard
              expectedMetrics={backtestAndMetrics?.expectedMetrics}
              realizedMetrics={backtestAndMetrics?.realizedMetrics}
              educationalInsights={educationalInsights}
            />
            <RiskRewardCard profile={riskRewardProfile || undefined} />
          </div>

          <div className="mt-6 space-y-2 md:hidden">
            {Object.keys(result.allocations).map((ticker) => (
              <article key={`${ticker}-mobile`} className="rounded-lg border border-gray-700 bg-gray-700/40 p-3">
                <p className="text-sm font-semibold text-white">{ticker}</p>
                <p className="mt-1 text-xs text-gray-300">สัดส่วน: {formatPercentWithoutRounding(result.allocations[ticker].weight * 100)}</p>
                <p className="text-xs text-gray-400">เงินลงทุน: ${result.allocations[ticker].allocatedAmount.toLocaleString()}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 hidden overflow-hidden rounded-xl border border-gray-700 md:block">
            <table className="w-full">
              <thead className="bg-gray-700/70">
                <tr className="text-left">
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-gray-400">Ticker</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-gray-400">สัดส่วน</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-gray-400">เงินลงทุน (USD)</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(result.allocations).map((ticker) => (
                  <tr key={ticker} className="border-t border-gray-700">
                    <td className="px-4 py-3 text-sm font-semibold text-white">{ticker}</td>
                    <td className="px-4 py-3 text-sm text-gray-200">{formatPercentWithoutRounding(result.allocations[ticker].weight * 100)}</td>
                    <td className="px-4 py-3 text-sm text-gray-200">${result.allocations[ticker].allocatedAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 border-t border-gray-700 pt-5">
            <h3 className="mb-3 text-lg font-semibold text-white">บันทึกพอร์ต</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-200">ชื่อพอร์ต</label>
                <input
                  type="text"
                  value={portfolioName}
                  onChange={(e) => setPortfolioName(e.target.value)}
                  placeholder="เช่น พอร์ตเติบโตระยะยาว"
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white outline-none placeholder:text-gray-500 focus:border-teal-400"
                />
              </div>
              <button
                onClick={onSavePortfolio}
                disabled={isSaving || !canCreatePortfolio}
                className="rounded-lg bg-teal-400 px-5 py-2.5 text-sm font-semibold text-gray-950 transition-colors hover:bg-teal-400/90 disabled:bg-gray-600 disabled:text-gray-300"
              >
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกพอร์ต'}
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
