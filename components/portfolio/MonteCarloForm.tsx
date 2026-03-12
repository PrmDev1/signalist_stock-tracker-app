"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { MonteCarloRequest } from "@/components/portfolio/analysis-types";

interface MonteCarloFormProps {
  mvoHashId: string;
  loading?: boolean;
  defaultValues?: Partial<Pick<MonteCarloRequest, "initialCapital" | "monthlyDca" | "investmentHorizon">>;
  onSubmit: (payload: MonteCarloRequest) => Promise<void> | void;
}

interface FormErrors {
  initialCapital?: string;
  monthlyDca?: string;
  investmentHorizon?: string;
}

const MIN_HORIZON = 1;
const MAX_HORIZON = 20;

export default function MonteCarloForm({
  mvoHashId,
  loading = false,
  defaultValues,
  onSubmit,
}: MonteCarloFormProps) {
  const [initialCapital, setInitialCapital] = useState<number>(defaultValues?.initialCapital ?? 10000);
  const [monthlyDca, setMonthlyDca] = useState<number>(defaultValues?.monthlyDca ?? 0);
  const [investmentHorizon, setInvestmentHorizon] = useState<number>(defaultValues?.investmentHorizon ?? 10);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveLoading = loading || isSubmitting;

  const totalProjectedContribution = useMemo(
    () => initialCapital + monthlyDca * 12 * investmentHorizon,
    [initialCapital, monthlyDca, investmentHorizon]
  );

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!Number.isFinite(initialCapital) || initialCapital <= 0) {
      nextErrors.initialCapital = "เงินลงทุนตั้งต้นต้องมากกว่า 0";
    }

    if (!Number.isFinite(monthlyDca) || monthlyDca < 0) {
      nextErrors.monthlyDca = "เงินออมรายเดือนต้องมากกว่าหรือเท่ากับ 0";
    }

    if (
      !Number.isFinite(investmentHorizon) ||
      investmentHorizon < MIN_HORIZON ||
      investmentHorizon > MAX_HORIZON
    ) {
      nextErrors.investmentHorizon = "ระยะเวลาลงทุนต้องอยู่ระหว่าง 1 ถึง 20 ปี";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate() || !mvoHashId.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        mvoHashId,
        initialCapital,
        monthlyDca,
        investmentHorizon,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-700 bg-gray-800/60 p-4 sm:p-5"
      noValidate
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">ข้อมูลสำหรับจำลองอนาคต</h3>
        <p className="mt-1 text-sm text-gray-400">กำหนดเงินตั้งต้น เงินออมรายเดือน และระยะเวลาลงทุน</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="initialCapital" className="mb-1 block text-sm font-medium text-gray-200">
            เงินลงทุนตั้งต้น (USD)
          </label>
          <Input
            id="initialCapital"
            type="number"
            min={1}
            step={100}
            value={Number.isFinite(initialCapital) ? initialCapital : 0}
            onChange={(event) => setInitialCapital(Number(event.target.value))}
            placeholder="10000"
            disabled={effectiveLoading}
          />
          {errors.initialCapital ? <p className="mt-1 text-xs text-red-400">{errors.initialCapital}</p> : null}
        </div>

        <div>
          <label htmlFor="monthlyDca" className="mb-1 block text-sm font-medium text-gray-200">
            เงินออมรายเดือน DCA (USD)
          </label>
          <Input
            id="monthlyDca"
            type="number"
            min={0}
            step={50}
            value={Number.isFinite(monthlyDca) ? monthlyDca : 0}
            onChange={(event) => setMonthlyDca(Number(event.target.value))}
            placeholder="0"
            disabled={effectiveLoading}
          />
          {errors.monthlyDca ? <p className="mt-1 text-xs text-red-400">{errors.monthlyDca}</p> : null}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label htmlFor="investmentHorizonRange" className="text-sm font-medium text-gray-200">
              ระยะเวลาลงทุน (ปี)
            </label>
            <span className="rounded-md border border-gray-600 px-2 py-0.5 text-xs text-gray-300">
              {investmentHorizon}y
            </span>
          </div>

          <input
            id="investmentHorizonRange"
            type="range"
            min={MIN_HORIZON}
            max={MAX_HORIZON}
            value={investmentHorizon}
            onChange={(event) => setInvestmentHorizon(Number(event.target.value))}
            disabled={effectiveLoading}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-emerald-400"
          />

          <Input
            className="mt-2"
            type="number"
            min={MIN_HORIZON}
            max={MAX_HORIZON}
            step={1}
            value={Number.isFinite(investmentHorizon) ? investmentHorizon : MIN_HORIZON}
            onChange={(event) => setInvestmentHorizon(Number(event.target.value))}
            disabled={effectiveLoading}
          />

          {errors.investmentHorizon ? (
            <p className="mt-1 text-xs text-red-400">{errors.investmentHorizon}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-gray-700 bg-gray-900/50 p-3">
        <p className="text-xs uppercase tracking-wide text-gray-400">เงินสะสมรวมตามแผน</p>
        <p className="text-lg font-semibold text-emerald-300">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(totalProjectedContribution)}
        </p>
      </div>

      <Button type="submit" disabled={effectiveLoading || !mvoHashId.trim()} className="mt-4 w-full">
        {effectiveLoading ? "กำลังจำลอง..." : "เริ่มจำลอง Monte Carlo"}
      </Button>
    </form>
  );
}
