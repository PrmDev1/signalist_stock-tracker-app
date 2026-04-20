'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, RefreshCcw, SendHorizonal, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type MessageRole = 'user' | 'bot';
type ChatStep = 'menu' | 'config' | 'loading' | 'done';
type ScreenMode = 'global' | 'sector';

interface ChatMessage {
  id: number;
  role: MessageRole;
  content: string | ReactNode;
}

interface SmartScreenStock {
  symbol?: string;
  ticker?: string;
  companyName?: string;
  finalScore?: number;
}

interface SmartScreenResponse {
  status: string;
  strategyApplied: {
    message: string;
  };
  recommendedStocks: {
    count: number;
    data: SmartScreenStock[];
  };
}

interface ApiErrorResponse {
  error?: string;
  detail?: string;
}

interface RegimeOption {
  value: string;
  title: string;
  desc: string;
  strategy: string;
}

const SYSTEM_DEFAULT_VALUE = 'system-default';

const REGIMES: RegimeOption[] = [
  {
    value: '1. Extreme Market Stress',
    title: '1. Extreme Market Stress (วิกฤตตลาดตื่นตระหนก)',
    desc: 'ตลาดอยู่ในภาวะตื่นตระหนกสุดขีด มักเกิดจากเหตุการณ์ Black Swan',
    strategy: 'เน้นตั้งรับ กวาดหุ้น Quality (40%) และ Risk ต่ำ (30%)',
  },
  {
    value: '2. Stagflation',
    title: '2. Stagflation (ภาวะเศรษฐกิจถดถอยแต่ของแพง)',
    desc: 'เศรษฐกิจและภาคการผลิตติดลบ แต่เงินเฟ้อกลับพุ่งสูง',
    strategy: 'หนีไปพึ่งหุ้น Quality (35%) และ Risk (30%) หุ้นเติบโตจะแย่',
  },
  {
    value: '3. Deflationary Bust',
    title: '3. Deflationary Bust (ภาวะเศรษฐกิจตกต่ำและเงินฝืด)',
    desc: 'เศรษฐกิจหดตัวอย่างหนัก ราคาสินค้าและเงินเฟ้อติดลบ',
    strategy: 'นาทีทองของการช้อนของถูก ให้น้ำหนัก Value สูงสุด (40%)',
  },
  {
    value: '4. Economic Contraction',
    title: '4. Economic Contraction (ภาวะเศรษฐกิจหดตัว / ถดถอยปกติ)',
    desc: 'เศรษฐกิจเข้าสู่รอบขาลงตามวัฏจักร',
    strategy: 'เน้นความปลอดภัย Quality (35%) และ Risk (30%)',
  },
  {
    value: '5. High Inflationary Pressure',
    title: '5. High Inflationary Pressure (ภาวะเงินเฟ้อพุ่งสูง / ต้นทุนแพง)',
    desc: 'เงินเฟ้อสูงกว่าค่าเฉลี่ยในอดีตอย่างมีนัยสำคัญ',
    strategy: 'หุ้น Quality (40%) คือพระเอก ตามด้วย Value (30%)',
  },
  {
    value: '6. Goldilocks',
    title: '6. Goldilocks (สภาวะเศรษฐกิจสมบูรณ์แบบ)',
    desc: 'เศรษฐกิจเติบโตสูงมาก ในขณะที่เงินเฟ้อยังคงต่ำ',
    strategy: 'บุกแหลก! ทุ่มน้ำหนักไปที่ Growth สูงถึง (45%)',
  },
  {
    value: '7. Strong Expansion',
    title: '7. Strong Expansion (ภาวะเศรษฐกิจขยายตัวแข็งแกร่ง)',
    desc: 'เศรษฐกิจเติบโตอย่างร้อนแรง กำไรบริษัทพุ่งสูงขึ้น',
    strategy: 'โหมด Risk-on ให้ Growth (45%) นำทัพ',
  },
  {
    value: '8. Recovery / Moderate Growth',
    title: '8. Recovery / Moderate Growth (ภาวะฟื้นตัว / เติบโตปานกลาง)',
    desc: 'สภาวะปกติ ตัวเลขเศรษฐกิจไม่ได้โดดเด่นไปทางใดทางหนึ่ง',
    strategy: 'กระจายความเสี่ยง แบ่งน้ำหนัก Value (35%) และ Growth (35%)',
  },
];

const MODE_LABELS: Record<ScreenMode, string> = {
  global: 'เปรียบเทียบหุ้นทั้งตลาด (Global Screen)',
  sector: 'เปรียบเทียบหุ้นรายอุตสาหกรรม (Best per Sector)',
};

function formatScore(value?: number): string {
  if (!Number.isFinite(value)) return 'ไม่มีข้อมูล';
  return Number(value).toFixed(2);
}

function normalizeRegimeLabel(value: string): string {
  if (value === SYSTEM_DEFAULT_VALUE) return 'ใช้ค่าเริ่มต้นของระบบ';
  return value.includes('. ') ? value.split('. ')[1] ?? value : value;
}

function getStockLabel(stock: SmartScreenStock): string {
  return stock.symbol || stock.ticker || stock.companyName || 'Unknown';
}

function buildResultsNode(payload: SmartScreenResponse): ReactNode {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-7 text-slate-200">{payload.strategyApplied.message}</p>
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-3">
        <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
          <span>ผลลัพธ์ที่คัดกรองได้</span>
          <span>{payload.recommendedStocks.count} รายการ</span>
        </div>
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {payload.recommendedStocks.data.map((stock, index) => (
            <div
              key={`${getStockLabel(stock)}-${index}`}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{getStockLabel(stock)}</p>
                {stock.companyName && stock.companyName !== getStockLabel(stock) ? (
                  <p className="truncate text-xs text-slate-400">{stock.companyName}</p>
                ) : null}
              </div>
              <span className="ml-4 shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                Score {formatScore(stock.finalScore)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { default } from './RoboAdvisorChat';