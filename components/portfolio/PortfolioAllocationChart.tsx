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
}

const COLORS = ['#5862FF', '#0FEDBE', '#FDD458', '#FF8243', '#D13BFF', '#FF495B', '#5B8CFF', '#2DD4BF'];

export default function PortfolioAllocationChart({ data }: PortfolioAllocationChartProps) {
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
            outerRadius={110}
            innerRadius={42}
            labelLine={false}
            label={(props) => {
              const payload = (props as { payload?: AllocationSlice }).payload;
              const ticker = payload?.ticker ?? '';
              const weightPercent = Number(payload?.weightPercent ?? 0);
              return `${ticker} ${weightPercent.toFixed(2)}%`;
            }}
          >
            {data.map((entry, index) => (
              <Cell key={`allocation-${entry.ticker}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`${Number(value ?? 0).toFixed(2)}%`, 'Weight']}
            labelFormatter={(label) => `Ticker: ${String(label)}`}
            cursor={{ fill: 'rgba(255, 255, 255, 0.06)' }}
            contentStyle={{
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '12px',
              color: '#0F172A',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.25)',
              padding: '10px 12px',
            }}
            itemStyle={{ color: '#0F172A', fontWeight: 600 }}
            labelStyle={{ color: '#334155', fontWeight: 700 }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
