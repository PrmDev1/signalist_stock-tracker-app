interface AllocationSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  colorClassName: string;
  disabled?: boolean;
}

export default function AllocationSlider({
  label,
  value,
  onChange,
  colorClassName,
  disabled = false,
}: AllocationSliderProps) {
  return (
    <label className={`block rounded-lg border px-3 py-3 ${disabled ? 'border-gray-800 bg-gray-900/60 opacity-60' : 'border-gray-700 bg-gray-800/70'}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-200">{label}</span>
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${colorClassName}`}>{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-cyan-400 disabled:cursor-not-allowed"
      />
      {disabled ? <p className="mt-2 text-[11px] text-gray-500">ไม่มีหุ้นประเภทนี้จากรายการที่เลือก</p> : null}
    </label>
  );
}
