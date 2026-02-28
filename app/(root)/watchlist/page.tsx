import { Star } from 'lucide-react';
import { getFinnhubCooldownRemainingSeconds, searchStocks } from '@/lib/actions/finnhub.actions';
import SearchCommand from '@/components/SearchCommand';
import { getWatchlistWithData } from '@/lib/actions/watchlist.actions';
import { WatchlistTable } from '@/components/WatchlistTable';

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
    <section className="watchlist">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="watchlist-title">Watchlist</h2>
          <SearchCommand initialStocks={initialStocks} />
        </div>
        {hasPartialApiData && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            ข้อมูลบางส่วนอาจไม่อัปเดตชั่วคราวเพราะ API limit
            {cooldownRemainingSeconds > 0 && ` (ลองใหม่อีก ${cooldownRemainingSeconds}s)`}
          </div>
        )}
        <WatchlistTable watchlist={watchlist} />
      </div>
    </section>
  );
};

export default Watchlist;