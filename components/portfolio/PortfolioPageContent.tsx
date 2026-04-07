'use client';

import React, { useState } from 'react';
import PortfolioCard from '@/components/PortfolioCard';
import PortfolioEmptyState from '@/components/portfolio/PortfolioEmptyState';
import AddPortfolioModal from '@/components/portfolio/AddPortfolioModal';
import { Plus } from 'lucide-react';
import type { SavedPortfolioCardData } from '@/lib/actions/cloudflare.actions';

interface PortfolioPageContentProps {
  portfolios: SavedPortfolioCardData[];
}

export default function PortfolioPageContent({ portfolios }: PortfolioPageContentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [portfolioItems, setPortfolioItems] = useState(portfolios);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            พอร์ตลงทุนของฉัน
          </h1>
          <p className="text-lg text-gray-400 mt-2">
            ติดตามและปรับพอร์ตการลงทุนได้ในที่เดียว
          </p>
        </div>

        {/* Create Portfolio Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105 sm:w-auto sm:px-5 sm:py-2.5 sm:gap-2"
          title="สร้างพอร์ตใหม่"
        >
          <Plus size={22} />
          <span className="hidden sm:inline font-semibold">สร้างพอร์ต</span>
        </button>
      </div>

      {/* Content */}
      {portfolioItems.length === 0 ? (
        <PortfolioEmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {portfolioItems.map((portfolio) => (
            <PortfolioCard
              key={portfolio.id}
              {...portfolio}
              onEditSave={(updatedPortfolio) => {
                setPortfolioItems((current) => current.map((item) => item.id === updatedPortfolio.id ? { ...item, ...updatedPortfolio } : item));
              }}
              onDelete={(deletedPortfolioId) => {
                setPortfolioItems((current) => current.filter((item) => item.id !== deletedPortfolioId));
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
