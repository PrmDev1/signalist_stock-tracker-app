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
    <header className="sticky top-0 z-40 w-full bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800/50 border-b border-gray-700/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-800/60 rounded-lg transition-all duration-200 flex-shrink-0 hover:scale-110"
          aria-label="Close"
          title="Back to portfolio"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300 hover:text-white transition-colors" />
        </button>

        {/* Title with Gradient */}
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
            Select Assets
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
            Search and filter stocks to build your portfolio
          </p>
        </div>

        {/* Filter Button with Badge */}
        <button
          onClick={onFilterToggle}
          className="relative p-2 hover:bg-gradient-to-br hover:from-blue-500/20 hover:to-cyan-500/20 rounded-lg transition-all duration-200 flex-shrink-0 hover:scale-110 group"
          aria-label="Open filters"
          title="Open filter panel"
        >
          <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300 group-hover:text-blue-400 transition-colors" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"></span>
        </button>
      </div>

      {/* Search Bar - Enhanced */}
      <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-700/30">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
          <input
            type="text"
            placeholder="Search by ticker or company name..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-11 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-gradient-to-r from-gray-800/80 to-gray-800/60 border border-gray-700/50 rounded-lg text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30 focus:from-gray-800 focus:to-gray-750 transition-all duration-200 backdrop-blur-sm"
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
