"use client";

import type {
  EducationalInsights,
  ExpectedMetrics,
  RealizedMetrics,
} from "@/components/portfolio/analysis-types";

interface ModelAccuracyCardProps {
  expectedMetrics?: ExpectedMetrics | null;
  realizedMetrics?: RealizedMetrics | null;
  educationalInsights?: EducationalInsights | null;
  loading?: boolean;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function calculateAccuracy(expected: number, realized: number): number {
  const denominator = Math.max(Math.abs(expected), 0.01);
  const deltaPct = (Math.abs(realized - expected) / denominator) * 100;
  return clamp(100 - deltaPct);
}

function MetricBar({ label, accuracy }: { label: string; accuracy: number }) {
  const tone = accuracy >= 80 ? "bg-emerald-500" : accuracy >= 60 ? "bg-yellow-500" : "bg-orange-500";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm text-gray-200 sm:text-base">
        <span className="font-medium">{label}</span>
        <span className="text-lg font-semibold text-gray-100 sm:text-2xl">{accuracy.toFixed(1)}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-700 sm:h-3.5">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${accuracy}%` }} />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-4 sm:p-5">
      <div className="h-6 w-48 animate-pulse rounded bg-gray-700" />
      <div className="mt-4 h-20 animate-pulse rounded-xl bg-gray-700/70" />
      <div className="mt-3 h-20 animate-pulse rounded-xl bg-gray-700/70" />
    </div>
  );
}

export default function ModelAccuracyCard({
  expectedMetrics,
  realizedMetrics,
  educationalInsights,
  loading = false,
}: ModelAccuracyCardProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!expectedMetrics || !realizedMetrics) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-600 bg-gray-800/30 p-5 text-sm text-gray-300">
        ตัวชี้วัดความแม่นยำของโมเดลจะแสดงเมื่อมีทั้งค่าคาดการณ์และค่าที่เกิดขึ้นจริง
      </div>
    );
  }

  const returnAccuracy = calculateAccuracy(
    expectedMetrics.expectedAnnualReturnPct,
    realizedMetrics.realizedAnnualReturnPct
  );
  const riskAccuracy = calculateAccuracy(
    expectedMetrics.expectedAnnualVolatilityPct,
    realizedMetrics.realizedAnnualVolatilityPct
  );

  const returnDelta = realizedMetrics.realizedAnnualReturnPct - expectedMetrics.expectedAnnualReturnPct;
  const riskDelta = realizedMetrics.realizedAnnualVolatilityPct - expectedMetrics.expectedAnnualVolatilityPct;

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800/60 p-5 sm:p-6">
      <h3 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">ประเมินความแม่นยำของโมเดล</h3>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
          <p className="text-sm uppercase tracking-wide text-gray-300">ผลตอบแทนที่โมเดลคาดไว้</p>
          <p className="mt-1.5 text-4xl font-semibold leading-none text-gray-100 sm:text-[2.2rem]">{expectedMetrics.expectedAnnualReturnPct.toFixed(2)}%</p>
          <p className="mt-3 text-lg text-gray-200">ค่าที่เกิดขึ้นจริง: {realizedMetrics.realizedAnnualReturnPct.toFixed(2)}%</p>
          <p className={`mt-1.5 text-xl font-semibold ${returnDelta >= 0 ? "text-emerald-300" : "text-orange-300"}`}>
            ส่วนต่าง: {returnDelta >= 0 ? "+" : ""}{returnDelta.toFixed(2)}%
          </p>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
          <p className="text-sm uppercase tracking-wide text-gray-300">ความผันผวนที่โมเดลคาดไว้</p>
          <p className="mt-1.5 text-4xl font-semibold leading-none text-gray-100 sm:text-[2.2rem]">{expectedMetrics.expectedAnnualVolatilityPct.toFixed(2)}%</p>
          <p className="mt-3 text-lg text-gray-200">ค่าที่เกิดขึ้นจริง: {realizedMetrics.realizedAnnualVolatilityPct.toFixed(2)}%</p>
          <p className={`mt-1.5 text-xl font-semibold ${riskDelta <= 0 ? "text-emerald-300" : "text-orange-300"}`}>
            ส่วนต่าง: {riskDelta >= 0 ? "+" : ""}{riskDelta.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <MetricBar label="ความแม่นยำด้านผลตอบแทน" accuracy={returnAccuracy} />
        <MetricBar label="ความแม่นยำด้านความเสี่ยง" accuracy={riskAccuracy} />
      </div>

      <div className="mt-5 space-y-3 text-lg leading-relaxed text-gray-200">
        {educationalInsights?.modelAccuracyReturnMsg ? <p>{educationalInsights.modelAccuracyReturnMsg}</p> : null}
        {educationalInsights?.modelAccuracyRiskMsg ? <p>{educationalInsights.modelAccuracyRiskMsg}</p> : null}
      </div>
    </section>
  );
}
