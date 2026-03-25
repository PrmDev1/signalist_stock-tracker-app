'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { cn, getChangeColorClass } from '@/lib/utils';
import WatchlistButton from './WatchlistButton';
import type { MouseEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import SetPriceAlertModal from '@/components/modals/SetPriceAlertModal';
import type { PriceAlertDto } from '@/lib/alerts/types';

interface WatchlistCardProps {
  symbol: string;
  company: string;
  price: number;
  changePercent: number;
  priceFormatted: string;
  changeFormatted: string;
  isInWatchlist?: boolean;
  logo?: string | null;
}

export default function WatchlistCard({
  symbol,
  company,
  price,
  priceFormatted,
  changePercent,
  changeFormatted,
  isInWatchlist = true,
  logo,
}: WatchlistCardProps) {
  const router = useRouter();
  const [logoError, setLogoError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alert, setAlert] = useState<PriceAlertDto | null>(null);

  const initials = company.charAt(0).toUpperCase();

  /* --------- Deterministic fallback color --------- */
  const getIconColor = (sym: string) => {
    const colors = [
      'bg-orange-600',
      'bg-red-600',
      'bg-cyan-500',
      'bg-purple-600',
      'bg-blue-600',
      'bg-emerald-600',
      'bg-pink-600',
      'bg-indigo-600',
    ];
    return colors[sym.charCodeAt(0) % colors.length];
  };

  const iconColor = useMemo(() => getIconColor(symbol), [symbol]);

  useEffect(() => {
    let active = true;

    const loadAlert = async () => {
      try {
        const response = await fetch(`/api/alerts?ticker=${encodeURIComponent(symbol)}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok || !active) return;

        const payload = (await response.json()) as { alert: PriceAlertDto | null };
        setAlert(payload.alert);
      } catch {
        // Keep cards resilient even when alert fetch fails.
      }
    };

    void loadAlert();

    return () => {
      active = false;
    };
  }, [symbol]);

  const openAlertModal = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsModalOpen(true);
  };

  return (
    <>
      <div
        onClick={() => router.push(`/stocks/${encodeURIComponent(symbol)}`)}
        className="
        group relative cursor-pointer rounded-2xl p-5
        bg-gradient-to-br from-[#1b1f26] to-[#232833]
        border border-white/10
        transition-all duration-300
        hover:-translate-y-1
        hover:shadow-xl hover:shadow-black/40
      "
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        {/* Logo */}
        {logo && !logoError ? (
          <img
            src={logo}
            alt={company}
            onError={() => setLogoError(true)}
            className="h-12 w-12 rounded-lg bg-white/5 border border-white/10 object-contain"
          />
        ) : (
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg text-white font-semibold text-lg',
              iconColor
            )}
          >
            {initials}
          </div>
        )}

        {/* Star */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Set price alert for ${symbol}`}
            onClick={openAlertModal}
            className={cn(
              'h-9 w-9 flex items-center justify-center rounded-full border border-gray-600 bg-gray-700/60 transition-colors',
              alert?.isActive ? 'border-yellow-400/60 bg-yellow-500/10' : 'hover:border-gray-500'
            )}
          >
            <Image
              src={alert?.isActive ? '/assets/icons/bell-filled.svg' : '/assets/icons/bell-outline.svg'}
              alt="Alert"
              width={16}
              height={16}
            />
          </button>
          <WatchlistButton
            symbol={symbol}
            company={company}
            isInWatchlist={isInWatchlist}
            type="icon"
          />
        </div>
      </div>

      {/* Company */}
      <h3 className="mb-1 text-sm font-semibold text-white truncate">
        {company}
      </h3>

      {/* Price */}
      <p className="mb-1 text-xl font-bold text-white">
        {priceFormatted}
      </p>

      {/* Change */}
      <p
        className={cn(
          'text-sm font-medium',
          getChangeColorClass(changePercent)
        )}
      >
        {changeFormatted}
      </p>
      </div>

      <SetPriceAlertModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        stock={{
          ticker: symbol,
          company,
          currentPrice: price,
        }}
        initialAlert={alert}
        onAlertChange={(_, nextAlert) => setAlert(nextAlert)}
      />
    </>
  );
}
