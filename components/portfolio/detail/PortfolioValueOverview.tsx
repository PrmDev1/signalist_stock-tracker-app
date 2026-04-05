import type { InvestedBreakdownItem, PortfolioScenarioSummary } from '@/components/dashboard/single-portfolio-types';

interface PortfolioValueOverviewProps {
  portfolioValue: number;
  profitLoss: number;
  profitLossPercent: number;
  expectedScenario?: PortfolioScenarioSummary | null;
  worstScenario?: PortfolioScenarioSummary | null;
  investedBreakdown: InvestedBreakdownItem[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedCurrency(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

function formatSignedPercent(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function ScenarioPanel({ scenario }: { scenario: PortfolioScenarioSummary }) {
  return (
    <div className="rounded-lg border border-[#1f2a3d] bg-[#0a1019] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold text-gray-200">{scenario.title}</p>
        <span className="rounded border border-[#2b3b54] px-1.5 py-0.5 text-[10px] text-gray-400">
          {scenario.years}
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Final Value</span>
          <span className="font-semibold text-white">{formatCurrency(scenario.finalValue)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Total Invested</span>
          <span className="font-medium text-gray-200">{formatCurrency(scenario.totalInvested)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Net Profit / Loss</span>
          <span className={`font-semibold ${scenario.profitTone === 'positive' ? 'text-[#00e7c2]' : 'text-[#ff5b5b]'}`}>
            {formatSignedCurrency(scenario.netProfitLoss)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Worst Drawdown</span>
          <span className="font-semibold text-[#ff5b5b]">-{Math.abs(scenario.drawdown).toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioValueOverview({
  portfolioValue,
  profitLoss,
  profitLossPercent,
  expectedScenario,
  worstScenario,
  investedBreakdown,
}: PortfolioValueOverviewProps) {
  const toneClass = profitLoss >= 0 ? 'text-[#00e7c2]' : 'text-[#ff7070]';

  return (
    <aside className="rounded-xl border border-[#1f2a3d] bg-[#070b13] p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400">Portfolio value</p>
      <p className="mt-3 text-5xl font-bold leading-none text-white">{formatCurrency(portfolioValue)}</p>
      <p className={`mt-2 text-xs ${toneClass}`}>
        {profitLoss >= 0 ? '↑' : '↓'} {formatSignedPercent(profitLossPercent)}
        <span className="ml-2 text-gray-400">{formatSignedCurrency(profitLoss)} versus invested capital</span>
      </p>

      {expectedScenario || worstScenario ? (
        <div className="mt-4 space-y-2">
          {expectedScenario ? <ScenarioPanel scenario={expectedScenario} /> : null}
          {worstScenario ? <ScenarioPanel scenario={worstScenario} /> : null}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-[#2b3b54] bg-[#0a1019] p-3 text-xs text-gray-400">
          Monte Carlo scenarios will appear here after the simulation completes.
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs text-gray-400">Where your money is invested</p>
        <div className="mt-2 flex h-3 overflow-hidden rounded-sm border border-[#2b3b54]">
          {investedBreakdown.map((item) => (
            <span
              key={item.label}
              style={{ width: `${item.percent}%`, backgroundColor: item.color }}
            />
          ))}
        </div>

        <div className="mt-3 space-y-1.5">
          {investedBreakdown.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <div className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-gray-300">{item.label}</span>
                <span className="rounded bg-[#111f37] px-1 py-0.5 text-[10px] text-[#7db8ff]">{item.percent}%</span>
              </div>
              <span className="text-gray-300">{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
