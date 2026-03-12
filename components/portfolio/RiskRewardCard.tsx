"use client";

import { Star } from "lucide-react";
import type { RiskRewardProfile } from "@/components/portfolio/analysis-types";

interface RiskRewardCardProps {
  profile?: RiskRewardProfile | null;
  loading?: boolean;
}

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-4 sm:p-5">
      <div className="h-6 w-44 animate-pulse rounded bg-gray-700" />
      <div className="mt-3 h-8 w-28 animate-pulse rounded bg-gray-700/80" />
      <div className="mt-3 h-5 w-40 animate-pulse rounded bg-gray-700/80" />
      <div className="mt-3 h-16 animate-pulse rounded-xl bg-gray-700/70" />
    </div>
  );
}

export default function RiskRewardCard({ profile, loading = false }: RiskRewardCardProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-600 bg-gray-800/30 p-5 text-sm text-gray-300">
        ยังไม่มีข้อมูลประเมินความคุ้มค่าความเสี่ยงสำหรับผลลัพธ์นี้
      </div>
    );
  }

  const safeStars = Math.max(1, Math.min(5, Math.round(profile.stars)));

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800/60 p-4 sm:p-5">
      <h3 className="text-lg font-semibold text-white">คะแนนความคุ้มค่าความเสี่ยง</h3>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-gray-700 bg-gray-900/50 p-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">{profile.ratioType}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{profile.ratioValue.toFixed(2)}</p>
        </div>
        <div className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          {profile.label}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, index) => {
          const filled = index < safeStars;
          return (
            <Star
              key={`star-${index}`}
              className={`h-5 w-5 ${filled ? "fill-yellow-400 text-yellow-400" : "text-gray-500"}`}
            />
          );
        })}
      </div>

      <p className="mt-3 text-sm text-gray-300">{profile.description}</p>
    </section>
  );
}
