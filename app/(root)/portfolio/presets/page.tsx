import type { Metadata } from 'next';
import { CandlestickChart, HandCoins, Scale, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import PresetCard from '@/components/portfolio/PresetCard';

export const metadata: Metadata = {
  title: 'Portfolio Presets | Stocks Portfolio',
  description: 'Choose a preset strategy to start building your portfolio',
};

const PRESETS = [
  {
    title: 'Growth Portfolio',
    subtitle: 'พอร์ตเน้นการเติบโต',
    description:
      'Focuses on high-upside growth stocks with stronger momentum, suitable for long-term capital appreciation.',
    icon: CandlestickChart,
    isAvailable: false,
    badge: 'Coming Soon',
  },
  {
    title: 'Dividend Portfolio',
    subtitle: 'พอร์ตเน้นเงินปันผล',
    description:
      'Prioritizes quality dividend-paying companies for steady income and lower overall volatility profile.',
    icon: HandCoins,
    isAvailable: false,
    badge: 'Requires API',
  },
  {
    title: 'Balanced Portfolio',
    subtitle: 'พอร์ตผสมผสาน',
    description:
      'Blends growth and income assets to target moderate risk with consistent long-term portfolio stability.',
    icon: Scale,
    isAvailable: false,
    badge: 'Coming Soon',
  },
  {
    title: 'Custom Portfolio',
    subtitle: 'พอร์ตกำหนดเอง',
    description:
      'Choose assets manually and optimize allocation with AI insights based on your own risk and time horizon.',
    icon: SlidersHorizontal,
    isAvailable: true,
    href: '/portfolio/select-stocks',
    badge: 'Ready',
  },
] as const;

export default function PortfolioPresetSelectionPage() {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#7db8ff]">Portfolio Setup</p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Select Portfolio Preset</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400 sm:text-base">
            Start your investment journey by choosing a strategy template. You can use Custom Portfolio today,
            while preset strategies will unlock once the backend API is available.
          </p>
        </div>

        <Link
          href="/portfolio"
          className="rounded-lg border border-[#2b3b54] bg-[#0d1729] px-4 py-2 text-sm text-gray-300 transition-colors hover:text-white"
        >
          Back to Portfolio
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:gap-5">
        {PRESETS.map((preset) => (
          <PresetCard key={preset.title} {...preset} />
        ))}
      </div>
    </section>
  );
}
