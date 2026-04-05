'use client';

import { useEffect, useState, useTransition } from 'react';
import { Loader2, Plus } from 'lucide-react';
import type { DashboardPortfolioListItem } from '@/components/dashboard/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AddWidgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activePortfolioIds: string[];
  onAddPortfolio: (portfolioId: string) => void;
}

interface PortfolioListResponse {
  portfolios?: DashboardPortfolioListItem[];
  error?: string;
}

export default function AddWidgetModal({
  open,
  onOpenChange,
  activePortfolioIds,
  onAddPortfolio,
}: AddWidgetModalProps) {
  const [portfolios, setPortfolios] = useState<DashboardPortfolioListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoading] = useTransition();

  useEffect(() => {
    if (!open) return;

    startLoading(async () => {
      try {
        setError(null);
        const response = await fetch('/api/dashboard/portfolios', { cache: 'no-store' });
        const payload = (await response.json()) as PortfolioListResponse;

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load portfolios');
        }

        setPortfolios(Array.isArray(payload.portfolios) ? payload.portfolios : []);
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : 'Unknown error';
        setError(message);
        setPortfolios([]);
      }
    });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[28px] border-white/10 bg-[#0f1320] p-0 text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:max-w-2xl">
        <div className="border-b border-white/8 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Add Widget</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Select one of your saved portfolios to place it on the dashboard.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-6 py-5 tv-scrollbar">
          {isLoading ? (
            <div className="flex min-h-[200px] items-center justify-center text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <div className="rounded-[22px] border border-[#4a1f2d] bg-[#23121a] p-4 text-sm text-[#ff9db2]">{error}</div>
          ) : portfolios.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-white/10 p-5 text-sm text-gray-500">
              No saved portfolios are available yet.
            </div>
          ) : (
            portfolios.map((portfolio) => {
              const isActive = activePortfolioIds.includes(portfolio.id);

              return (
                <div
                  key={portfolio.id}
                  className="flex items-center justify-between gap-4 rounded-[22px] border border-white/8 bg-white/[0.03] p-4 transition-all duration-300"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-white">{portfolio.name}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {portfolio.tickersCount} holdings · {portfolio.riskLevel} risk
                    </p>
                  </div>

                  <Button
                    type="button"
                    disabled={isActive}
                    onClick={() => onAddPortfolio(portfolio.id)}
                    className={[
                      'rounded-2xl px-4 py-2.5',
                      isActive
                        ? 'bg-white/8 text-gray-500 hover:bg-white/8'
                        : 'bg-[#6f5cff] text-white hover:bg-[#5e4df0]',
                    ].join(' ')}
                  >
                    <Plus className="h-4 w-4" />
                    {isActive ? 'Added' : 'Add Widget'}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}