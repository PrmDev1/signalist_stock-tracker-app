import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CandlestickChart, HandCoins, SlidersHorizontal, Scale } from 'lucide-react';
import PresetCard from '@/components/portfolio/PresetCard';

export const metadata: Metadata = {
  title: 'เลือกรูปแบบพอร์ต | RoboAdvisor',
  description: 'เลือกรูปแบบพอร์ตเพื่อเริ่มต้นวางแผนการลงทุนของคุณ',
};

const PRESET_OPTIONS = [
  {
    title: 'พอร์ตเติบโต',
    subtitle: 'พอร์ตเน้นการเติบโต',
    description:
      'เน้นหุ้นเติบโตที่มีโอกาสขยายตัวสูง เหมาะสำหรับผู้ที่ต้องการสร้างมูลค่าเงินลงทุนในระยะยาว',
    icon: CandlestickChart,
    href: '/portfolio/select-stocks?preset=growth',
  },
  {
    title: 'พอร์ตเงินปันผล',
    subtitle: 'พอร์ตเน้นเงินปันผล',
    description:
      'เน้นบริษัทคุณภาพที่จ่ายเงินปันผลสม่ำเสมอ เพื่อรับกระแสเงินสดและลดความผันผวนโดยรวมของพอร์ต',
    icon: HandCoins,
    href: '/portfolio/select-stocks?preset=dividend',
  },
  {
    title: 'พอร์ตผสม',
    subtitle: 'พอร์ตผสมผสาน',
    description:
      'ผสมสินทรัพย์ที่เน้นการเติบโตและรายได้ เพื่อสมดุลความเสี่ยงและรักษาเสถียรภาพของพอร์ตในระยะยาว',
    icon: Scale,
    href: '/portfolio/select-stocks?preset=balanced',
  },
  {
    title: 'พอร์ตกำหนดเอง',
    subtitle: 'พอร์ตกำหนดเอง',
    description:
      'เลือกสินทรัพย์ด้วยตนเอง และใช้ข้อมูลเชิงลึกจาก AI เพื่อปรับสัดส่วนให้เหมาะกับความเสี่ยงและระยะเวลาการลงทุนของคุณ',
    icon: SlidersHorizontal,
    href: '/portfolio/select-stocks?preset=custom',
  },
] as const;

export default function PortfolioPresetSelectionPage() {
  return (
    <section className="space-y-8 pb-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6ea8ff]">ตั้งค่าพอร์ต</p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">เลือกรูปแบบพอร์ต</h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              เริ่มต้นวางแผนการลงทุนด้วยการเลือกรูปแบบกลยุทธ์ที่เหมาะกับคุณ แต่ละตัวเลือกจะพาไปสู่แบบฟอร์มที่ปรับตามกลยุทธ์โดยอัตโนมัติ
            </p>
          </div>
        </div>

        <Link
          href="/portfolio"
          className="inline-flex items-center gap-2 self-start rounded-xl border border-[#22324a] bg-[#0b1628] px-4 py-2 text-sm font-medium text-[#c0d9ff] transition-all duration-300 hover:border-[#36598c] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>กลับไปหน้าพอร์ต</span>
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
            badge="พร้อมใช้"
          />
        ))}
      </div>
    </section>
  );
}
