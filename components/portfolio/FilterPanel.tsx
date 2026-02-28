'use client';

import React from 'react';
import { X } from 'lucide-react';
import { CompanyFilter } from '@/lib/actions/portfolio.actions';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: CompanyFilter | null;
  selectedFilters: {
    sector?: string;
    exchange?: string;
    filerSize?: string;
    isSmallerReporting?: boolean;
    isEmergingGrowth?: boolean;
  };
  onFilterChange: (filterName: string, value: any) => void;
  onClearAll: () => void;
  onConfirm: () => void;
  showAllSectors?: boolean;
  onToggleShowAllSectors?: () => void;
}

export default function FilterPanel({
  isOpen,
  onClose,
  filters,
  selectedFilters,
  onFilterChange,
  onClearAll,
  onConfirm,
  showAllSectors = false,
  onToggleShowAllSectors = () => {},
}: FilterPanelProps) {
  if (!isOpen) return null;

  // Get sectors to display (top 10 or all)
  const sectorsToDisplay = showAllSectors 
    ? filters?.sectors || []
    : filters?.topSectors || filters?.sectors?.slice(0, 10) || [];

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-30 md:hidden"
        onClick={onClose}
      />

      {/* Filter Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xs bg-gray-900 border-l border-gray-800 z-40 flex flex-col md:relative md:border md:border-gray-800 md:rounded-lg md:w-64 md:max-w-none md:h-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-800 md:hidden">
          <h2 className="text-lg font-bold text-white">Filters</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close filters"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 space-y-6">
          {/* Sector Filter */}
          {(filters?.topSectors || filters?.sectors) && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">
                  {showAllSectors ? 'All Sectors' : 'Top Sectors'}
                </h3>
              </div>
              <div className="space-y-2">
                {sectorsToDisplay.map((sector) => (
                  <label key={sector} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sector"
                      value={sector}
                      checked={selectedFilters.sector === sector}
                      onChange={() => onFilterChange('sector', sector)}
                      className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-300 hover:text-white">
                      {sector}
                    </span>
                  </label>
                ))}
              </div>
              
              {/* Show All / Show Less Toggle */}
              {filters?.sectors && filters.sectors.length > 10 && (
                <button
                  onClick={onToggleShowAllSectors}
                  className="text-xs text-blue-400 hover:text-blue-300 mt-3 font-medium transition-colors"
                >
                  {showAllSectors ? '↑ Show Top 10' : '↓ Show All Sectors'}
                </button>
              )}
              
              {selectedFilters.sector && (
                <button
                  onClick={() => onFilterChange('sector', undefined)}
                  className="text-xs text-gray-400 hover:text-gray-300 mt-2 block"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Exchange Filter */}
          {filters?.exchanges && filters.exchanges.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Exchange</h3>
              <div className="space-y-2">
                {filters.exchanges.map((exchange) => (
                  <label key={exchange} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exchange"
                      value={exchange}
                      checked={selectedFilters.exchange === exchange}
                      onChange={() => onFilterChange('exchange', exchange)}
                      className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-300 hover:text-white">
                      {exchange}
                    </span>
                  </label>
                ))}
                {selectedFilters.exchange && (
                  <button
                    onClick={() => onFilterChange('exchange', undefined)}
                    className="text-xs text-gray-400 hover:text-gray-300 mt-2"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Filer Size Filter */}
          {filters?.filerSizes && filters.filerSizes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Filer Size</h3>
              <div className="space-y-2">
                {filters.filerSizes.map((size) => (
                  <label key={size} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="filerSize"
                      value={size}
                      checked={selectedFilters.filerSize === size}
                      onChange={() => onFilterChange('filerSize', size)}
                      className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-300 hover:text-white">
                      {size}
                    </span>
                  </label>
                ))}
                {selectedFilters.filerSize && (
                  <button
                    onClick={() => onFilterChange('filerSize', undefined)}
                    className="text-xs text-gray-400 hover:text-gray-300 mt-2"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SRC Checkbox */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFilters.isSmallerReporting ?? false}
                onChange={() =>
                  onFilterChange(
                    'isSmallerReporting',
                    !(selectedFilters.isSmallerReporting ?? false)
                  )
                }
                className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
              />
              <span className="text-sm text-gray-300 hover:text-white">
                Smaller Reporting Company (SRC)
              </span>
            </label>
          </div>

          {/* EGC Checkbox */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFilters.isEmergingGrowth ?? false}
                onChange={() =>
                  onFilterChange(
                    'isEmergingGrowth',
                    !(selectedFilters.isEmergingGrowth ?? false)
                  )
                }
                className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
              />
              <span className="text-sm text-gray-300 hover:text-white">
                Emerging Growth Company (EGC)
              </span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-800 px-4 py-3 sm:px-6 sm:py-4 space-y-2 md:hidden">
          <button
            onClick={onClearAll}
            className="w-full px-4 py-2 text-red-500 bg-transparent border border-red-500 rounded-lg font-medium hover:bg-red-500/10 transition-colors text-sm"
          >
            Clear All
          </button>
          <button
            onClick={onConfirm}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            Confirm
          </button>
        </div>
      </div>
    </>
  );
}
