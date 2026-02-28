import type { ParameterPanelProps, RiskTolerance } from './types';

export default function ParameterPanel({
  investmentAmount,
  setInvestmentAmount,
  riskTolerance,
  setRiskTolerance,
  investmentHorizon,
  setInvestmentHorizon,
  rebalancingFrequency,
  setRebalancingFrequency,
  modelName,
  setModelName,
  brokerMinOrder,
  setBrokerMinOrder,
  maxAllocationPerStock,
  setMaxAllocationPerStock,
  returnPriority,
  setReturnPriority,
  requireDiversification,
  setRequireDiversification,
  lookbackYears,
  status,
  statusMessage,
  canRunOptimization,
  onOptimize,
  onReset,
  onBack,
}: ParameterPanelProps) {
  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white sm:text-xl">Optimization Parameters</h2>
      <p className="mt-1 text-sm text-gray-400">Adjust your preferences and constraints before optimization.</p>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="investmentAmount" className="mb-1 block text-sm font-medium text-gray-300">Investment Amount (USD)</label>
          <input
            id="investmentAmount"
            type="number"
            min={100}
            value={investmentAmount}
            onChange={(e) => setInvestmentAmount(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder:text-gray-500 focus:border-blue-600 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">Total capital to allocate across selected stocks.</p>
        </div>

        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-medium text-gray-300">Risk Tolerance</p>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as RiskTolerance[]).map((risk) => {
              const active = riskTolerance === risk;
              return (
                <button
                  key={risk}
                  type="button"
                  onClick={() => setRiskTolerance(risk)}
                  aria-pressed={active}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {risk.charAt(0).toUpperCase() + risk.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="investmentHorizon" className="mb-1 block text-sm font-medium text-gray-300">Investment Horizon</label>
          <select
            id="investmentHorizon"
            value={investmentHorizon}
            onChange={(e) => setInvestmentHorizon(e.target.value as typeof investmentHorizon)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-600 focus:outline-none"
          >
            <option value="short">Short Term</option>
            <option value="medium">Medium Term</option>
            <option value="long">Long Term</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">Lookback period is auto-set to {lookbackYears} years.</p>
        </div>

        <div>
          <label htmlFor="rebalancingFrequency" className="mb-1 block text-sm font-medium text-gray-300">Rebalancing Frequency</label>
          <select
            id="rebalancingFrequency"
            value={rebalancingFrequency}
            onChange={(e) => setRebalancingFrequency(e.target.value as typeof rebalancingFrequency)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-600 focus:outline-none"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="semiannual">Semi-Annual</option>
            <option value="annual">Annual</option>
          </select>
        </div>

        <div>
          <label htmlFor="modelName" className="mb-1 block text-sm font-medium text-gray-300">Optimization Model</label>
          <select
            id="modelName"
            value={modelName}
            onChange={(e) => setModelName(e.target.value as 'mvo' | 'semi')}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-600 focus:outline-none"
          >
            <option value="mvo">MVO (Mean-Variance)</option>
            <option value="semi">Semi-Variance</option>
          </select>
        </div>

        <div>
          <label htmlFor="brokerMinOrder" className="mb-1 block text-sm font-medium text-gray-300">Broker Min. Order (USD)</label>
          <input
            id="brokerMinOrder"
            type="number"
            step="0.01"
            value={brokerMinOrder}
            onChange={(e) => setBrokerMinOrder(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder:text-gray-500 focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="maxAllocationPerStock" className="mb-1 block text-sm font-medium text-gray-300">
            Max Allocation per Stock ({maxAllocationPerStock}%)
          </label>
          <input
            id="maxAllocationPerStock"
            type="range"
            min={5}
            max={100}
            step={1}
            value={maxAllocationPerStock}
            onChange={(e) => setMaxAllocationPerStock(Number(e.target.value))}
            className="w-full"
          />
          <p className="mt-1 text-xs text-gray-500">Constraint parameter for concentration control.</p>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="returnPriority" className="mb-1 block text-sm font-medium text-gray-300">
            Expected Return Priority vs Risk Priority ({returnPriority}% return)
          </label>
          <input
            id="returnPriority"
            type="range"
            min={0}
            max={100}
            step={1}
            value={returnPriority}
            onChange={(e) => setReturnPriority(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="md:col-span-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={requireDiversification}
              onChange={(e) => setRequireDiversification(e.target.checked)}
              className="h-4 w-4"
            />
            Require diversification guard
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onOptimize}
          disabled={status === 'PROCESSING' || !canRunOptimization}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600"
        >
          {status === 'PROCESSING' ? 'Optimizing...' : 'Optimize Portfolio'}
        </button>
        <button
          onClick={onReset}
          type="button"
          className="rounded-lg border border-gray-600 bg-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-600"
        >
          Reset Parameters
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-gray-600 bg-transparent px-5 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-700"
        >
          Back to Filter Page
        </button>
      </div>

      {statusMessage && <p className="mt-3 text-sm text-gray-400">{statusMessage}</p>}
    </section>
  );
}
