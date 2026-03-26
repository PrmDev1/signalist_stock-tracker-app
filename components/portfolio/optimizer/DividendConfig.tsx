'use client';

import { WalletCards } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { PortfolioConfigurationState } from './preset-config.types';

interface DividendConfigProps {
  value: PortfolioConfigurationState;
  onChange: (next: PortfolioConfigurationState) => void;
}

interface DividendFormValues {
  lookbackYears: number;
}

export default function DividendConfig({ value, onChange }: DividendConfigProps) {
  const { control, register } = useForm<DividendFormValues>({
    mode: 'onChange',
    defaultValues: {
      lookbackYears: Math.max(5, Math.min(15, Number.isFinite(value.lookbackYears) ? value.lookbackYears : 10)),
    },
  });

  const lookbackYears = useWatch({ control, name: 'lookbackYears' });
  const lastSentRef = useRef<string>('');

  useEffect(() => {
    const next: PortfolioConfigurationState = {
      preset: 'dividend',
      customMethod: 'mhr',
      lookbackYears: Math.max(5, Math.min(15, Math.round(Number(lookbackYears) || 10))),
      span: 250,
      targetAllocations: {},
      assetFilterTag: 'dividend',
    };

    const serialized = JSON.stringify(next);
    if (serialized === lastSentRef.current) return;

    lastSentRef.current = serialized;
    onChange(next);
  }, [lookbackYears, onChange]);

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-gray-900 to-gray-900 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/10">
            <WalletCards className="h-5 w-5 text-sky-300" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white sm:text-lg">Dividend Mode</h3>
            <p className="text-xs text-sky-200/80">สายชิล เน้นปันผล</p>
          </div>
        </div>
        <span className="rounded-md border border-sky-300/40 bg-sky-400/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-200">
          mhr locked
        </span>
      </div>

      <div>
        <label htmlFor="dividend-lookback-years" className="mb-1 block text-sm font-medium text-gray-300">
          Lookback Years
        </label>
        <input
          id="dividend-lookback-years"
          type="number"
          min={5}
          max={15}
          className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
          {...register('lookbackYears', {
            valueAsNumber: true,
            min: 5,
            max: 15,
          })}
        />
        <p className="mt-1 text-xs text-gray-400">ขั้นต่ำ 5 ปี และแนะนำ 10 - 15 ปี เพื่อดูความสม่ำเสมอของเงินปันผล</p>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-3 text-xs text-gray-300">
        โหมดนี้ซ่อนการตั้งค่า span และ target allocations โดยระบบจะส่ง targetAllocations เป็น {} และใช้ MHR อัตโนมัติ
      </div>
    </section>
  );
}
