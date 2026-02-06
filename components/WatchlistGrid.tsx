'use client';

import { useRouter } from 'next/navigation';
import WatchlistCard from './WatchlistCard';

interface WatchlistItem {
  symbol: string;
  company: string;
  currentPrice: number;
  changePercent: number;
  priceFormatted: string;
  changeFormatted: string;
  logo?: string | null;
}

interface WatchlistGridProps {
  watchlist: WatchlistItem[];
  limit?: number;
  showHeader?: boolean;
}

export default function WatchlistGrid({
  watchlist,
  limit = 6,
  showHeader = true,
}: WatchlistGridProps) {
  const router = useRouter();
  const displayedWatchlist = limit ? watchlist.slice(0, limit) : watchlist;
  const hasMore = limit && watchlist.length > limit;

  if (watchlist.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center bg-white/5 border border-white/10">
        <p className="text-gray-400 mb-4">
          Start building your watchlist to track stocks you care about.
        </p>
        <button
          onClick={() => router.push('/search')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Add Stocks
        </button>
      </div>
    );
  }

  return (
    <section className="w-full">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Your Watchlist</h2>
          {hasMore && (
            <button
              onClick={() => router.push('/watchlist')}
              className="text-sm text-gray-300 hover:text-white transition"
            >
              View all
            </button>
          )}
        </div>
      )}

      {/* 👇 Background Panel */}
      <div
        className="
          rounded-2xl
          p-6
          bg-white/[0.04]
          border border-white/10
          shadow-[0_20px_40px_rgba(0,0,0,0.5)]
        "
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedWatchlist.map((item) => (
            <WatchlistCard
              key={item.symbol}
              symbol={item.symbol}
              company={item.company}
              price={item.currentPrice}
              changePercent={item.changePercent}
              priceFormatted={item.priceFormatted}
              changeFormatted={item.changeFormatted}
              isInWatchlist
              logo={item.logo}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
