interface ScenarioData {
  title: string;
  years: string;
  finalValue: string;
  totalInvested: string;
  netProfitLoss: string;
  drawdown: string;
  profitTone: 'positive' | 'negative';
}

interface InvestedBreakdownItem {
  label: string;
  percent: number;
  amount: string;
  color: string;
}

const EXPECTED_SCENARIO: ScenarioData = {
  title: 'Expected Scenario',
  years: '10Y',
  finalValue: '$1,285,611',
  totalInvested: '$130,000',
  netProfitLoss: '+$1,155,611',
  drawdown: '-31.62%',
  profitTone: 'positive',
};

const WORST_SCENARIO: ScenarioData = {
  title: 'Worst Case Scenario',
  years: '10Y',
  finalValue: '$346,106',
  totalInvested: '$130,000',
  netProfitLoss: '+$216,106',
  drawdown: '-46.23%',
  profitTone: 'positive',
};

const INVESTED_BREAKDOWN: InvestedBreakdownItem[] = [
  { label: 'Stocks', percent: 45, amount: '$900,723.90', color: '#4a7bff' },
  { label: 'Crypto', percent: 38, amount: '$873,900.03', color: '#8f66ff' },
  { label: 'Bonds', percent: 12, amount: '$231,634.67', color: '#ff52b9' },
  { label: 'ETFs', percent: 5, amount: '$165,742.41', color: '#ffb12b' },
];

function ScenarioPanel({ scenario }: { scenario: ScenarioData }) {
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
          <span className="font-semibold text-white">{scenario.finalValue}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Total Invested</span>
          <span className="font-medium text-gray-200">{scenario.totalInvested}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Net Profit / Loss</span>
          <span className={`font-semibold ${scenario.profitTone === 'positive' ? 'text-[#00e7c2]' : 'text-[#ff5b5b]'}`}>
            {scenario.netProfitLoss}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Worst Drawdown</span>
          <span className="font-semibold text-[#ff5b5b]">{scenario.drawdown}</span>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioValueOverview() {
  const totalValue = '$92,765.90';

  return (
    <aside className="rounded-xl border border-[#1f2a3d] bg-[#070b13] p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400">Portfolio value</p>
      <p className="mt-3 text-5xl font-bold leading-none text-white">{totalValue}</p>
      <p className="mt-2 text-xs text-[#ff7070]">↓ 2.25% <span className="ml-2 text-gray-400">-$8,900.73 this month</span></p>

      <div className="mt-4 space-y-2">
        <ScenarioPanel scenario={EXPECTED_SCENARIO} />
        <ScenarioPanel scenario={WORST_SCENARIO} />
      </div>

      <div className="mt-4">
        <p className="text-xs text-gray-400">Where your money is invested</p>
        <div className="mt-2 flex h-3 overflow-hidden rounded-sm border border-[#2b3b54]">
          {INVESTED_BREAKDOWN.map((item) => (
            <span
              key={item.label}
              style={{ width: `${item.percent}%`, backgroundColor: item.color }}
            />
          ))}
        </div>

        <div className="mt-3 space-y-1.5">
          {INVESTED_BREAKDOWN.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <div className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-gray-300">{item.label}</span>
                <span className="rounded bg-[#111f37] px-1 py-0.5 text-[10px] text-[#7db8ff]">{item.percent}%</span>
              </div>
              <span className="text-gray-300">{item.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
