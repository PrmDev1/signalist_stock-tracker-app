'use client';

import React from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface PortfolioCardProps {
  id: string;
  name: string;
  assetCount: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  expectedReturn: number;
  volatility: number;
  lastUpdated?: Date;
  onClick?: () => void;
}

export default function PortfolioCard({
  id,
  name,
  assetCount,
  riskLevel,
  expectedReturn,
  volatility,
  lastUpdated,
  onClick,
}: PortfolioCardProps) {
  const riskColor =
    riskLevel === 'Low'
      ? 'text-green-400'
      : riskLevel === 'Medium'
        ? 'text-yellow-400'
        : 'text-red-400';

  const returnColor = expectedReturn > 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-2xl p-6 hover:border-neutral-600 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{name}</h3>
          <p className="text-sm text-gray-400">{assetCount} assets</p>
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <TrendingUp size={24} className="text-white" />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-neutral-700 my-4"></div>

      {/* Status Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-300">Status Portfolio</h4>

        <div className="space-y-2">
          {/* Risk Level */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className={riskColor} />
              <span className="text-sm text-gray-400">{riskLevel} risk</span>
            </div>
            <span className={`text-sm font-semibold ${riskColor}`}>
              {volatility.toFixed(1)}%
            </span>
          </div>

          {/* Expected Return */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Expected return</span>
            <span className={`text-sm font-semibold ${returnColor}`}>
              {expectedReturn > 0 ? '+' : ''}
              {expectedReturn.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="mt-4 pt-4 border-t border-neutral-700">
          <p className="text-xs text-gray-500">
            Last updated{' '}
            {lastUpdated.toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
