'use client';

import { Building2, Trash2 } from 'lucide-react';

export interface EditablePortfolioAsset {
  id: string;
  symbol: string;
  companyName: string;
  tag: string;
  shares: number;
  weight: number;
  price: number;
}

interface EditableAssetRowProps {
  asset: EditablePortfolioAsset;
  onRemove: (id: string) => void;
}

export default function EditableAssetRow({
  asset,
  onRemove,
}: EditableAssetRowProps) {
  return (
    <div className="rounded-2xl border border-[#22324d] bg-[linear-gradient(180deg,rgba(12,19,33,0.95),rgba(10,16,28,0.92))] p-4 shadow-[0_16px_35px_rgba(0,0,0,0.25)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-[#365a91] bg-[#11203a] px-2.5 py-1 text-sm font-semibold tracking-wide text-[#8bc1ff]">
              {asset.symbol}
            </span>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-300">
              {asset.tag}
            </span>
          </div>
          <p className="mt-2 truncate text-sm font-medium text-gray-200">{asset.companyName}</p>

          <div className="mt-4 inline-flex items-center gap-2 text-xs text-gray-500">
            <Building2 className="h-3.5 w-3.5" />
            Read-only stock information for review before re-optimizing
          </div>
        </div>

        <button
          type="button"
          aria-label={`Remove ${asset.symbol}`}
          title={`Remove ${asset.symbol}`}
          onClick={() => onRemove(asset.id)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 transition-colors hover:border-red-400/50 hover:bg-red-500/20"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}