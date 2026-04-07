import { Trash2 } from 'lucide-react';
import type { PreviewPanelProps } from './types';

export default function PreviewPanel({
  selectedStocks,
  onRemoveStock,
}: PreviewPanelProps) {
  const formatPrice = (price?: number) => {
    if (!Number.isFinite(price)) return 'N/A';
    return `$${Number(price).toFixed(2)}`;
  };

  const formatChange = (value?: number) => {
    if (!Number.isFinite(value)) return 'N/A';
    const numeric = Number(value);
    return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(2)}%`;
  };

  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,35,0.96),rgba(11,15,24,0.98))] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.22)] sm:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white sm:text-2xl">Selected stocks</h2>
          <p className="mt-1 text-sm text-gray-400">Review and refine the stocks that will be included in the RoboAdvisor optimization.</p>
        </div>
        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-gray-300">
          <span className="text-xs text-gray-500">{selectedStocks.length} ตัว</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:hidden">
        {selectedStocks.map((stock) => (
          <article key={`${stock.symbol}-${stock.name}`} className="rounded-[20px] border border-gray-700 bg-gray-700/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{stock.symbol}</p>
                <p className="mt-1 text-sm text-gray-300">{stock.name}</p>
                <p className="mt-1 text-xs text-gray-500">{stock.sector}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveStock(stock.symbol)}
                aria-label={`ลบ ${stock.symbol} ออกจากรายการ`}
                className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                ลบ
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-300">
              <div>
                <p className="text-gray-500">ราคา</p>
                <p className="mt-1">{formatPrice(stock.latestPrice)}</p>
              </div>
              <div>
                <p className="text-gray-500">วันล่าสุด</p>
                <p className="mt-1">{formatChange(stock.dayChangePercent)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-gray-700 md:block">
        <table className="w-full table-fixed">
            <thead className="bg-gray-700/70">
              <tr className="text-left">
                <th className="w-[14%] px-4 py-3 text-[11px] uppercase tracking-wide text-gray-400">Symbol</th>
                <th className="w-[32%] px-4 py-3 text-[11px] uppercase tracking-wide text-gray-400">Name</th>
                <th className="w-[24%] px-4 py-3 text-[11px] uppercase tracking-wide text-gray-400">Sector</th>
                <th className="w-[12%] px-4 py-3 text-[11px] uppercase tracking-wide text-gray-400">Price</th>
                <th className="w-[10%] px-4 py-3 text-[11px] uppercase tracking-wide text-gray-400">1D</th>
                <th className="w-[12%] px-5 py-3 text-right text-[11px] uppercase tracking-wide text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {selectedStocks.map((stock) => (
                <tr key={`${stock.symbol}-${stock.sector}`} className="border-t border-gray-700">
                  <td className="px-4 py-3 text-sm font-semibold text-white">{stock.symbol}</td>
                  <td className="truncate px-4 py-3 text-sm text-gray-200">{stock.name}</td>
                  <td className="truncate px-4 py-3 text-sm text-gray-300">{stock.sector}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{formatPrice(stock.latestPrice)}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{formatChange(stock.dayChangePercent)}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onRemoveStock(stock.symbol)}
                      aria-label={`ลบ ${stock.symbol} ออกจากรายการ`}
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-red-500/35 bg-red-500/8 px-3.5 py-2 text-xs text-red-200 transition-colors hover:bg-red-500/16"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
        </table>
      </div>
    </section>
  );
}
