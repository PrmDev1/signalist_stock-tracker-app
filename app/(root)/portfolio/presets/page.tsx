import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CandlestickChart, HandCoins, SlidersHorizontal, Scale } from 'lucide-react';
import PresetCard from '@/components/portfolio/PresetCard';

export const metadata: Metadata = {
  title: 'Select Portfolio Preset | Stocks Portfolio',
  description: 'Choose a portfolio preset to start building your investment strategy.',
};

const PRESET_OPTIONS = [
  {
    title: 'Growth Portfolio',
    subtitle: 'พอร์ตเน้นการเติบโต',
    description:
      'Focuses on high-upside growth stocks with stronger momentum, suitable for long-term capital appreciation.',
    icon: CandlestickChart,
    href: '/portfolio/select-stocks?preset=growth',
  },
  {
    title: 'Dividend Portfolio',
    subtitle: 'พอร์ตเน้นเงินปันผล',
    description:
      'Prioritizes quality dividend-paying companies for steady income and lower overall volatility profile.',
    icon: HandCoins,
    href: '/portfolio/select-stocks?preset=dividend',
  },
  {
    title: 'Mix Portfolio',
    subtitle: 'พอร์ตผสมผสาน',
    description:
      'Blends growth and income assets to target moderate risk with consistent long-term portfolio stability.',
    icon: Scale,
    href: '/portfolio/select-stocks?preset=balanced',
  },
  {
    title: 'Custom Portfolio',
    subtitle: 'พอร์ตกำหนดเอง',
    description:
      'Choose assets manually and optimize allocation with AI insights based on your own risk and time horizon.',
    icon: SlidersHorizontal,
    href: '/portfolio/select-stocks?preset=custom',
  },
] as const;

export default function PortfolioPresetSelectionPage() {
  return (
    <section className="space-y-8 pb-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6ea8ff]">Portfolio Setup</p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Select Portfolio Preset</h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Start your investment journey by choosing a strategy template. Every preset now drives a dynamic
              configuration form and strategy-specific optimization payload.
            </p>
          </div>
        </div>

        <Link
          href="/portfolio"
          className="inline-flex items-center gap-2 self-start rounded-xl border border-[#22324a] bg-[#0b1628] px-4 py-2 text-sm font-medium text-[#c0d9ff] transition-all duration-300 hover:border-[#36598c] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Portfolio</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {PRESET_OPTIONS.map((preset) => (
          <PresetCard
            key={preset.title}
            title={preset.title}
            subtitle={preset.subtitle}
            description={preset.description}
            icon={preset.icon}
            href={preset.href}
            isAvailable
            badge="Ready"
          />
        ))}
      </div>
    </section>
  );
}
