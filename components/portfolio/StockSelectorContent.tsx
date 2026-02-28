'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Loader, AlertCircle } from 'lucide-react';
import { getPortfolioFilters, getPortfolioTickers, CompanyFilter, CompanyProfile } from '@/lib/actions/portfolio.actions';
import SelectAssetHeader from './SelectAssetHeader';
import StockListItem from './StockListItem';
import FilterPanelModal from './FilterPanelModal';
import { useRouter } from 'next/navigation';
import {
  type FilteredStock,
  getFilteredStocksFromSession,
  setFilteredStocksInSession,
} from '@/lib/portfolio-filtered-stocks';

export default function StockSelectorContent() {
  const router = useRouter();
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<CompanyFilter | null>(null);
  const [activeFilters, setActiveFilters] = useState<{
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

  const toFilteredStock = (stock: CompanyProfile): FilteredStock => ({
    symbol: stock.ticker.trim().toUpperCase(),
    name: stock.companyName,
    sector: stock.sector,
    marketCap: 0,
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

        {/* Stock List */}
        <div className="flex-1 overflow-y-auto">
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
            <>
              {stocks.map((stock) => (
                <StockListItem
                  key={stock.ticker}
                  stock={stock}
                  isSelected={selectedStocks.includes(stock.ticker.trim().toUpperCase())}
                  onSelect={handleSelectStock}
                />
              ))}
            </>
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
