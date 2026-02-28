import { Trash2 } from 'lucide-react';
import type { PreviewPanelProps } from './types';

export default function PreviewPanel({
  selectedStocks,
  riskTolerance,
  investmentHorizon,
  returnPriority,
  rebalancingFrequency,
  maxAllocationPerStock,
  onRemoveStock,
}: PreviewPanelProps) {
  return (
    <aside className="space-y-6">
      <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Portfolio Preview</h2>
        <div className="space-y-2 text-sm text-gray-300">
          <p><span className="text-gray-500">Risk Profile:</span> {riskTolerance}</p>
          <p><span className="text-gray-500">Horizon:</span> {investmentHorizon}</p>
          <p><span className="text-gray-500">Return Bias:</span> {returnPriority}%</p>
          <p><span className="text-gray-500">Rebalancing:</span> {rebalancingFrequency}</p>
          <p><span className="text-gray-500">Constraint:</span> Max {maxAllocationPerStock}% / stock</p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Selected Stocks</h2>
          <span className="text-xs text-gray-500">{selectedStocks.length} assets</span>
        </div>

        <div className="space-y-2 md:hidden">
          {selectedStocks.map((stock) => (
            <article key={`${stock.symbol}-${stock.name}`} className="rounded-lg border border-gray-700 bg-gray-700/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{stock.symbol}</p>
                  <p className="text-xs text-gray-300">{stock.name}</p>
                  <p className="text-xs text-gray-500">{stock.sector}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveStock(stock.symbol)}
                  aria-label={`Remove ${stock.symbol} from selected stocks`}
                  className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-gray-700 md:block">
          <table className="w-full">
            <thead className="bg-gray-700/70">
              <tr className="text-left">
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">Symbol</th>
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">Sector</th>
                <th className="px-3 py-2 text-right text-xs uppercase tracking-wide text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {selectedStocks.map((stock) => (
                <tr key={`${stock.symbol}-${stock.sector}`} className="border-t border-gray-700">
                  <td className="px-3 py-2 text-sm font-semibold text-white">{stock.symbol}</td>
                  <td className="px-3 py-2 text-sm text-gray-300">{stock.sector}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onRemoveStock(stock.symbol)}
                      aria-label={`Remove ${stock.symbol} from selected stocks`}
                      className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20"
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
    </aside>
  );
}
