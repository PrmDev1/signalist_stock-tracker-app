'use client';

import React, { useState } from 'react';
import PortfolioCard from '@/components/portfolio/PortfolioCard';
import PortfolioEmptyState from '@/components/portfolio/PortfolioEmptyState';
import AddPortfolioModal from '@/components/portfolio/AddPortfolioModal';
import { Plus } from 'lucide-react';

// Mock data - replace with actual data from database
const MOCK_PORTFOLIOS = [
  {
    id: '1',
    name: 'Growth Stock',
    assetCount: 5,
    riskLevel: 'High' as const,
    expectedReturn: 18.5,
    volatility: 27.2,
    lastUpdated: new Date('2024-02-15'),
  },
  {
    id: '2',
    name: 'Balanced Portfolio',
    assetCount: 8,
    riskLevel: 'Medium' as const,
    expectedReturn: 12.3,
    volatility: 15.8,
    lastUpdated: new Date('2024-02-10'),
  },
  {
    id: '3',
    name: 'Conservative Mix',
    assetCount: 10,
    riskLevel: 'Low' as const,
    expectedReturn: 7.5,
    volatility: 9.2,
    lastUpdated: new Date('2024-02-05'),
  },
];

export default function PortfolioPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // TODO: Replace with actual data from database
  const portfolios = MOCK_PORTFOLIOS;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            My Portfolio
          </h1>
          <p className="text-gray-400 mt-2">
            Track & optimize your investments
          </p>
        </div>

        {/* Create Portfolio Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 sm:w-auto sm:px-6 sm:py-3 sm:gap-2"
          title="Create New Portfolio"
        >
          <Plus size={24} />
          <span className="hidden sm:inline font-semibold">Create Portfolio</span>
        </button>
      </div>

      {/* Content */}
      {portfolios.length === 0 ? (
        <PortfolioEmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolios.map((portfolio) => (
            <PortfolioCard
              key={portfolio.id}
              {...portfolio}
              onClick={() => {
                // TODO: Navigate to portfolio details
                console.log('Navigate to portfolio:', portfolio.id);
              }}
            />
          ))}
        </div>
      )}

      {/* Create Portfolio Modal */}
      {isModalOpen && (
        <AddPortfolioModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
