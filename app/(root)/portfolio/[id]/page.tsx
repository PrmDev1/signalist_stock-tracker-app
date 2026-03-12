import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getSavedPortfolioById } from '@/lib/actions/cloudflare.actions';
import { getPortfolioTickers } from '@/lib/actions/portfolio.actions';
import PortfolioAllocationChart from '@/components/portfolio/PortfolioAllocationChart';
import MonteCarloProjection from '@/components/portfolio/MonteCarloProjection';

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
  const totalAllocatedAmount = holdings.reduce((sum, row) => sum + row.allocatedAmount, 0);
  const initialCapitalForSimulation =
    Number(portfolio.initialCapital || 0) > 0
      ? Number(portfolio.initialCapital)
      : Number(totalAllocatedAmount || 100000);
  const monthlyDcaForSimulation = Math.max(0, Number(portfolio.monthlyDca || 0));
  const targetYearsForSimulation = Math.min(20, Math.max(1, Number(portfolio.targetYears || 10)));
  const formattedDate = new Date(portfolio.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <section className="space-y-6">
      <Link
        href="/portfolio"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-yellow-400 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Portfolio
      </Link>

      <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-800/70 to-gray-900/80 p-6 shadow-xl">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white">{portfolio.name}</h1>
            <p className="mt-3 text-lg text-gray-300">{holdings.length} assets</p>
            <p className="mt-1 text-lg text-gray-300">
              Risk Level: <span className={`font-semibold ${riskClass}`}>{riskLabel}</span>
            </p>
            <p className="mt-1 text-lg text-gray-300">
              Expected Return: <span className="font-semibold text-teal-400">+{expectedReturnPercent.toFixed(2)}%</span>
            </p>
            <p className="mt-1 text-base text-gray-500">Last Updated: {formattedDate}</p>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
            <h3 className="mb-2 text-base font-semibold text-white">Portfolio Holdings</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="border-b border-gray-700 text-sm text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Ticker</th>
                    <th className="px-4 py-3">Company Name</th>
                    <th className="px-4 py-3">Exchange</th>
                    <th className="px-4 py-3">Sector</th>
                    <th className="px-4 py-3">Weight</th>
                    <th className="px-4 py-3">Allocated Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((row) => (
                    <tr key={row.ticker} className="border-b border-gray-800 last:border-0">
                      <td className="px-4 py-3 font-semibold text-white">{row.ticker}</td>
                      <td className="px-4 py-3 text-gray-200">{row.companyName}</td>
                      <td className="px-4 py-3 text-gray-300">{row.exchange}</td>
                      <td className="px-4 py-3 text-gray-300">{row.sector}</td>
                      <td className="px-4 py-3 text-gray-200">{row.weightPercent.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-gray-200">${row.allocatedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
            <h3 className="mb-2 text-base font-semibold text-white">Allocation Chart</h3>
            <PortfolioAllocationChart
              data={holdings.map((row) => ({
                ticker: row.ticker,
                companyName: row.companyName,
                sector: row.sector,
                weightPercent: row.weightPercent,
                allocatedAmount: row.allocatedAmount,
              }))}
            />
          </div>

          <MonteCarloProjection
            mvoId={portfolio.mvoId}
            initialCapital={initialCapitalForSimulation}
            monthlyDca={monthlyDcaForSimulation}
            investmentHorizon={targetYearsForSimulation}
          />
        </div>
      </div>
    </section>
  );
}
