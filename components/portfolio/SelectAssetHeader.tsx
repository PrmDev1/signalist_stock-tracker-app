'use client';

import React from 'react';
import { X, Search, Settings, ArrowLeft } from 'lucide-react';

interface SelectAssetHeaderProps {
  onClose: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onFilterToggle: () => void;
}

export default function SelectAssetHeader({
  onClose,
  searchValue,
  onSearchChange,
  onFilterToggle,
}: SelectAssetHeaderProps) {
  return (
    <header className="shrink-0 border-b border-white/8 bg-[linear-gradient(180deg,rgba(12,16,27,0.96),rgba(10,14,24,0.92))]">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-xl border border-white/8 bg-white/[0.03] p-2 transition-all duration-200 hover:bg-white/[0.07]"
          aria-label="Close"
          title="Back to portfolio"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300 hover:text-white transition-colors" />
        </button>

        {/* Title with Gradient */}
        <div className="flex-1">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-300 bg-clip-text text-transparent sm:text-2xl">
            Select Assets
          </h1>
          <p className="mt-0.5 text-xs text-gray-400 sm:text-sm">
            Search and filter stocks to build your portfolio
          </p>
        </div>

        {/* Filter Button with Badge */}
        <button
          onClick={onFilterToggle}
          className="group relative flex-shrink-0 rounded-xl border border-white/8 bg-white/[0.03] p-2 transition-all duration-200 hover:bg-gradient-to-br hover:from-blue-500/20 hover:to-cyan-500/20"
          aria-label="Open filters"
          title="Open filter panel"
        >
          <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300 group-hover:text-blue-400 transition-colors" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"></span>
        </button>
      </div>

      {/* Search Bar - Enhanced */}
      <div className="border-t border-white/6 px-4 py-4 sm:px-6 sm:py-5">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
          <input
            type="text"
            placeholder="Search by ticker or company name..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(20,24,35,0.88),rgba(16,20,30,0.72))] py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 transition-all duration-200 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:py-3.5 sm:pl-12 sm:text-base"
            aria-label="Search stocks"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-700 rounded transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
