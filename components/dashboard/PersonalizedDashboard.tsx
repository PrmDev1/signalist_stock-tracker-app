'use client';

import Link from 'next/link';
import { startTransition, useEffect, useState } from 'react';
import { LayoutGrid, Plus, Wallet } from 'lucide-react';
import AddWidgetModal from '@/components/dashboard/AddWidgetModal';
import PortfolioSummaryWidget from '@/components/dashboard/PortfolioSummaryWidget';
import WidgetContainer from '@/components/dashboard/WidgetContainer';
import type { DashboardPortfolioWidgetData } from '@/components/dashboard/types';
import { Button } from '@/components/ui/button';

interface PersonalizedDashboardProps {
  portfolios: DashboardPortfolioWidgetData[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export default function PersonalizedDashboard({ portfolios }: PersonalizedDashboardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePortfolioIds, setActivePortfolioIds] = useState<string[]>(() => portfolios.slice(0, Math.min(2, portfolios.length)).map((portfolio) => portfolio.id));

  useEffect(() => {
    const stored = window.localStorage.getItem('dashboard:portfolio-widgets');
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validIds = parsed.filter((id) => portfolios.some((portfolio) => portfolio.id === id));
        if (validIds.length > 0) {
          setActivePortfolioIds(validIds);
        }
      }
    } catch {
      // Ignore malformed local widget state.
    }
  }, [portfolios]);

  useEffect(() => {
    window.localStorage.setItem('dashboard:portfolio-widgets', JSON.stringify(activePortfolioIds));
  }, [activePortfolioIds]);

  const activePortfolios = portfolios.filter((portfolio) => activePortfolioIds.includes(portfolio.id));

  const metrics = activePortfolios.reduce(
    (acc, portfolio) => {
      acc.totalAssets += portfolio.currentValue;
      acc.totalInvestment += portfolio.totalInvestment;
      acc.totalProfit += portfolio.profitLoss;
      return acc;
    },
    { totalAssets: 0, totalInvestment: 0, totalProfit: 0 }
  );

  const totalProfitPercent =
    metrics.totalInvestment > 0 ? (metrics.totalProfit / metrics.totalInvestment) * 100 : 0;

  const handleAddPortfolio = (portfolioId: string) => {
    startTransition(() => {
      setActivePortfolioIds((current) => (current.includes(portfolioId) ? current : [...current, portfolioId]));
      setIsModalOpen(false);
    });
  };

  const handleRemovePortfolio = (portfolioId: string) => {
    startTransition(() => {
      setActivePortfolioIds((current) => current.filter((id) => id !== portfolioId));
    });
  };

  if (portfolios.length === 0) {
    return (
      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,35,0.96),rgba(12,15,25,0.96))] p-8 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
        <p className="text-xs uppercase tracking-[0.24em] text-[#7db8ff]">Dashboard</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Build your personalized workspace</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-gray-400">
          Your widget dashboard becomes available once you save at least one portfolio. Each widget uses real portfolio and market data from your existing backend records.
        </p>
        <div className="mt-8">
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#6f5cff] px-5 py-3 text-sm font-semibold text-white transition-colors duration-300 hover:bg-[#5d4eed]"
          >
            <Plus className="h-4 w-4" />
            Create your first portfolio
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(111,92,255,0.22),transparent_28%),linear-gradient(180deg,rgba(18,22,35,0.96),rgba(12,15,25,0.96))] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
          <p className="text-xs uppercase tracking-[0.24em] text-[#7db8ff]">Personal Dashboard</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold text-white">Portfolio Command Center</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-gray-400">
                Choose which portfolios to pin to your workspace and monitor live value, investment basis, and profit in one place.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="rounded-2xl bg-[#6f5cff] px-5 py-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(111,92,255,0.32)] transition-colors duration-300 hover:bg-[#5d4eed]"
            >
              <Plus className="h-4 w-4" />
              Add Widget
            </Button>
          </div>
        </div>

        <WidgetContainer title="Widget Coverage" subtitle="Portfolios currently selected for the dashboard" draggableHint={false}>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#14192a] text-[#7db8ff]">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active widgets</p>
                  <p className="text-2xl font-semibold text-white">{activePortfolios.length}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">of {portfolios.length}</p>
            </div>

            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm text-gray-500">Displaying</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {activePortfolios.map((portfolio) => (
                  <span key={portfolio.id} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-gray-300">
                    {portfolio.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </WidgetContainer>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <WidgetContainer title="Total Assets" subtitle="Live estimate across displayed portfolios" draggableHint={false} className="p-5">
          <p className="text-4xl font-semibold text-white">{formatCurrency(metrics.totalAssets)}</p>
        </WidgetContainer>

        <WidgetContainer title="Total Investment" subtitle="Capital assigned to displayed portfolios" draggableHint={false} className="p-5">
          <p className="text-4xl font-semibold text-white">{formatCurrency(metrics.totalInvestment)}</p>
        </WidgetContainer>

        <WidgetContainer title="Total Profit / Loss" subtitle="Real-time delta based on current portfolio snapshots" draggableHint={false} className="p-5">
          <div className="flex flex-wrap items-end gap-3">
            <p className={['text-4xl font-semibold', metrics.totalProfit >= 0 ? 'text-[#35d27d]' : 'text-[#ff5c7a]'].join(' ')}>
              {formatCurrency(metrics.totalProfit)}
            </p>
            <span className={['mb-1 rounded-full px-2.5 py-1 text-xs font-medium', metrics.totalProfit >= 0 ? 'bg-[#10311f] text-[#35d27d]' : 'bg-[#361621] text-[#ff5c7a]'].join(' ')}>
              {formatSignedPercent(totalProfitPercent)}
            </span>
          </div>
        </WidgetContainer>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {activePortfolios.map((portfolio) => (
          <PortfolioSummaryWidget
            key={portfolio.id}
            portfolio={portfolio}
            onRemove={handleRemovePortfolio}
          />
        ))}
      </section>

      {activePortfolios.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#14192a] text-[#7db8ff]">
            <Wallet className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">No widgets selected</h2>
          <p className="mt-2 text-gray-500">Open Add Widget and choose which saved portfolios should be visible on the dashboard.</p>
        </section>
      ) : null}

      <AddWidgetModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        activePortfolioIds={activePortfolioIds}
        onAddPortfolio={handleAddPortfolio}
      />
    </div>
  );
}