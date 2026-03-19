'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AllocationSlice {
  ticker: string;
  companyName?: string;
  sector?: string;
  weightPercent: number;
  allocatedAmount?: number;
}

interface PortfolioAllocationChartProps {
  data: AllocationSlice[];
  expectedReturns?: Record<string, number>;
  volatilityRisk?: Record<string, number>;
}

const COLORS = ['#5862FF', '#0FEDBE', '#FDD458', '#FF8243', '#D13BFF', '#FF495B', '#5B8CFF', '#2DD4BF'];

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: AllocationSlice }>;
  expectedReturns?: Record<string, number>;
  volatilityRisk?: Record<string, number>;
}

function CustomTooltip({ active, payload, expectedReturns, volatilityRisk }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const slice = payload[0]?.payload;
  if (!slice) return null;

  const ticker = slice.ticker;
  const weight = Number(slice.weightPercent ?? 0);
  const ret = expectedReturns?.[ticker] ?? expectedReturns?.[ticker.toLowerCase()];
  const vol = volatilityRisk?.[ticker] ?? volatilityRisk?.[ticker.toLowerCase()];

  return (
    <div
      style={{
        background: '#0f1522',
        border: '1px solid #2b3b54',
        borderRadius: '12px',
        padding: '12px 14px',
        minWidth: '170px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{ticker}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#6e7f99', fontSize: 12 }}>Weight</span>
        <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{weight.toFixed(2)}%</span>
      </div>
      {ret != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#6e7f99', fontSize: 12 }}>Expected Return</span>
          <span style={{ color: ret >= 0 ? '#00e7c2' : '#ff5b5b', fontSize: 12, fontWeight: 600 }}>
            {ret >= 0 ? '+' : ''}{fmtPct(ret)}
          </span>
        </div>
      )}
      {vol != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6e7f99', fontSize: 12 }}>Risk (Vol)</span>
          <span style={{ color: '#ffbf66', fontSize: 12, fontWeight: 600 }}>{fmtPct(vol)}</span>
        </div>
      )}
    </div>
  );
}

export default function PortfolioAllocationChart({ data, expectedReturns, volatilityRisk }: PortfolioAllocationChartProps) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="weightPercent"
            nameKey="ticker"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={40}
            labelLine={false}
            label={false}
          >
            {data.map((entry, index) => (
              <Cell key={`allocation-${entry.ticker}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={(props) => (
              <CustomTooltip
                active={props.active}
                payload={props.payload as Array<{ payload?: AllocationSlice }>}
                expectedReturns={expectedReturns}
                volatilityRisk={volatilityRisk}
              />
            )}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
