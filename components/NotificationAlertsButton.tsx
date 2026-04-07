'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, ExternalLink, Loader2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { PriceAlertDto } from '@/lib/alerts/types';

function formatAlertCondition(alert: PriceAlertDto) {
  const direction = alert.alertType === 'ABOVE' ? 'Above' : 'Below';
  return `${direction} $${alert.triggerPrice.toFixed(2)}`;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default function NotificationAlertsButton() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<PriceAlertDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let active = true;

    const loadAlerts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/alerts', {
          method: 'GET',
          cache: 'no-store',
        });

        const payload = (await response.json().catch(() => ({ alerts: [], error: 'Failed to load alerts' }))) as {
          alerts?: PriceAlertDto[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load alerts');
        }

        if (!active) return;

        setAlerts(Array.isArray(payload.alerts) ? payload.alerts : []);
      } catch (fetchError) {
        if (!active) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load alerts');
        setAlerts([]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadAlerts();

    return () => {
      active = false;
    };
  }, [open]);

  const activeAlerts = alerts.filter((alert) => alert.isActive);
  const displayedAlerts = activeAlerts.length > 0 ? activeAlerts : alerts;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="relative h-14 w-14 rounded-[18px] border border-[#24283a] bg-[linear-gradient(180deg,#181b2a_0%,#131725_100%)] text-gray-300 transition-all duration-300 hover:border-[#343a52] hover:bg-[#1a1f2f]"
          aria-label="Open alert notifications"
        >
          <Bell className="h-5 w-5" />
          {activeAlerts.length > 0 ? (
            <span className="absolute right-3 top-3 flex h-2.5 w-2.5 rounded-full bg-[#ff6b81] ring-2 ring-[#131725]" />
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[360px] rounded-[22px] border border-[#24283a] bg-[linear-gradient(180deg,#181b2a_0%,#131725_100%)] p-0 text-white shadow-[0_22px_70px_rgba(0,0,0,0.4)]"
      >
        <PopoverHeader className="border-b border-white/8 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <PopoverTitle className="text-base font-semibold text-white">Watchlist alerts</PopoverTitle>
              <p className="mt-1 text-sm text-gray-400">Alerts created from your watchlist appear here.</p>
            </div>
            <span className="rounded-full border border-[#7db8ff]/20 bg-[#7db8ff]/10 px-2.5 py-1 text-[11px] font-semibold text-[#b9d8ff]">
              {displayedAlerts.length}
            </span>
          </div>
        </PopoverHeader>

        <div className="max-h-[420px] overflow-y-auto px-3 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading alerts...
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm text-red-200">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : displayedAlerts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-gray-400">
              No alerts yet. Create alerts from your watchlist to see them here.
            </div>
          ) : (
            <div className="space-y-2">
              {displayedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{alert.ticker}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-400">{alert.company || 'Watchlist alert'}</p>
                    </div>
                    <span className={[
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]',
                      alert.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-gray-500/15 text-gray-400',
                    ].join(' ')}>
                      {alert.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-sm text-gray-200">
                    <span>{formatAlertCondition(alert)}</span>
                    <span className="text-xs text-gray-500">Set at ${alert.currentPriceAtSet.toFixed(2)}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-gray-500">
                    <span>Created {formatTimestamp(alert.createdAt)}</span>
                    {alert.triggeredAt ? <span>Triggered</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-white/8 px-4 py-3">
          <Link
            href="/watchlist"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#9ec7ff] transition-colors hover:text-white"
            onClick={() => setOpen(false)}
          >
            Open watchlist alerts
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}