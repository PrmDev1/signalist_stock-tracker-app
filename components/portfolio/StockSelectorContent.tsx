'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Loader, AlertCircle, Columns3, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { getPortfolioFilters, getPortfolioTickers, CompanyFilter, CompanyProfile } from '@/lib/actions/portfolio.actions';
import SelectAssetHeader from './SelectAssetHeader';
import StockListItem, { type StockColumnKey, type StockColumnVisibility } from './StockListItem';
import FilterPanelModal from './FilterPanelModal';
import { useRouter } from 'next/navigation';
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
  const [stocks, setStocks] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(50);
  const [selectedStockMap, setSelectedStockMap] = useState<Record<string, FilteredStock>>({});
  type SortKey = Exclude<StockColumnKey, 'select'>;
  type SortDirection = 'asc' | 'desc';
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
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
    if (!sortConfig) return stocks;

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

    return [...stocks].sort((a, b) => {
      const av = getSortValue(a, sortConfig.key);
      const bv = getSortValue(b, sortConfig.key);

      if (typeof av === 'string' && typeof bv === 'string') {
        const result = av.localeCompare(bv);
        return sortConfig.direction === 'asc' ? result : -result;
      }

      const result = Number(av) - Number(bv);
      return sortConfig.direction === 'asc' ? result : -result;
    });
  }, [stocks, sortConfig]);

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
    tag: typeof stock.portfolioCategory === 'string' && stock.portfolioCategory.trim().length > 0
      ? stock.portfolioCategory.trim().toLowerCase()
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

    const previouslySelected = getFilteredStocksFromSession();
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

  // Fetch stocks when search, filters, or page changes
  useEffect(() => {
    const fetchStocks = async () => {
      setLoading(true);
      setError(null);

      const response = await getPortfolioTickers(currentPage, pageSize, {
        search: searchTerm || undefined,
        officeSector: activeFilters.officeSector,
        sector: activeFilters.sector,
        exchange: activeFilters.exchange,
        filerSize: activeFilters.filerSize,
        isSmallerReporting: activeFilters.isSmallerReporting,
        isEmergingGrowth: activeFilters.isEmergingGrowth,
      });

      if (response.success && response.tickers) {
        setStocks(response.tickers);
        setTotalCount(response.count || 0);
      } else {
        setError(response.error || 'Failed to fetch stocks');
        setStocks([]);
      }
      setLoading(false);
    };

    // Debounce search
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1);
      fetchStocks();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, activeFilters, currentPage, pageSize]);

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
    const foundStock = stocks.find((stock) => stock.ticker.trim().toUpperCase() === normalizedTicker);
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
    setFilteredStocksInSession([]);
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

      setFilteredStocksInSession(filteredStocks);
      router.push('/portfolio/optimizer');
    }
  };

  const handleClose = () => {
    router.back();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

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

        {/* Stock List */}
        <div className="flex-1 overflow-auto">
          {loading && (
            <div className="flex items-center justify-center h-32">
              <Loader className="w-8 h-8 text-blue-500 animate-spin" />
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

          {!loading && !error && stocks.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <p className="text-sm">No stocks found. Try adjusting your filters.</p>
            </div>
          )}

          {!loading && stocks.length > 0 && (
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

              {sortedStocks.map((stock) => (
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

        {/* Pagination */}
        {!loading && stocks.length > 0 && totalPages > 1 && (
          <div className="border-t border-gray-800 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-xs sm:text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
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
