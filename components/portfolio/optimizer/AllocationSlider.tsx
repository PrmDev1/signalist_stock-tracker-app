interface AllocationSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  colorClassName: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  valueLabel?: string;
  helperText?: string;
  disabledText?: string;
  isLoading?: boolean;
  minLabel?: string;
  maxLabel?: string;
}

export default function AllocationSlider({
  label,
  value,
  onChange,
  colorClassName,
  disabled = false,
  min = 0,
  max = 100,
  step = 1,
  valueLabel,
  helperText,
  disabledText = 'ไม่มีหุ้นประเภทนี้จากรายการที่เลือก',
  isLoading = false,
  minLabel,
  maxLabel,
}: AllocationSliderProps) {
  const displayValue = isLoading ? '...' : valueLabel ?? `${value}%`;

  return (
    <label className={`block rounded-lg border px-3 py-3 ${disabled ? 'border-gray-800 bg-gray-900/60 opacity-60' : 'border-gray-700 bg-gray-800/70'}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-200">{label}</span>
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${colorClassName} ${isLoading ? 'animate-pulse' : ''}`}>{displayValue}</span>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-2 w-full animate-pulse rounded-lg bg-gray-700" />
          <p className="text-[11px] text-gray-500">กำลังคำนวณช่วงความเสี่ยงใหม่จากการตั้งค่าล่าสุด...</p>
        </div>
      ) : (
        <>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            disabled={disabled}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-cyan-400 disabled:cursor-not-allowed"
          />
          {(minLabel || maxLabel) ? (
            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
              <span>{minLabel}</span>
              <span>{maxLabel}</span>
            </div>
          ) : null}
          {helperText ? <p className="mt-2 text-[11px] text-gray-400">{helperText}</p> : null}
          {disabled && !helperText ? <p className="mt-2 text-[11px] text-gray-500">{disabledText}</p> : null}
        </>
      )}
    </label>
  );
}
