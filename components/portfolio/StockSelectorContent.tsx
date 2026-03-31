'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Loader, AlertCircle, Columns3, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { getPortfolioFilters, getPortfolioTickers, CompanyFilter, CompanyProfile } from '@/lib/actions/portfolio.actions';
import SelectAssetHeader from './SelectAssetHeader';
import StockListItem, { type StockColumnKey, type StockColumnVisibility } from './StockListItem';
import FilterPanelModal from './FilterPanelModal';
import { useRouter, useSearchParams } from 'next/navigation';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  type FilteredStock,
  getFilteredStocksFromSession,
  setFilteredStocksInSession,
} from '@/lib/portfolio-filtered-stocks';

const STOCK_SELECTOR_COLUMNS_STORAGE_KEY = 'stock-selector-visible-columns-v1';

const DEFAULT_VISIBLE_COLUMNS: StockColumnVisibility = {
  ticker: true,
  companyName: true,
  primaryExchange: true,
  sector: true,
  filerSize: true,
  price5YearGrowth: true,
  divScore: true,
  div5YearGrowth: true,
  latestPrice: true,
  yesterdayPrice: true,
  change: true,
  select: true,
};

const coerceVisibleColumns = (value: unknown): StockColumnVisibility => {
  if (!value || typeof value !== 'object') return DEFAULT_VISIBLE_COLUMNS;

  const parsed = value as Partial<Record<StockColumnKey, unknown>>;
  return {
    ticker: parsed.ticker !== false,
    companyName: parsed.companyName !== false,
    primaryExchange: parsed.primaryExchange !== false,
    sector: parsed.sector !== false,
    filerSize: parsed.filerSize !== false,
    price5YearGrowth: parsed.price5YearGrowth !== false,
    divScore: parsed.divScore !== false,
    div5YearGrowth: parsed.div5YearGrowth !== false,
    latestPrice: parsed.latestPrice !== false,
    yesterdayPrice: parsed.yesterdayPrice !== false,
    change: parsed.change !== false,
    // Always keep select column visible to preserve row selection behavior.
    select: true,
  };
};

export default function StockSelectorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetQuery = searchParams.get('preset');
  const activePreset =
    presetQuery === 'growth' || presetQuery === 'dividend' || presetQuery === 'balanced' || presetQuery === 'custom'
      ? presetQuery
      : 'custom';
  const filterTag = activePreset === 'growth' ? 'growth' : activePreset === 'dividend' ? 'dividend' : 'all';
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<CompanyFilter | null>(null);
  const [activeFilters, setActiveFilters] = useState<{
    officeSector?: string;
    sector?: string;
    exchange?: string;
    filerSize?: string;
    isSmallerReporting?: boolean;
    isEmergingGrowth?: boolean;
  }>({});
  const [allStocks, setAllStocks] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [fetchCapped, setFetchCapped] = useState<boolean>(false);
  const [finalFetchedCount, setFinalFetchedCount] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);
  const UI_PAGE_SIZE = 50;
  const [selectedStockMap, setSelectedStockMap] = useState<Record<string, FilteredStock>>({});
  type SortKey = Exclude<StockColumnKey, 'select'>;
  type SortDirection = 'asc' | 'desc';
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'ticker', direction: 'asc' });
  const [columnsHydrated, setColumnsHydrated] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState<StockColumnVisibility>(DEFAULT_VISIBLE_COLUMNS);

  const columnDefs = useMemo<Array<{ key: StockColumnKey; label: string; width: string; canHide: boolean }>>(
    () => [
      { key: 'ticker', label: 'หุ้น', width: '180px', canHide: true },
      { key: 'companyName', label: 'ชื่อบริษัท', width: 'minmax(220px,1.2fr)', canHide: true },
      { key: 'primaryExchange', label: 'ตลาด', width: '90px', canHide: true },
      { key: 'sector', label: 'หมวดหุ้น', width: 'minmax(220px,1.4fr)', canHide: true },
      { key: 'filerSize', label: 'ขนาดบริษัท', width: '130px', canHide: true },
      { key: 'price5YearGrowth', label: 'เติบโต 5 ปี', width: '100px', canHide: true },
      { key: 'divScore', label: 'คะแนนปันผล', width: '100px', canHide: true },
      { key: 'div5YearGrowth', label: 'ปันผล 5 ปี', width: '100px', canHide: true },
      { key: 'latestPrice', label: 'ราคาล่าสุด', width: '110px', canHide: true },
      { key: 'yesterdayPrice', label: 'ราคาวานนี้', width: '110px', canHide: true },
      { key: 'change', label: 'เปลี่ยนแปลง', width: '100px', canHide: true },
      { key: 'select', label: 'เลือก', width: '46px', canHide: false },
    ],
    []
  );

  const activeColumnDefs = useMemo(
    () => columnDefs.filter((col) => visibleColumns[col.key]),
    [columnDefs, visibleColumns]
  );

  const sortedStocks = useMemo(() => {
    if (!sortConfig) return [...allStocks].sort((a, b) => (a.ticker || '').localeCompare(b.ticker || ''));

    const getSortValue = (stock: CompanyProfile, key: SortKey): string | number => {
      switch (key) {
        case 'ticker':
          return stock.ticker || '';
        case 'companyName':
          return stock.companyName || '';
        case 'primaryExchange':
          return stock.primaryExchange || '';
        case 'sector':
          return stock.sector || '';
        case 'filerSize':
          return stock.filerSize || '';
        case 'price5YearGrowth':
          return Number.isFinite(stock.metrics?.price5YearCAGR) ? Number(stock.metrics?.price5YearCAGR) : Number.NEGATIVE_INFINITY;
        case 'divScore':
          return Number.isFinite(stock.metrics?.divConsistencyScore) ? Number(stock.metrics?.divConsistencyScore) : Number.NEGATIVE_INFINITY;
        case 'div5YearGrowth':
          return Number.isFinite(stock.metrics?.div5YearCAGR) ? Number(stock.metrics?.div5YearCAGR) : Number.NEGATIVE_INFINITY;
        case 'latestPrice':
          return Number.isFinite(stock.latestPrice) ? Number(stock.latestPrice) : Number.NEGATIVE_INFINITY;
        case 'yesterdayPrice':
          return Number.isFinite(stock.yesterdayPrice) ? Number(stock.yesterdayPrice) : Number.NEGATIVE_INFINITY;
        case 'change':
          return Number.isFinite(stock.latestPrice) && Number.isFinite(stock.yesterdayPrice) && Number(stock.yesterdayPrice) > 0
            ? ((Number(stock.latestPrice) - Number(stock.yesterdayPrice)) / Number(stock.yesterdayPrice)) * 100
            : Number.NEGATIVE_INFINITY;
        default:
          return '';
      }
    };

    return [...allStocks].sort((a, b) => {
      const av = getSortValue(a, sortConfig.key);
      const bv = getSortValue(b, sortConfig.key);

      if (typeof av === 'string' && typeof bv === 'string') {
        const result = av.localeCompare(bv);
        return sortConfig.direction === 'asc' ? result : -result;
      }

      const result = Number(av) - Number(bv);
      return sortConfig.direction === 'asc' ? result : -result;
    });
  }, [allStocks, sortConfig]);

  const presetFilteredStocks = useMemo(() => {
    if (filterTag === 'all') return sortedStocks;
    return sortedStocks.filter((stock) => {
      const tag = String(stock.sectorPerformanceTier ?? '').trim().toLowerCase();
      return tag === filterTag;
    });
  }, [filterTag, sortedStocks]);

  const columnTemplate = useMemo(
    () => activeColumnDefs.map((col) => col.width).join(' '),
    [activeColumnDefs]
  );

  const handleToggleColumn = (columnKey: StockColumnKey) => {
    if (columnKey === 'select') return;

    const visibleCount = columnDefs.filter((col) => col.canHide && visibleColumns[col.key]).length;
    if (visibleColumns[columnKey] && visibleCount <= 1) {
      return;
    }

    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const handleSort = (key: SortKey, direction: SortDirection) => {
    setSortConfig({ key, direction });
  };

  const clearSort = () => {
    setSortConfig(null);
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STOCK_SELECTOR_COLUMNS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        setVisibleColumns(coerceVisibleColumns(parsed));
      }
    } catch (error) {
      console.error('Failed to read saved columns:', error);
    } finally {
      setColumnsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!columnsHydrated) return;

    try {
      window.localStorage.setItem(STOCK_SELECTOR_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
    } catch (error) {
      console.error('Failed to save columns:', error);
    }
  }, [visibleColumns, columnsHydrated]);

  const toFilteredStock = (stock: CompanyProfile): FilteredStock => ({
    symbol: stock.ticker.trim().toUpperCase(),
    name: stock.companyName,
    sector: stock.sector,
    marketCap: 0,
    tag: typeof stock.sectorPerformanceTier === 'string' && stock.sectorPerformanceTier.trim().length > 0
      ? stock.sectorPerformanceTier.trim().toLowerCase()
      : undefined,
    latestPrice: Number.isFinite(stock.latestPrice) ? Number(stock.latestPrice) : undefined,
    dayChangePercent:
      Number.isFinite(stock.latestPrice) && Number.isFinite(stock.yesterdayPrice) && Number(stock.yesterdayPrice) > 0
        ? ((Number(stock.latestPrice) - Number(stock.yesterdayPrice)) / Number(stock.yesterdayPrice)) * 100
        : undefined,
  });

  // Fetch filters on mount
  // can be called on mount or retry
  const fetchFilters = async () => {
    try {
      const response = await getPortfolioFilters();
      if (response.success && response.filters) {
        setFilters(response.filters);
        // clear any previous error once filters load
        setError(null);
      } else {
        console.error('Failed to fetch filters:', response.error);
        setError('Unable to load filter options. Please try again later.');
      }
    } catch (err) {
      console.error('Exception fetching filters:', err);
      setError('Unable to load filter options. Please try again later.');
    }
  };

  useEffect(() => {
    fetchFilters();

    const previouslySelected = getFilteredStocksFromSession(activePreset);
    if (previouslySelected.length > 0) {
      const symbols = previouslySelected.map((stock) => stock.symbol.trim().toUpperCase());
      const stockMap = previouslySelected.reduce<Record<string, FilteredStock>>((acc, stock) => {
        const symbol = stock.symbol.trim().toUpperCase();
        acc[symbol] = {
          ...stock,
          symbol,
        };
        return acc;
      }, {});

      setSelectedStocks(symbols);
      setSelectedStockMap(stockMap);
    }
  }, []);

  // Fetch all stocks (all backend pages) when search or filters change
  useEffect(() => {
    let cancelled = false;

    const fetchStocks = async () => {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);
      setFetchCapped(false);
      setFinalFetchedCount(0);

      const mergedStocks: CompanyProfile[] = [];
      let page = 1;
      const API_PAGE_SIZE = 500;
      const MAX_PAGES = 20; // safety cap (10,000 stocks)
      const MAX_RETRIES = 2;
      const TIMEOUT_MS = 10000;
      const DELAY_BETWEEN_PAGES = 300;

      // Helper: fetch with timeout
      async function fetchWithTimeout(fn: () => Promise<any>, timeoutMs: number) {
        return Promise.race([
          fn(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
        ]);
      }

      while (true) {
        let retries = 0;
        let response;
        while (retries <= MAX_RETRIES) {
          try {
            response = await fetchWithTimeout(
              () => getPortfolioTickers(page, API_PAGE_SIZE, {
                search: searchTerm || undefined,
                officeSector: activeFilters.officeSector,
                sector: activeFilters.sector,
                exchange: activeFilters.exchange,
                filerSize: activeFilters.filerSize,
                isSmallerReporting: activeFilters.isSmallerReporting,
                isEmergingGrowth: activeFilters.isEmergingGrowth,
              }),
              TIMEOUT_MS
            );
            break; // success
          } catch (err) {
            retries++;
            if (retries > MAX_RETRIES) {
              setError('Failed to fetch stocks (timeout or network error)');
              setFetchCapped(true);
              setFinalFetchedCount(mergedStocks.length);
              setAllStocks(mergedStocks);
              setLoading(false);
              setLoadingProgress(0);
              return;
            }
            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, 400 * retries));
          }
        }

        if (cancelled) return;

        if (!response.success) {
          setError(response.error || 'Failed to fetch stocks');
          setAllStocks([]);
          setLoading(false);
          setLoadingProgress(0);
          return;
        }

        const chunk = response.tickers ?? [];
        mergedStocks.push(...chunk);
        setLoadingProgress(mergedStocks.length);

        if (chunk.length < API_PAGE_SIZE) {
          break;
        }
        if (page >= MAX_PAGES) {
          setFetchCapped(true);
          setFinalFetchedCount(mergedStocks.length);
          break;
        }

        page += 1;
        // Add delay between page requests
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_PAGES));
      }

      if (cancelled) return;

      setAllStocks(mergedStocks);
      setLoading(false);
      setLoadingProgress(0);
    };

    // Debounce search
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1);
      fetchStocks();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
    };
  }, [searchTerm, activeFilters]);

  const handleSelectStock = (ticker: string) => {
    const normalizedTicker = ticker.trim().toUpperCase();
    const isSelected = selectedStocks.includes(normalizedTicker);

    if (isSelected) {
      setSelectedStocks((prev) => prev.filter((t) => t !== normalizedTicker));
      setSelectedStockMap((prev) => {
        const next = { ...prev };
        delete next[normalizedTicker];
        return next;
      });
      return;
    }

    setSelectedStocks((prev) => [...prev, normalizedTicker]);
    const foundStock = allStocks.find((stock: CompanyProfile) => stock.ticker.trim().toUpperCase() === normalizedTicker);
    if (foundStock) {
      setSelectedStockMap((prev) => ({
        ...prev,
        [normalizedTicker]: toFilteredStock(foundStock),
      }));
    }
  };

  const handleFilterChange = (filterName: string, value: any) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
    setCurrentPage(1);
  };

  const handleClearAll = () => {
    setSelectedStocks([]);
    setSelectedStockMap({});
    setFilteredStocksInSession([], activePreset);
    setSearchTerm('');
    setActiveFilters({});
    setCurrentPage(1);
  };

  const handleConfirm = () => {
    if (selectedStocks.length >= 2) {
      const filteredStocks = selectedStocks
        .map((symbol) => selectedStockMap[symbol])
        .filter((stock): stock is FilteredStock => Boolean(stock));

      if (filteredStocks.length === 0) {
        return;
      }

      setFilteredStocksInSession(filteredStocks, activePreset);
      router.push(`/portfolio/optimizer?preset=${activePreset}`);
    }
  };

  const handleClose = () => {
    router.push('/portfolio/presets');
  };

  // Pagination (frontend)
  const totalPages = Math.max(1, Math.ceil(presetFilteredStocks.length / UI_PAGE_SIZE));
  const paginatedStocks = useMemo(() => {
    const start = (currentPage - 1) * UI_PAGE_SIZE;
    const end = start + UI_PAGE_SIZE;
    return presetFilteredStocks.slice(start, end);
  }, [currentPage, presetFilteredStocks]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginationItems = useMemo<Array<number | 'ellipsis'>>(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, 'ellipsis', totalPages];
    }

    if (currentPage >= totalPages - 2) {
      return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
  }, [currentPage, totalPages]);

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <SelectAssetHeader
          onClose={handleClose}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          onFilterToggle={() => setShowFilters(true)}
        />

        {/* Section Header - US Stocks */}
        <div className="sticky top-16 sm:top-20 z-30 px-4 py-3 sm:px-6 sm:py-4 bg-gray-900/95 backdrop-blur border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-white">
            US stocks
          </h2>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-gray-700 bg-gray-800/70 px-3 py-1.5 text-xs sm:text-sm text-gray-200 hover:bg-gray-700/70 transition-colors"
                  title="เลือกคอลัมน์ที่ต้องการแสดง"
                >
                  <Columns3 className="w-4 h-4" />
                  คอลัมน์
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-gray-900 border-gray-700 text-gray-100">
                <DropdownMenuLabel>เลือกคอลัมน์ที่ต้องการแสดง</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-700" />
                {columnDefs.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.key}
                    checked={visibleColumns[column.key]}
                    disabled={!column.canHide}
                    onCheckedChange={() => handleToggleColumn(column.key)}
                    className="capitalize"
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {selectedStocks.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 text-red-500 hover:text-red-400 text-xs sm:text-sm font-medium transition-colors"
                title="Clear all selections"
              >
                <span>CLEAR ALL</span>
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-2 sm:px-6 border-b border-gray-800 bg-gray-900/80">
          <p className="text-xs text-gray-300">
            Active preset filter:{' '}
            <span className="font-semibold text-cyan-300 uppercase tracking-[0.1em]">
              {filterTag === 'all' ? 'All tags' : filterTag}
            </span>
          </p>
        </div>

        {/* Stock List */}
        <div className="tv-scrollbar flex-1 overflow-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <Loader className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="text-xs text-blue-200 mt-1">Loaded {loadingProgress}+ stocks...</span>
            </div>
          )}
          {fetchCapped && !loading && (
            <div className="flex items-center gap-3 m-4 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <p className="text-sm text-yellow-400">
                Warning: Fetched stocks reached the safety cap ({finalFetchedCount}+). The API may be returning too many pages. Please check your filters or try again later.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 m-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => {
                  // retry filter fetch (and implicitly stocks via effect)
                  fetchFilters();
                  setCurrentPage(1);
                }}
                className="ml-auto text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && presetFilteredStocks.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <p className="text-sm">No stocks found for this preset. Try adjusting your filters.</p>
            </div>
          )}

          {!loading && presetFilteredStocks.length > 0 && (
            <div>
              <div
                className="sticky top-0 z-20 grid gap-3 border-b border-gray-700 bg-gray-900/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-blue-200 backdrop-blur"
                style={{ gridTemplateColumns: columnTemplate }}
              >
                {activeColumnDefs.map((column) => (
                  column.key === 'select' ? (
                    <span key={column.key} className="text-center">
                      {column.label}
                    </span>
                  ) : (
                    <DropdownMenu key={column.key}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-left hover:text-white transition-colors"
                          title={`จัดเรียง ${column.label}`}
                        >
                          {sortConfig?.key === column.key ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-blue-300" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-blue-300" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-blue-300/70" />
                          )}
                          <span>{column.label}</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56 bg-gray-900 border-gray-700 text-gray-100">
                        <DropdownMenuLabel>{column.label}</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-gray-700" />
                        <DropdownMenuItem onClick={() => handleSort(column.key as SortKey, 'asc')}>
                          <ArrowUp className="w-4 h-4" />
                          เรียงลำดับจากน้อยไปมาก
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort(column.key as SortKey, 'desc')}>
                          <ArrowDown className="w-4 h-4" />
                          เรียงลำดับจากมากไปน้อย
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-700" />
                        <DropdownMenuItem onClick={clearSort}>
                          <Trash2 className="w-4 h-4" />
                          ล้างการเรียง
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                ))}
              </div>

              {paginatedStocks.map((stock) => (
                <StockListItem
                  key={stock.ticker}
                  stock={stock}
                  isSelected={selectedStocks.includes(stock.ticker.trim().toUpperCase())}
                  onSelect={handleSelectStock}
                  visibleColumns={visibleColumns}
                  columnTemplate={columnTemplate}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sticky Pagination Bar */}
        {!loading && totalPages > 1 && (
          <div className="sticky bottom-[88px] z-20 border-t border-gray-800/90 bg-gray-900/95 px-4 py-3 backdrop-blur sm:bottom-[96px] sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-700 bg-gray-800/90 px-3 py-2">
              <div className="text-xs text-gray-400 sm:text-sm">
                Page <span className="font-semibold text-blue-300">{currentPage}</span> of {totalPages}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="h-8 rounded-md border border-gray-700 px-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  First
                </button>

                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="h-8 rounded-md border border-gray-700 px-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>

                {paginationItems.map((item, index) => {
                  if (item === 'ellipsis') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-1 text-xs text-gray-500">
                        ...
                      </span>
                    );
                  }

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCurrentPage(item)}
                      className={`h-8 min-w-8 rounded-md border px-2 text-xs font-semibold transition-colors ${
                        item === currentPage
                          ? 'border-blue-400 bg-blue-500/20 text-blue-200 shadow-[0_0_0_1px_rgba(96,165,250,0.25)]'
                          : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="h-8 rounded-md border border-gray-700 px-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="h-8 rounded-md border border-gray-700 px-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Bar */}
        <div className="border-t border-gray-800 px-4 py-3 sm:px-6 sm:py-4 bg-gray-800/95 backdrop-blur space-y-2 sticky bottom-0 z-20">
          <div className="flex gap-2">
            {selectedStocks.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex-1 px-4 py-2.5 text-red-500 bg-transparent border border-red-500 rounded-lg font-medium hover:bg-red-500/10 transition-colors text-sm sm:text-base"
              >
                CLEAR ALL
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={selectedStocks.length < 2}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                selectedStocks.length < 2
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-white text-gray-900 hover:bg-gray-100'
              }`}
            >
              CONFIRM
            </button>
          </div>
          {selectedStocks.length > 0 && (
            <p className="text-xs sm:text-sm text-gray-400 text-center">
              {selectedStocks.length} stock{selectedStocks.length !== 1 ? 's' : ''} selected
            </p>
          )}
          {selectedStocks.length === 1 && (
            <p className="text-xs sm:text-sm text-amber-400 text-center">
              Please select at least 2 stocks to continue.
            </p>
          )}
        </div>
      </div>

      {/* Filter Modal - Full Screen */}
      <FilterPanelModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        selectedFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAll}
        onConfirm={() => setShowFilters(false)}
      />
    </div>
  );
}
