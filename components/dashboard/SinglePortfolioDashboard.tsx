'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BarChart3, FolderOpen, Wallet } from 'lucide-react';
import type { DashboardPortfolioOption, SelectedDashboardPortfolio } from '@/components/dashboard/single-portfolio-types';
import PortfolioOverviewPanels from '@/components/dashboard/PortfolioOverviewPanels';
import MonteCarloProjection, { type MonteCarloResult } from '@/components/portfolio/MonteCarloProjection';
import TotalProfitComparisonChart from '@/components/portfolio/TotalProfitComparisonChart';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SinglePortfolioDashboardProps {
  portfolios: DashboardPortfolioOption[];
  selectedPortfolioId?: string;
  selectedPortfolio?: SelectedDashboardPortfolio | null;
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

export default function SinglePortfolioDashboard({
  portfolios,
  selectedPortfolioId,
  selectedPortfolio,
}: SinglePortfolioDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [monteCarloResult, setMonteCarloResult] = React.useState<MonteCarloResult | null>(null);

  React.useEffect(() => {
    setMonteCarloResult(null);
  }, [selectedPortfolioId]);

  const handleSelectPortfolio = (portfolioId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('portfolioId', portfolioId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const clearSelection = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('portfolioId');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  if (portfolios.length === 0) {
    return (
      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,35,0.96),rgba(12,15,25,0.96))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
        <p className="text-xs uppercase tracking-[0.24em] text-[#7db8ff]">Dashboard</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">No portfolios available</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
          Save a portfolio first, then return here to turn the dashboard into a single-portfolio command view.
        </p>
        <div className="mt-6">
          <Button asChild className="rounded-2xl bg-[#6f5cff] px-4 py-5 text-sm font-semibold text-white hover:bg-[#5d4eed]">
            <Link href="/portfolio">Create a portfolio</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)]">
        <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(111,92,255,0.22),transparent_28%),linear-gradient(180deg,rgba(18,22,35,0.96),rgba(12,15,25,0.96))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
          <p className="text-xs uppercase tracking-[0.24em] text-[#7db8ff]">Portfolio Dashboard</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white">Single Portfolio Summary</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                Select one saved portfolio and use this page as the high-level dashboard for value, simulations, and benchmark profit comparison.
              </p>
            </div>

            <div className="flex w-full max-w-[360px] flex-col gap-3">
              <Select value={selectedPortfolioId} onValueChange={handleSelectPortfolio}>
                <SelectTrigger className="h-10 w-full rounded-2xl border-white/10 bg-[#0b111d] px-4 text-left text-sm text-white">
                  <SelectValue placeholder="Select Portfolio" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#0b111d] text-white">
                  {portfolios.map((portfolio) => (
                    <SelectItem key={portfolio.id} value={portfolio.id} className="text-white focus:bg-white/10 focus:text-white">
                      {portfolio.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedPortfolioId ? (
                <Button type="button" variant="outline" onClick={clearSelection} className="rounded-2xl border-white/10 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white">
                  Clear selection
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[24px] border border-white/10 bg-[#070b13] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#14192a] text-[#7db8ff]">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Selection mode</p>
                <p className="text-lg font-semibold text-white">One active portfolio</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-5 text-gray-400">
              The dashboard no longer stacks widgets. One saved portfolio drives every summary card and chart on this page.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[#070b13] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#14192a] text-[#7db8ff]">
                <FolderOpen className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Available portfolios</p>
                <p className="text-lg font-semibold text-white">{portfolios.length}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-5 text-gray-400">
              Choose another portfolio at any time from the selector to refresh the dashboard context.
            </p>
          </div>
        </div>
      </section>

      {!selectedPortfolio ? (
        <section className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#14192a] text-[#7db8ff]">
            <BarChart3 className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">Select a portfolio for the dashboard</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Pick one saved portfolio from the selector above to load its portfolio value summary, Monte Carlo simulation, and benchmark profit comparison.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Selected Portfolio</p>
              <p className="mt-2 text-xl font-semibold text-white">{selectedPortfolio.name}</p>
              <p className="mt-2 text-sm text-gray-500">{selectedPortfolio.tickersCount} holdings</p>
            </div>
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Expected Return</p>
              <p className="mt-2 text-xl font-semibold text-[#35d27d]">{formatPercent(selectedPortfolio.expectedReturnPercent)}</p>
              <p className="mt-2 text-sm text-gray-500">Saved optimization output</p>
            </div>
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Volatility</p>
              <p className="mt-2 text-xl font-semibold text-[#ffbf66]">{formatPercent(selectedPortfolio.volatilityPercent)}</p>
              <p className="mt-2 text-sm text-gray-500">Portfolio risk profile</p>
            </div>
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Capital Basis</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(selectedPortfolio.totalInvestment)}</p>
              <p className="mt-2 text-sm text-gray-500">Initial funded amount</p>
            </div>
          </section>

          <MonteCarloProjection
            mvoId={selectedPortfolio.mvoId}
            initialCapital={selectedPortfolio.initialCapital}
            monthlyDca={selectedPortfolio.monthlyDca}
            investmentHorizon={selectedPortfolio.investmentHorizon}
            investedBreakdown={selectedPortfolio.investedBreakdown}
            onResultChange={setMonteCarloResult}
            renderUi={false}
          />

          <PortfolioOverviewPanels portfolio={selectedPortfolio} monteCarloResult={monteCarloResult} />

          <TotalProfitComparisonChart
            data={monteCarloResult}
            initialCapital={selectedPortfolio.initialCapital}
            monthlyDca={selectedPortfolio.monthlyDca}
            investmentHorizon={selectedPortfolio.investmentHorizon}
          />

          <div className="rounded-[24px] border border-white/10 bg-[#070b13] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Portfolio Context</p>
                <h3 className="mt-1.5 text-xl font-semibold text-white">Selected portfolio details</h3>
              </div>
              <Button asChild variant="outline" className="rounded-2xl border-white/10 bg-transparent text-gray-100 hover:bg-white/5 hover:text-white">
                <Link href={`/portfolio/${selectedPortfolio.id}`}>Open portfolio detail</Link>
              </Button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Simulation Horizon</p>
                <p className="mt-2 text-xl font-semibold text-white">{selectedPortfolio.investmentHorizon} years</p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Contribution Plan</p>
                <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(selectedPortfolio.monthlyDca)}/month</p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Risk Level</p>
                <p className="mt-2 text-xl font-semibold text-white capitalize">{selectedPortfolio.riskLevel}</p>
                <p className="mt-2 text-sm text-gray-500">Updated {new Date(selectedPortfolio.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}