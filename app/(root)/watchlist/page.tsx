import { Star } from 'lucide-react';
import { getFinnhubCooldownRemainingSeconds, searchStocks } from '@/lib/actions/finnhub.actions';
import SearchCommand from '@/components/SearchCommand';
import { getWatchlistWithData } from '@/lib/actions/watchlist.actions';
import WatchlistAlertsDashboard from '@/components/watchlist/WatchlistAlertsDashboard';

const Watchlist = async () => {
  const watchlist = await getWatchlistWithData();
  const initialStocks = await searchStocks();
  const hasPartialApiData = watchlist.some((item: any) => item?.priceFormatted === '—');
  const cooldownRemainingSeconds = await getFinnhubCooldownRemainingSeconds();

  // Empty state
  if (watchlist.length === 0) {
    return (
      <section className="flex watchlist-empty-container">
        <div className="watchlist-empty">
          <Star className="watchlist-star" />
          <h2 className="empty-title">Your watchlist is empty</h2>
          <p className="empty-description">
            Start building your watchlist by searching for stocks and clicking the star icon to add them.
          </p>
        </div>
        <SearchCommand initialStocks={initialStocks} />
      </section>
    );
  }

  return (
    <section className="w-full min-w-0 overflow-x-hidden pb-8 pt-2 sm:pb-10 lg:pt-3">
      <div className="flex min-w-0 flex-col gap-4">
        {hasPartialApiData && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            ข้อมูลบางส่วนอาจไม่อัปเดตชั่วคราวเพราะ API limit
            {cooldownRemainingSeconds > 0 && ` (ลองใหม่อีก ${cooldownRemainingSeconds}s)`}
          </div>
        )}
        <WatchlistAlertsDashboard
          initialStocks={initialStocks}
          rows={watchlist.map((item) => ({
            ticker: item.symbol,
            company: item.company,
            currentPrice: Number(item.currentPrice || 0),
            priceFormatted: item.priceFormatted || '—',
            changeFormatted: item.changeFormatted || '—',
            changePercent: Number(item.changePercent || 0),
            marketCap: item.marketCap || '—',
            peRatio: item.peRatio || '—',
          }))}
        />
      </div>
    </section>
  );
};

export default Watchlist;