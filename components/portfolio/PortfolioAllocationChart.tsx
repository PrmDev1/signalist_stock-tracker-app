'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

function getMetricValue(record: Record<string, number> | undefined, ticker: string): number | null {
  if (!record) return null;

  const direct = record[ticker];
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct;

  const upper = record[ticker.toUpperCase()];
  if (typeof upper === 'number' && Number.isFinite(upper)) return upper;

  const lower = record[ticker.toLowerCase()];
  if (typeof lower === 'number' && Number.isFinite(lower)) return lower;

  return null;
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
  const ret = getMetricValue(expectedReturns, ticker);
  const vol = getMetricValue(volatilityRisk, ticker);

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const detailRows = useMemo(
    () =>
      data.map((slice) => ({
        ...slice,
        expectedReturn: getMetricValue(expectedReturns, slice.ticker),
        volatility: getMetricValue(volatilityRisk, slice.ticker),
      })),
    [data, expectedReturns, volatilityRisk]
  );

  const hasMetricDetails = detailRows.some((row) => row.expectedReturn != null || row.volatility != null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">สัดส่วนการลงทุน</h3>
        {hasMetricDetails ? (
          mounted ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#2b3b54] bg-[#0b111d] text-[11px] font-semibold text-[#9dc4ff] transition-colors hover:border-[#45618b] hover:text-white"
                  aria-label="ดูผลตอบแทนและความเสี่ยงรายหุ้น"
                  suppressHydrationWarning
                >
                  i
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={10}
                className="w-[320px] rounded-2xl border-[#1f2a3d] bg-[#0b111d] p-3 text-white"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-white">ผลตอบแทนและความเสี่ยงรายหุ้น</p>
                  <p className="text-[11px] text-gray-500">จากข้อมูล explainability ของพอร์ต</p>
                </div>

                <div className="space-y-2">
                  {detailRows.map((row, index) => (
                    <div
                      key={`metric-${row.ticker}-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_88px_92px] items-center gap-3 rounded-xl border border-[#182233] bg-[#09101b] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{row.ticker}</p>
                        <p className="mt-0.5 text-xs text-gray-500">น้ำหนัก {row.weightPercent.toFixed(2)}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Return</p>
                        <p className={`mt-0.5 text-sm font-semibold ${row.expectedReturn != null && row.expectedReturn < 0 ? 'text-[#ff7a7a]' : 'text-[#00e7c2]'}`}>
                          {row.expectedReturn != null ? `${row.expectedReturn >= 0 ? '+' : ''}${fmtPct(row.expectedReturn)}` : 'ไม่มีข้อมูล'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Risk</p>
                        <p className="mt-0.5 text-sm font-semibold text-[#ffbf66]">
                          {row.volatility != null ? fmtPct(row.volatility) : 'ไม่มีข้อมูล'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#2b3b54] bg-[#0b111d] text-[11px] font-semibold text-[#9dc4ff]"
              aria-hidden="true"
              suppressHydrationWarning
            >
              i
            </span>
          )
        ) : null}
      </div>

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
    </div>
  );
}
