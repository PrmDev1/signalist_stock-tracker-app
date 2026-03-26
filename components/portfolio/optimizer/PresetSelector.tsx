import type { PortfolioPreset } from './preset-config.types';

interface PresetSelectorProps {
  value: PortfolioPreset;
  onChange: (preset: PortfolioPreset) => void;
}

const PRESET_OPTIONS: Array<{ value: PortfolioPreset; label: string; description: string }> = [
  { value: 'growth', label: 'Growth', description: 'High growth momentum focus' },
  { value: 'dividend', label: 'Dividend', description: 'Income and dividend consistency' },
  { value: 'balanced', label: 'Balanced', description: 'Diversified growth + income' },
  { value: 'custom', label: 'Custom', description: 'Choose every parameter manually' },
];

export default function PresetSelector({ value, onChange }: PresetSelectorProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-300">Portfolio Preset</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PRESET_OPTIONS.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={`rounded-xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 ${
                active
                  ? 'border-cyan-400/70 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]'
                  : 'border-gray-600 bg-gray-700/40 hover:border-gray-500 hover:bg-gray-700'
              }`}
            >            >
              <p className={`text-sm font-semibold ${active ? 'text-cyan-200' : 'text-gray-100'}`}>{option.label}</p>
              <p className="mt-1 text-xs text-gray-400">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
