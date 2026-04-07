import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface PresetCardProps {
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  isAvailable: boolean;
  badge?: string;
}

export default function PresetCard({
  title,
  subtitle,
  description,
  icon: Icon,
  href,
  isAvailable,
  badge,
}: PresetCardProps) {
  const cardBody = (
    <div
      className={`group relative h-full rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${
        isAvailable
          ? 'border-[#265089] bg-[linear-gradient(160deg,rgba(8,16,30,0.96),rgba(9,18,34,0.9))] shadow-[0_16px_40px_rgba(0,0,0,0.35)] hover:-translate-y-1 hover:border-[#3e75bd] hover:shadow-[0_20px_50px_rgba(20,80,180,0.25)]'
          : 'border-[#1f2a3d] bg-[linear-gradient(160deg,rgba(9,14,24,0.95),rgba(8,13,22,0.92))] opacity-85'
      }`}
    >
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top_right,rgba(78,136,255,0.12),transparent_45%)]" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#2b3b54] bg-[#0d1729] text-[#7db8ff]">
          <Icon className="h-6 w-6" />
        </div>
        {badge ? (
          <span className={`rounded-md border px-2 py-1 text-[11px] font-medium ${isAvailable ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300' : 'border-[#3a4b67] bg-[#121c2d] text-gray-400'}`}>
            {badge}
          </span>
        ) : null}
      </div>

      <div className="relative mt-5 space-y-2">
        <h3 className={`text-xl font-semibold ${isAvailable ? 'text-white' : 'text-gray-200'}`}>{title}</h3>
        <p className="text-sm text-[#7db8ff]">{subtitle}</p>
        <p className="text-sm leading-relaxed text-gray-400">{description}</p>
      </div>

      {isAvailable ? (
        <div className="relative mt-6 inline-flex items-center gap-2 text-sm font-medium text-emerald-300">
          <span>เริ่มด้วยรูปแบบนี้</span>
          <span className="transition-transform duration-300 group-hover:translate-x-1">{'->'}</span>
        </div>
      ) : (
        <div className="relative mt-6 text-sm text-gray-500">จะพร้อมใช้งานเมื่อเปิดใช้ Preset API</div>
      )}
    </div>
  );

  if (isAvailable && href) {
    return (
      <Link href={href} className="block h-full">
        {cardBody}
      </Link>
    );
  }

  return <div className="h-full">{cardBody}</div>;
}
