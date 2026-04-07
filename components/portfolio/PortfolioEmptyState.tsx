'use client';

import React from 'react';
import { Briefcase } from 'lucide-react';
import Link from 'next/link';

export default function PortfolioEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-2xl flex items-center justify-center mb-4">
        <Briefcase size={32} className="text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">ยังไม่มีพอร์ตลงทุน</h3>
      <p className="text-gray-400 text-center max-w-sm mb-6">
        สร้างพอร์ตแรกของคุณเพื่อเริ่มจัดสรรการลงทุนและปรับพอร์ตด้วยคำแนะนำจาก AI
      </p>
      <Link
        href="/portfolio/presets"
        className="px-6 py-3 bg-emerald-500 text-black font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
      >
        เลือกรูปแบบพอร์ตเพื่อเริ่มต้น
      </Link>
    </div>
  );
}
