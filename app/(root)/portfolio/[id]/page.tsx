import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getSavedPortfolioById } from '@/lib/actions/cloudflare.actions';

interface PortfolioDetailPageProps {
  params: Promise<{ id: string }>;
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

  return (
    <section className="space-y-6">
      <Link
        href="/portfolio"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-yellow-400 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Portfolio
      </Link>

      <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-800/70 to-gray-900/80 p-6">
        <h1 className="text-3xl font-bold text-white">{portfolio.name}</h1>
        <p className="mt-2 text-gray-400">{portfolio.tickers.length} assets</p>
        <p className="mt-1 text-gray-400">
          Risk Level: <span className={`font-semibold ${riskClass}`}>{riskLabel}</span>
        </p>

        <div className="mt-6 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-800/80">
              <tr>
                <th className="px-4 py-3 text-sm text-gray-400">Ticker</th>
                <th className="px-4 py-3 text-sm text-gray-400">Weight</th>
                <th className="px-4 py-3 text-sm text-gray-400">Allocated Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(portfolio.allocations || {}).map(([ticker, allocation]) => (
                <tr key={ticker} className="border-t border-gray-700">
                  <td className="px-4 py-3 text-white">{ticker}</td>
                  <td className="px-4 py-3 text-gray-300">{(allocation.weight * 100).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-gray-300">${allocation.allocatedAmount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
