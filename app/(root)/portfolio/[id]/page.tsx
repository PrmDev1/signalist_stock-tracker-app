import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getSavedPortfolioById, getPortfolioExplainability } from '@/lib/actions/cloudflare.actions';
import { getPortfolioTickers } from '@/lib/actions/portfolio.actions';
import BacktestChart from '@/components/portfolio/BacktestChart';
import MonteCarloProjection from '@/components/portfolio/MonteCarloProjection';
import PortfolioAllocationChart from '@/components/portfolio/PortfolioAllocationChart';
import RiskRewardCard from '@/components/portfolio/RiskRewardCard';
import DashboardLayout from '@/components/portfolio/detail/DashboardLayout';
import TickerLogo from '@/components/portfolio/detail/TickerLogo';

interface PortfolioDetailPageProps {
  params: Promise<{ id: string }>;
}

interface HoldingRow {
  ticker: string;
  companyName: string;
  sector: string;
  exchange: string;
  weightPercent: number;
  allocatedAmount: number;
}

function truncateToTwo(value: number): number {
  return Math.trunc(value * 100) / 100;
}

export default async function PortfolioDetailPage({ params }: PortfolioDetailPageProps) {
  const { id } = await params;
  const response = await getSavedPortfolioById(id);

  if (!response.success || !response.portfolio) {
    notFound();
  }

  const portfolio = response.portfolio;
  const normalizedRiskLevel = portfolio.riskLevel.toLowerCase();
  const riskLabel = `${normalizedRiskLevel.charAt(0).toUpperCase()}${normalizedRiskLevel.slice(1)}`;
  const riskClass =
    normalizedRiskLevel === 'high'
      ? 'text-red-400'
      : normalizedRiskLevel === 'medium'
        ? 'text-yellow-400'
        : 'text-teal-400';

  const allocationEntries = Object.entries(portfolio.allocations || {});
  const sharpeRatio = Number.isFinite(Number((portfolio as any).sharpeRatio))
    ? Number((portfolio as any).sharpeRatio)
    : null;

  const metadataByTicker = new Map<
    string,
    {
      companyName: string;
      sector: string;
      exchange: string;
    }
  >();
  await Promise.all(
    allocationEntries.map(async ([ticker]) => {
      const upperTicker = ticker.trim().toUpperCase();
      try {
        const lookup = await getPortfolioTickers(1, 20, { search: upperTicker });
        const exactMatch = (lookup.tickers || []).find(
          (item) => String(item.ticker || '').trim().toUpperCase() === upperTicker
        );

        metadataByTicker.set(upperTicker, {
          companyName: exactMatch?.companyName || upperTicker,
          sector: exactMatch?.sector || 'Unknown',
          exchange: exactMatch?.primaryExchange || 'Unknown',
        });
      } catch {
        metadataByTicker.set(upperTicker, {
          companyName: upperTicker,
          sector: 'Unknown',
          exchange: 'Unknown',
        });
      }
    })
  );

  const holdings: HoldingRow[] = allocationEntries
    .map(([ticker, allocation]) => {
      const upperTicker = ticker.trim().toUpperCase();
      const meta = metadataByTicker.get(upperTicker);
      return {
        ticker: upperTicker,
        companyName: meta?.companyName || upperTicker,
        sector: meta?.sector || 'Unknown',
        exchange: meta?.exchange || 'Unknown',
        weightPercent: truncateToTwo((allocation.weight || 0) * 100),
        allocatedAmount: allocation.allocatedAmount || 0,
      };
    })
    .sort((a, b) => b.weightPercent - a.weightPercent);

  const expectedReturnPercent = truncateToTwo(portfolio.expectedReturn * 100);
  const volatilityPercent = truncateToTwo(portfolio.volatility * 100);
  const totalAllocatedAmount = holdings.reduce((sum, row) => sum + row.allocatedAmount, 0);
  const initialCapitalForSimulation =
    Number(portfolio.initialCapital || 0) > 0
      ? Number(portfolio.initialCapital)
      : Number(totalAllocatedAmount || 100000);
  const monthlyDcaForSimulation = Math.max(0, Number(portfolio.monthlyDca || 0));
  const targetYearsForSimulation = Math.min(20, Math.max(1, Number(portfolio.targetYears || 10)));
  const investedBreakdown = holdings.slice(0, 8).map((row, index) => {
    const palette = ['#4a7bff', '#8f66ff', '#ff52b9', '#ffb12b', '#22d3ee', '#34d399', '#f59e0b', '#ef4444'];

    return {
      label: row.ticker,
      percent: row.weightPercent,
      amount: row.allocatedAmount,
      color: palette[index % palette.length],
    };
  });
  // Fetch per-ticker explainability (expectedReturns + volatilityRisk) in parallel
  const explainability = portfolio.mvoId
    ? await getPortfolioExplainability(portfolio.mvoId, initialCapitalForSimulation)
    : null;

  const formattedDate = new Date(portfolio.updatedAt).toLocaleDateString('th-TH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <DashboardLayout>
      <div className="min-w-0 space-y-4 overflow-x-hidden">
        <div className="flex flex-col gap-3 rounded-[24px] border border-[#1f2a3d] bg-[#070b13] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            กลับหน้าพอร์ตโฟลิโอ
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded border border-[#2b3b54] bg-[#0b111d] px-2 py-1 text-gray-300">{portfolio.name}</span>
            <span className="rounded border border-[#2b3b54] bg-[#0b111d] px-2 py-1 text-gray-400">{holdings.length} สินทรัพย์</span>
            <span className={`rounded border border-[#2b3b54] bg-[#0b111d] px-2 py-1 ${riskClass}`}>ความเสี่ยง {riskLabel}</span>
            {sharpeRatio !== null ? (
              <span className="rounded border border-[#2b3b54] bg-[#0b111d] px-2 py-1 text-[#9dc4ff]">Sharpe {sharpeRatio.toFixed(2)}</span>
            ) : null}
            <span className="rounded border border-[#2b3b54] bg-[#0b111d] px-2 py-1 text-gray-500">อัปเดต {formattedDate}</span>
          </div>
        </div>

        <MonteCarloProjection
          mvoId={portfolio.mvoId}
          initialCapital={initialCapitalForSimulation}
          monthlyDca={monthlyDcaForSimulation}
          investmentHorizon={targetYearsForSimulation}
          investedBreakdown={investedBreakdown}
        />

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 rounded-[24px] border border-[#1f2a3d] bg-[#070b13] p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">สินทรัพย์ในพอร์ตโฟลิโอ</h3>
              <div className="inline-flex flex-wrap items-center gap-3 text-xs text-right">
                <span className="text-gray-400">ผลตอบแทนคาด <span className="ml-1 text-[#00e7c2]">+{expectedReturnPercent.toFixed(2)}%</span></span>
                <span className="text-gray-400">ความผันผวน <span className="ml-1 text-[#ffbf66]">{volatilityPercent.toFixed(2)}%</span></span>
                <span className="text-gray-400">เงินทุน <span className="ml-1 text-white">${totalAllocatedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left xl:min-w-0">
                <thead className="border-b border-[#1f2a3d] text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2.5">หุ้น</th>
                    <th className="px-3 py-2.5">ชื่อบริษัท</th>
                    <th className="px-3 py-2.5">ตลาด</th>
                    <th className="px-3 py-2.5">หมวดหุ้น</th>
                    <th className="px-3 py-2.5">น้ำหนัก</th>
                    <th className="px-3 py-2.5">เงินที่จัดสรร</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((row) => (
                    <tr key={row.ticker} className="border-b border-[#141c2b] text-sm last:border-0">
                      <td className="px-3 py-3 font-semibold text-white">
                        <div className="inline-flex items-center gap-2.5">
                          <TickerLogo ticker={row.ticker} size={30} />
                          <span className="text-base font-semibold tracking-wide">{row.ticker}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[15px] text-gray-200">{row.companyName}</td>
                      <td className="px-3 py-3 text-[15px] text-gray-300">{row.exchange}</td>
                      <td className="px-3 py-3 text-[15px] text-gray-300">{row.sector}</td>
                      <td className="px-3 py-3 text-[15px] font-medium text-gray-100">{row.weightPercent.toFixed(2)}%</td>
                      <td className="px-3 py-3 text-[15px] font-medium text-gray-100">${row.allocatedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="min-w-0 rounded-[24px] border border-[#1f2a3d] bg-[#070b13] p-3 sm:p-4">
            <h3 className="mb-2 text-sm font-semibold text-white">สัดส่วนการลงทุน</h3>
            <PortfolioAllocationChart
              expectedReturns={explainability?.expectedReturns}
              volatilityRisk={explainability?.volatilityRisk}
              data={holdings.map((row) => ({
                ticker: row.ticker,
                companyName: row.companyName,
                sector: row.sector,
                weightPercent: row.weightPercent,
                allocatedAmount: row.allocatedAmount,
              }))}
            />
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <BacktestChart backtestAndMetrics={portfolio.backtestAndMetrics} />
          <RiskRewardCard profile={portfolio.riskRewardProfile} />
        </div>
      </div>
    </DashboardLayout>
  );
}
