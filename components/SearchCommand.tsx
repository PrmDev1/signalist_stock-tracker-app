'use client';

import { useEffect, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Loader2, Search, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { searchStocks } from '@/lib/actions/finnhub.actions';
import { useDebounce } from '@/hooks/useDebounce';
import WatchlistButton from './WatchlistButton';

export default function SearchCommand({
  renderAs = 'button',
  label = 'เพิ่มหุ้น',
  initialStocks,
}: SearchCommandProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] =
    useState<StockWithWatchlistStatus[]>(initialStocks);

  const isSearchMode = !!searchTerm.trim();
  const displayStocks = isSearchMode ? stocks : stocks?.slice(0, 10);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSearch = async () => {
    if (!isSearchMode) return setStocks(initialStocks);

    setLoading(true);
    try {
      const results = await searchStocks(searchTerm.trim());
      setStocks(results);
    } catch {
      setStocks([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = useDebounce(handleSearch, 300);

  useEffect(() => {
    debouncedSearch();
  }, [searchTerm]);

  useEffect(() => {
    const refreshPopularStocks = async () => {
      if (!open || isSearchMode) return;
      try {
        const latest = await searchStocks();
        setStocks(latest);
      } catch {
        // keep existing stocks if refresh fails
      }
    };

    refreshPopularStocks();
  }, [open, isSearchMode]);

  const handleSelectStock = () => {
    setOpen(false);
    setSearchTerm('');
    setStocks(initialStocks);
  };

  // Handle watchlist changes status change
  const handleWatchlistChange = async (symbol: string, isAdded: boolean) => {
    setStocks((prev) =>
      (prev || []).map((stock) =>
        stock.symbol === symbol ? { ...stock, isInWatchlist: isAdded } : stock
      )
    );
  };

  return (
    <>
      {renderAs === 'text' ? (
        <span onClick={() => setOpen(true)} className='search-text'>
          {label}
        </span>
      ) : renderAs === 'input' ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setOpen(true);
            }
          }}
          className="group flex h-14 w-full items-center gap-3 rounded-[18px] border border-[#24283a] bg-[linear-gradient(180deg,#181b2a_0%,#131725_100%)] px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-300 hover:border-[#343a52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/40"
        >
          <Search className="h-4 w-4 shrink-0 text-gray-500 transition-colors duration-300 group-hover:text-gray-300" />
          <input
            readOnly
            value=""
            onFocus={() => setOpen(true)}
            placeholder="ค้นหาหุ้นที่ต้องการ..."
            className="pointer-events-none h-full w-full bg-transparent text-[15px] text-white placeholder:text-[#7c839a] focus:outline-none"
            aria-label="ค้นหาหุ้น"
          />
          <div className="hidden shrink-0 items-center rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-gray-400 sm:inline-flex">
            Ctrl/Cmd + K
          </div>
        </div>
      ) : (
        <Button onClick={() => setOpen(true)} className='search-btn'>
          {label}
        </Button>
      )}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        className='search-dialog'
      >
        <div className='search-field'>
          <CommandInput
            value={searchTerm}
            onValueChange={setSearchTerm}
            placeholder='ค้นหาหุ้น...'
            className='search-input'
          />
          {loading && <Loader2 className='search-loader' />}
        </div>
        <CommandList className='search-list'>
          {loading ? (
            <CommandEmpty className='search-list-empty'>
              กำลังโหลดข้อมูลหุ้น...
            </CommandEmpty>
          ) : displayStocks?.length === 0 ? (
            <div className='search-list-indicator'>
              {isSearchMode ? 'ไม่พบผลลัพธ์' : 'ยังไม่มีข้อมูลหุ้น'}
            </div>
          ) : (
            <ul>
              <div className='search-count'>
                {isSearchMode ? 'ผลการค้นหา' : 'หุ้นยอดนิยม'}
                {` `}({displayStocks?.length || 0})
              </div>
              {displayStocks?.map((stock, i) => (
                <li key={stock.symbol} className='search-item'>
                  <Link
                    href={`/stocks/${stock.symbol}`}
                    onClick={handleSelectStock}
                    className='search-item-link'
                  >
                    <TrendingUp className='h-4 w-4 text-gray-500' />
                    <div className='flex-1'>
                      <div className='search-item-name'>{stock.name}</div>
                      <div className='text-sm text-gray-500'>
                        {stock.symbol} | {stock.exchange} | {stock.type}
                      </div>
                    </div>
                     {/* ⭐ Watchlist button */}
                    <WatchlistButton
                      symbol={stock.symbol}
                      company={stock.name}
                      isInWatchlist={stock.isInWatchlist}
                      type="icon"
                      onWatchlistChange={handleWatchlistChange}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}