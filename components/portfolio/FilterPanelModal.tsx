'use client';

import React, { useState } from 'react';
import { X, ChevronRight, ArrowLeft, Check } from 'lucide-react';
import { CompanyFilter, SectorHierarchyItem } from '@/lib/actions/portfolio.actions';

interface SectorMeta {
  emoji: string;
  gradient: string;
}

function getSectorMeta(officeSector: string): SectorMeta {
  const s = officeSector.toLowerCase();
  if (s.includes('technology')) return { emoji: '💻', gradient: 'from-blue-500 to-cyan-400' };
  if (s.includes('crypto') && !s.includes('finance')) return { emoji: '₿', gradient: 'from-purple-600 to-violet-400' };
  if (s.includes('energy') && s.includes('transport')) return { emoji: '⚡', gradient: 'from-orange-500 to-amber-400' };
  if (s.includes('finance') && s.includes('crypto')) return { emoji: '💹', gradient: 'from-violet-500 to-blue-400' };
  if (s.includes('finance')) return { emoji: '🏦', gradient: 'from-blue-600 to-sky-400' };
  if (s.includes('international')) return { emoji: '🌐', gradient: 'from-indigo-500 to-purple-400' };
  if (s.includes('life sciences')) return { emoji: '🧬', gradient: 'from-emerald-500 to-green-400' };
  if (s.includes('manufacturing')) return { emoji: '🏭', gradient: 'from-slate-500 to-gray-400' };
  if (s.includes('real estate') || s.includes('construction')) return { emoji: '🏗️', gradient: 'from-rose-500 to-pink-400' };
  if (s.includes('structured')) return { emoji: '📊', gradient: 'from-sky-500 to-blue-400' };
  if (s.includes('trade') && s.includes('energy')) return { emoji: '🚚', gradient: 'from-lime-500 to-green-400' };
  if (s.includes('trade') || s.includes('services')) return { emoji: '🛍️', gradient: 'from-teal-500 to-green-400' };
  if (s.includes('industrial') || s.includes('applications')) return { emoji: '🔬', gradient: 'from-teal-600 to-cyan-400' };
  return { emoji: '📁', gradient: 'from-gray-500 to-gray-400' };
}

function displaySectorName(officeSector: string): string {
  return officeSector
    .replace(/^Office of\s+/i, '')
    .replace(/\s+or\s+Office of\s+/gi, ' / ');
}

interface FilterPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: CompanyFilter | null;
  selectedFilters: {
    officeSector?: string;
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
  const [drillSector, setDrillSector] = useState<SectorHierarchyItem | null>(null);

  if (!isOpen) return null;

  const hierarchy = filters?.sectorHierarchy ?? [];

  const selectedParent = selectedFilters.sector
    ? hierarchy.find((h) => h.industries.includes(selectedFilters.sector!))
    : selectedFilters.officeSector
    ? hierarchy.find((h) => h.officeSector === selectedFilters.officeSector)
    : undefined;

  const handleIndustrySelect = (industry: string) => {
    const newValue = selectedFilters.sector === industry ? undefined : industry;
    // Select specific industry → clear officeSector, set sector
    onFilterChange('officeSector', undefined);
    onFilterChange('sector', newValue);
    if (newValue) {
      setDrillSector(null);
      onConfirm();
    }
  };

  const handleApplyOfficeSector = () => {
    if (!drillSector) return;
    // Apply whole group → clear sector, set officeSector
    onFilterChange('sector', undefined);
    onFilterChange('officeSector', drillSector.officeSector);
    setDrillSector(null);
    onConfirm();
  };

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-[linear-gradient(180deg,rgba(5,8,16,0.94),rgba(4,6,12,0.98))] backdrop-blur-md tv-scrollbar">
      <div className="flex min-h-full w-full items-stretch justify-center">
        <div className="flex min-h-full w-full flex-col bg-[linear-gradient(180deg,rgba(10,12,20,0.98),rgba(7,8,15,0.98))]">
      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 border-b border-white/6 px-4 pb-4 pt-6 sm:px-6 sm:pt-7">
        {drillSector ? (
          <button
            onClick={() => setDrillSector(null)}
            className="-ml-2 flex-shrink-0 rounded-full p-2 transition-colors hover:bg-white/10"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
        ) : null}

        <div className="flex-1 min-w-0">
          {drillSector ? (
            <h1 className="text-xl font-bold text-white truncate">
              {displaySectorName(drillSector.officeSector)}
            </h1>
          ) : (
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Sectors</h1>
          )}
        </div>

        <button
          onClick={() => { setDrillSector(null); onClose(); }}
          className="flex-shrink-0 rounded-full p-2 transition-colors hover:bg-white/10"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      {/* ── CONTENT ── */}
      <div className="pb-4">
        {drillSector ? (
          /* ── Industry drill-down ── */
          <div>
            <p className="px-4 sm:px-6 pt-1 pb-3 text-sm text-gray-500">
              {drillSector.industries.length} industries
            </p>
            <ul className="divide-y divide-white/5">
              {drillSector.industries.map((industry) => {
                const isSelected = selectedFilters.sector === industry;
                return (
                  <li key={industry}>
                    <button
                      onClick={() => handleIndustrySelect(industry)}
                      className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                    >
                      <span className={`text-sm leading-snug pr-4 ${isSelected ? 'text-blue-300 font-semibold' : 'text-gray-200'}`}>
                        {industry.charAt(0) + industry.slice(1).toLowerCase()}
                      </span>
                      {isSelected && (
                        <Check className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          /* ── Sector top-level list (Dime-style) ── */
          <div>
            {/* Active filter banner */}
            {(selectedFilters.sector || selectedFilters.officeSector) && (
              <div className="mx-4 sm:mx-6 mt-2 mb-4 flex items-center justify-between bg-blue-500/15 border border-blue-500/30 rounded-2xl px-4 py-3">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide">Active Filter</p>
                  <p className="text-sm text-white mt-0.5 truncate">
                    {selectedFilters.sector
                      ? selectedFilters.sector.charAt(0) + selectedFilters.sector.slice(1).toLowerCase()
                      : selectedFilters.officeSector
                      ? displaySectorName(selectedFilters.officeSector)
                      : ''}
                  </p>
                  {selectedParent && !selectedFilters.officeSector && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {displaySectorName(selectedParent.officeSector)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    onFilterChange('sector', undefined);
                    onFilterChange('officeSector', undefined);
                  }}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Sector list */}
            <ul className="divide-y divide-white/5">
              {hierarchy.map((item) => {
                const meta = getSectorMeta(item.officeSector);
                const isActive = selectedParent?.officeSector === item.officeSector;
                return (
                  <li key={item.officeSector}>
                    <button
                      onClick={() => setDrillSector(item)}
                      className="w-full flex items-center gap-4 px-4 sm:px-6 py-4 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                    >
                      {/* Colored icon circle */}
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${meta.gradient}`}
                      >
                        <span className="text-xl leading-none">{meta.emoji}</span>
                      </div>

                      {/* Name + industry count */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-base font-semibold truncate ${isActive ? 'text-blue-300' : 'text-white'}`}>
                          {displaySectorName(item.officeSector)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.industries.length} industries
                        </p>
                      </div>

                      {/* Active indicator */}
                      {isActive && (
                        <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                      )}

                      <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* ── More Filters ── */}
            {((filters?.exchanges && filters.exchanges.length > 0) ||
              (filters?.specialStatuses && filters.specialStatuses.length > 0) ||
              (filters?.filerSizes && filters.filerSizes.length > 0)) && (
              <div className="mx-4 sm:mx-6 mt-6 mb-8 space-y-4">
                <h2 className="text-lg font-bold text-white">More Filters</h2>

                {/* Exchange */}
                {filters?.exchanges && filters.exchanges.length > 0 && (
                  <div className="bg-white/5 rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Exchange</h3>
                    <div className="flex flex-wrap gap-2">
                      {filters.exchanges.map((exchange) => (
                        <button
                          key={exchange}
                          onClick={() =>
                            onFilterChange('exchange', selectedFilters.exchange === exchange ? undefined : exchange)
                          }
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            selectedFilters.exchange === exchange
                              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                              : 'bg-white/10 text-gray-300 hover:bg-white/15'
                          }`}
                        >
                          {exchange}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filer Size */}
                {filters?.filerSizes && filters.filerSizes.length > 0 && (
                  <div className="bg-white/5 rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Company Size</h3>
                    <div className="flex flex-wrap gap-2">
                      {filters.filerSizes.map((size) => (
                        <button
                          key={size}
                          onClick={() =>
                            onFilterChange('filerSize', selectedFilters.filerSize === size ? undefined : size)
                          }
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            selectedFilters.filerSize === size
                              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                              : 'bg-white/10 text-gray-300 hover:bg-white/15'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Special Status */}
                {filters?.specialStatuses && filters.specialStatuses.length > 0 && (
                  <div className="bg-white/5 rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Special Status</h3>
                    <div className="space-y-3">
                      {filters.specialStatuses.map((status) => {
                        const isChecked =
                          status.id === 'isSmallerReporting'
                            ? selectedFilters.isSmallerReporting ?? false
                            : selectedFilters.isEmergingGrowth ?? false;
                        return (
                          <button
                            key={status.id}
                            onClick={() => onFilterChange(status.id, !isChecked)}
                            className="w-full flex items-center gap-3 text-left"
                          >
                            <div
                              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                isChecked
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-gray-600 bg-transparent'
                              }`}
                            >
                              {isChecked && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <span className="text-sm text-gray-200">{status.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div className="shrink-0 border-t border-white/10 bg-[rgba(8,10,17,0.98)] px-4 py-4 sm:px-6">
        {drillSector ? (
          <div className="flex gap-3">
            <button
              onClick={() => setDrillSector(null)}
              className="flex-1 py-3.5 rounded-2xl border border-white/15 text-gray-300 font-semibold hover:bg-white/5 transition-colors text-sm"
            >
              Back
            </button>
            <button
              onClick={handleApplyOfficeSector}
              className="flex-1 py-3.5 rounded-2xl bg-white text-black font-bold hover:bg-gray-100 transition-colors text-sm"
            >
              Apply All {displaySectorName(drillSector.officeSector)}
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => { onClearAll(); setDrillSector(null); }}
              className="flex-1 py-3.5 rounded-2xl border border-white/15 text-gray-300 font-semibold hover:bg-white/5 transition-colors text-sm"
            >
              Clear All
            </button>
            <button
              onClick={() => { setDrillSector(null); onConfirm(); }}
              className="flex-1 py-3.5 rounded-2xl bg-white text-black font-bold hover:bg-gray-100 transition-colors text-sm"
            >
              Apply Filters
            </button>
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  );
}
