'use client';

import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { CompanyFilter } from '@/lib/actions/portfolio.actions';

interface FilterPanelModalProps {
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
}

export default function FilterPanelModal({
  isOpen,
  onClose,
  filters,
  selectedFilters,
  onFilterChange,
  onClearAll,
  onConfirm,
}: FilterPanelModalProps) {
  if (!isOpen) return null;

  const [expandedSections, setExpandedSections] = useState({
    sector: true,
    exchange: false,
    filerSize: false,
    specialStatus: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Get sectors to display (top 10)
  const sectorsToDisplay = filters?.topSectors || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-6 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800/50 border-b border-gray-700/50">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
            🔍 Advanced Filters
          </h1>
          <p className="text-xm sm:text-sm text-gray-400 mt-1">
            Refine your stock search with advanced options
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 sm:p-3 hover:bg-red-500/20 rounded-lg transition-all duration-200 hover:scale-110"
          aria-label="Close filters"
        >
          <X className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 hover:text-red-400 transition-colors" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-900 px-4 py-6 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5">
          {/* Sector Filter */}
          {sectorsToDisplay && sectorsToDisplay.length > 0 && (
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-700 transition-all duration-200 group">
              <button
                onClick={() => toggleSection('sector')}
                className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 hover:bg-gray-800/60 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
                  <div className="text-left">
                    <h2 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                      Recommand Sectors
                    </h2>
                    <p className="text-xs text-gray-400">Most popular industries</p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                    expandedSections.sector ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedSections.sector && (
                <div className="border-t border-gray-700/30 px-4 sm:px-5 py-4 space-y-2 bg-gray-800/20">
                  {sectorsToDisplay.map((sector) => (
                    <label
                      key={sector}
                      className="flex items-center gap-3 cursor-pointer p-2.5 hover:bg-gray-700/40 rounded-lg transition-all duration-200 group/item"
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          selectedFilters.sector === sector
                            ? 'border-blue-500 bg-gradient-to-br from-blue-500 to-cyan-500'
                            : 'border-gray-600 hover:border-blue-400 bg-gray-800'
                        }`}
                        onClick={() => onFilterChange('sector', selectedFilters.sector === sector ? undefined : sector)}
                      >
                        {selectedFilters.sector === sector && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </div>
                      <span
                        className="text-sm sm:text-base text-gray-300 group-hover/item:text-white transition-colors flex-1 cursor-pointer"
                        onClick={() => onFilterChange('sector', selectedFilters.sector === sector ? undefined : sector)}
                      >
                        {sector}
                      </span>
                      {selectedFilters.sector === sector && (
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Selected</span>
                      )}
                    </label>
                  ))}

                  {selectedFilters.sector && (
                    <button
                      onClick={() => onFilterChange('sector', undefined)}
                      className="mt-3 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors w-full text-center py-2 hover:bg-blue-500/10 rounded-lg"
                    >
                      ✕ Clear Sector
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Exchange Filter */}
          {filters?.exchanges && filters.exchanges.length > 0 && (
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-700 transition-all duration-200 group">
              <button
                onClick={() => toggleSection('exchange')}
                className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 hover:bg-gray-800/60 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <div className="text-left">
                    <h2 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                      Exchange
                    </h2>
                    <p className="text-xs text-gray-400">Stock market</p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                    expandedSections.exchange ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedSections.exchange && (
                <div className="border-t border-gray-700/30 px-4 sm:px-5 py-4 space-y-2 bg-gray-800/20">
                  {filters.exchanges.map((exchange) => (
                    <label
                      key={exchange}
                      className="flex items-center gap-3 cursor-pointer p-2.5 hover:bg-gray-700/40 rounded-lg transition-all duration-200 group/item"
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          selectedFilters.exchange === exchange
                            ? 'border-green-500 bg-gradient-to-br from-green-500 to-emerald-500'
                            : 'border-gray-600 hover:border-green-400 bg-gray-800'
                        }`}
                        onClick={() => onFilterChange('exchange', selectedFilters.exchange === exchange ? undefined : exchange)}
                      >
                        {selectedFilters.exchange === exchange && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </div>
                      <span
                        className="text-sm sm:text-base text-gray-300 group-hover/item:text-white transition-colors flex-1 cursor-pointer"
                        onClick={() => onFilterChange('exchange', selectedFilters.exchange === exchange ? undefined : exchange)}
                      >
                        {exchange}
                      </span>
                      {selectedFilters.exchange === exchange && (
                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">Selected</span>
                      )}
                    </label>
                  ))}

                  {selectedFilters.exchange && (
                    <button
                      onClick={() => onFilterChange('exchange', undefined)}
                      className="mt-3 text-sm text-green-400 hover:text-green-300 font-medium transition-colors w-full text-center py-2 hover:bg-green-500/10 rounded-lg"
                    >
                      ✕ Clear Exchange
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Filer Size Filter */}
          {filters?.filerSizes && filters.filerSizes.length > 0 && (
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-700 transition-all duration-200 group">
              <button
                onClick={() => toggleSection('filerSize')}
                className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 hover:bg-gray-800/60 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📈</span>
                  <div className="text-left">
                    <h2 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                      Company Size
                    </h2>
                    <p className="text-xs text-gray-400">Market capitalization</p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                    expandedSections.filerSize ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedSections.filerSize && (
                <div className="border-t border-gray-700/30 px-4 sm:px-5 py-4 space-y-2 bg-gray-800/20">
                  {filters.filerSizes.map((size) => (
                    <label
                      key={size}
                      className="flex items-center gap-3 cursor-pointer p-2.5 hover:bg-gray-700/40 rounded-lg transition-all duration-200 group/item"
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          selectedFilters.filerSize === size
                            ? 'border-purple-500 bg-gradient-to-br from-purple-500 to-pink-500'
                            : 'border-gray-600 hover:border-purple-400 bg-gray-800'
                        }`}
                        onClick={() => onFilterChange('filerSize', selectedFilters.filerSize === size ? undefined : size)}
                      >
                        {selectedFilters.filerSize === size && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </div>
                      <span
                        className="text-sm sm:text-base text-gray-300 group-hover/item:text-white transition-colors flex-1 cursor-pointer"
                        onClick={() => onFilterChange('filerSize', selectedFilters.filerSize === size ? undefined : size)}
                      >
                        {size}
                      </span>
                      {selectedFilters.filerSize === size && (
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">Selected</span>
                      )}
                    </label>
                  ))}

                  {selectedFilters.filerSize && (
                    <button
                      onClick={() => onFilterChange('filerSize', undefined)}
                      className="mt-3 text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors w-full text-center py-2 hover:bg-purple-500/10 rounded-lg"
                    >
                      ✕ Clear Size
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Special Status (SRC & EGC) */}
          {filters?.specialStatuses && filters.specialStatuses.length > 0 && (
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-700 transition-all duration-200 group">
              <button
                onClick={() => toggleSection('specialStatus')}
                className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 hover:bg-gray-800/60 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⭐</span>
                  <div className="text-left">
                    <h2 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                      Special Status
                    </h2>
                    <p className="text-xs text-gray-400">SRC & EGC companies</p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                    expandedSections.specialStatus ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedSections.specialStatus && (
                <div className="border-t border-gray-700/30 px-4 sm:px-5 py-4 space-y-2 bg-gray-800/20">
                  {filters.specialStatuses.map((status) => (
                    <label
                      key={status.id}
                      className="flex items-center gap-3 cursor-pointer p-2.5 hover:bg-gray-700/40 rounded-lg transition-all duration-200 group/item"
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          (status.id === 'isSmallerReporting'
                            ? selectedFilters.isSmallerReporting
                            : selectedFilters.isEmergingGrowth)
                            ? 'border-yellow-500 bg-gradient-to-br from-yellow-500 to-orange-500'
                            : 'border-gray-600 hover:border-yellow-400 bg-gray-800'
                        }`}
                        onClick={() => {
                          const currentValue = status.id === 'isSmallerReporting'
                            ? selectedFilters.isSmallerReporting
                            : selectedFilters.isEmergingGrowth;
                          onFilterChange(status.id, !currentValue);
                        }}
                      >
                        {(status.id === 'isSmallerReporting'
                          ? selectedFilters.isSmallerReporting
                          : selectedFilters.isEmergingGrowth) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span
                        className="text-sm sm:text-base text-gray-300 group-hover/item:text-white transition-colors flex-1 cursor-pointer"
                        onClick={() => {
                          const currentValue = status.id === 'isSmallerReporting'
                            ? selectedFilters.isSmallerReporting
                            : selectedFilters.isEmergingGrowth;
                          onFilterChange(status.id, !currentValue);
                        }}
                      >
                        {status.label}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-700/50 bg-gradient-to-t from-gray-900 to-gray-900/50 px-4 py-4 sm:px-6 sm:py-5 space-y-3 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button
            onClick={onClearAll}
            className="flex-1 px-4 py-3 text-red-400 bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/30 rounded-lg font-bold hover:from-red-500/20 hover:to-red-600/20 hover:border-red-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20 active:scale-95"
          >
            🗑️ CLEAR ALL
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-bold hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95"
          >
            ✓ APPLY FILTERS
          </button>
        </div>
      </div>
    </div>
  );
}
