interface StatCardProps {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'negative' | 'info';
  helperText?: string;
}

const toneClassMap: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-white',
  positive: 'text-[#00e7c2]',
  negative: 'text-[#ff5b5b]',
  info: 'text-[#7cc4ff]',
};

export default function StatCard({
  label,
  value,
  tone = 'default',
  helperText,
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-[#1f2a3d] bg-[#070b13] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.12em] text-gray-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${toneClassMap[tone]}`}>{value}</p>
      {helperText ? <p className="mt-0.5 text-[11px] text-gray-500">{helperText}</p> : null}
    </div>
  );
}
