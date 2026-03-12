'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { CompanyProfile } from '@/lib/actions/portfolio.actions';

interface StockListItemProps {
  stock: CompanyProfile;
  isSelected: boolean;
  onSelect: (ticker: string) => void;
}

const GRADIENT_COLORS = [
  { from: 'from-blue-500', to: 'to-blue-600', light: 'from-blue-400/30', lightTo: 'to-blue-500/20' },
  { from: 'from-green-500', to: 'to-green-600', light: 'from-green-400/30', lightTo: 'to-green-500/20' },
  { from: 'from-purple-500', to: 'to-purple-600', light: 'from-purple-400/30', lightTo: 'to-purple-500/20' },
  { from: 'from-orange-500', to: 'to-orange-600', light: 'from-orange-400/30', lightTo: 'to-orange-500/20' },
  { from: 'from-pink-500', to: 'to-pink-600', light: 'from-pink-400/30', lightTo: 'to-pink-500/20' },
  { from: 'from-indigo-500', to: 'to-indigo-600', light: 'from-indigo-400/30', lightTo: 'to-indigo-500/20' },
];

const generateColorIndex = (ticker: string): number => {
  const charCodes = ticker.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return charCodes % GRADIENT_COLORS.length;
};

const formatPrice = (price: number): string => {
  return `$${price.toFixed(2)}`;
};

export default function StockListItem({
  stock,
  isSelected,
  onSelect,
}: StockListItemProps) {
  const [imgError, setImgError] = React.useState(false);
  const colorIndex = generateColorIndex(stock.ticker);
  const colors = GRADIENT_COLORS[colorIndex];
  const firstLetter = stock.ticker.charAt(0).toUpperCase();
  const hasPrice = Number.isFinite(stock.latestPrice);
  const price = hasPrice ? Number(stock.latestPrice) : 0;
  const change =
    Number.isFinite(stock.latestPrice) && Number.isFinite(stock.yesterdayPrice) && Number(stock.yesterdayPrice) > 0
      ? ((Number(stock.latestPrice) - Number(stock.yesterdayPrice)) / Number(stock.yesterdayPrice)) * 100
      : 0;
  const isPositive = change >= 0;
  const stockImageUrl = `https://financialmodelingprep.com/image-stock/${stock.ticker}.png`;

  return (
    <div
      onClick={() => onSelect(stock.ticker)}
      className={`group relative flex items-center gap-3 sm:gap-4 px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-800/50 hover:bg-gradient-to-r hover:from-gray-800/40 hover:to-gray-800/20 transition-all duration-200 cursor-pointer ${
        isSelected ? 'bg-gradient-to-r from-blue-700/30 to-cyan-700/30 border-b-gray-700' : ''
      }`}
    >
      {/* Animated Background Glow */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent ${colors.light} to-transparent pointer-events-none`}
      />

      {/* Company Icon - Enhanced */}
      <div
        className={`relative flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-gray-800/40 to-gray-900/60 border border-gray-700/40 flex items-center justify-center font-bold text-white text-sm sm:text-base shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-200 overflow-hidden`}
        title={stock.companyName}
      >
        {!imgError ? (
          <img
            src={stockImageUrl}
            alt={stock.ticker}
            className="w-full h-full object-contain p-1"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          firstLetter
        )}
      </div>

      {/* Company Info - Enhanced */}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-blue-300 transition-colors truncate">
            {stock.ticker}
          </h3>
          <span className="text-xs text-gray-500 hidden sm:inline">
            {stock.primaryExchange}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-gray-400 truncate group-hover:text-gray-300 transition-colors">
          {stock.companyName}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs px-2 py-1 rounded-full bg-gray-800/60 text-gray-300">
            {stock.sector}
          </span>
        </div>
      </div>

      {/* Price & Change - Right Side */}
      <div className="text-right flex-shrink-0 relative z-10">
        <p className="text-sm sm:text-base font-bold text-white group-hover:text-green-400 transition-colors">
          {hasPrice ? formatPrice(price) : 'N/A'}
        </p>
        <div className="flex items-center justify-end gap-1 mt-1">
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
          )}
          <span className={`text-xs sm:text-sm font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Checkbox - Enhanced */}
      <div className="flex-shrink-0 relative z-10">
        <div className={`relative w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 transition-all duration-200 ${
          isSelected
            ? 'bg-gradient-to-br from-blue-500 to-cyan-500 border-blue-400 shadow-lg shadow-blue-500/50'
            : 'border-gray-600 bg-gray-800/50 hover:border-blue-400'
        }`}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(stock.ticker);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label={`Select ${stock.ticker}`}
          />
          {isSelected && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
