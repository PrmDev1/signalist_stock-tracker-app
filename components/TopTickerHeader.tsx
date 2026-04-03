'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TopTickerItem {
  symbol: string;
  companyName: string;
  price: number;
  changePercent: number;
  logoUrl: string | null;
  sparkline: number[];
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value >= 100 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatChange(changePercent: number): string {
  const sign = changePercent > 0 ? '+' : '';
  return `${sign}${changePercent.toFixed(2)}%`;
}

function buildSparklinePath(points: number[]): string {
  if (points.length === 0) return '';

  const min = Math.min(...points);
  const max = Math.max(...points);
  const spread = max - min || 1;
  const topPadding = 18;
  const chartHeight = 20;

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = topPadding + (1 - (point - min) / spread) * chartHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function TickerRow({ item }: { item: TopTickerItem }) {
  const isPositive = item.changePercent >= 0;
  const sparklinePath = useMemo(() => buildSparklinePath(item.sparkline), [item.sparkline]);

  return (
    <div className="flex min-w-[154px] items-center gap-[9px] border-r border-white/8 px-3 py-1 last:border-r-0 sm:min-w-[162px]">
      <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)] ring-1 ring-white/6">
        {item.logoUrl ? (
          <img src={item.logoUrl} alt={`${item.companyName} logo`} className="h-[18px] w-[18px] rounded-full object-contain" />
        ) : (
          <span className="text-[10px] font-semibold text-[#7db8ff]">{item.symbol.slice(0, 2)}</span>
        )}
      </div>

      <p className="w-[42px] shrink-0 text-[11px] font-semibold tracking-[0.015em] text-white">{item.symbol}</p>

      <svg viewBox="0 0 100 56" className="h-[15px] w-[40px] shrink-0 overflow-visible">
        <path
          d={sparklinePath}
          fill="none"
          stroke={isPositive ? '#35d27d' : '#ff5c7a'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <p className={[
        'w-[44px] shrink-0 text-right text-[10px] font-semibold tracking-[0.01em] tabular-nums',
        isPositive ? 'text-[#35d27d]' : 'text-[#ff5c7a]',
      ].join(' ')}>
        {formatChange(item.changePercent)}
      </p>
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="flex min-w-[154px] items-center gap-[9px] border-r border-white/8 px-3 py-1 last:border-r-0 sm:min-w-[162px]">
      <div className="h-[26px] w-[26px] animate-pulse rounded-full bg-white/8" />
      <div className="h-3.5 w-10 animate-pulse rounded bg-white/8" />
      <div className="h-3.5 w-10 animate-pulse rounded bg-white/6" />
      <div className="h-3 w-10 animate-pulse rounded bg-white/8" />
    </div>
  );
}

export default function TopTickerHeader() {
  const [items, setItems] = useState<TopTickerItem[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchTickers = async () => {
      try {
        const response = await fetch('/api/market/top-tickers', { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({ data: [] }))) as { data?: TopTickerItem[] };
        if (!active) return;

        setItems(
          Array.isArray(payload.data)
            ? payload.data.filter((item) => Number.isFinite(item.price) && item.price > 0)
            : []
        );
      } catch {
        if (!active) return;
        setItems([]);
      } finally {
        if (active) {
          setHasLoaded(true);
        }
      }
    };

    fetchTickers();
    const intervalId = window.setInterval(fetchTickers, 120000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const marqueeItems = items.length > 0 ? [...items, ...items] : [];

  return (
    <section className="overflow-hidden rounded-[14px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,18,28,0.98),rgba(10,12,20,0.98))] shadow-[0_10px_28px_rgba(0,0,0,0.28)] backdrop-blur-md">
      <div className="flex h-[42px] items-center">
        <div className="flex h-full items-center border-r border-white/8 px-3 text-gray-400">
          <ChevronLeft className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1 overflow-hidden">
          {marqueeItems.length > 0 ? (
            <div className="ticker-marquee flex w-max items-center hover:[animation-play-state:paused]">
              {marqueeItems.map((item, index) => (
                <TickerRow key={`${item.symbol}-${index}`} item={item} />
              ))}
            </div>
          ) : hasLoaded ? (
            <div className="flex h-full items-center px-4 text-xs text-gray-500">
              Live ticker feed is temporarily unavailable.
            </div>
          ) : (
            <div className="flex items-center overflow-x-auto tv-scrollbar">
              {Array.from({ length: 6 }).map((_, index) => (
                <LoadingRow key={index} />
              ))}
            </div>
          )}
        </div>

        <div className="flex h-full items-center border-l border-white/8 px-3 text-gray-400">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </section>
  );
}