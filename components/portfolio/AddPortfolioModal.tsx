'use client';

import { useRouter } from 'next/navigation';

type Props = {
  onClose: () => void;
};

export default function AddPortfolioModal({ onClose }: Props) {
  const router = useRouter();

  const handleCreate = () => {
    router.push('/portfolio/presets');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-[420px]">
        <h2 className="text-lg font-semibold mb-4 text-white">
          สร้างพอร์ตลงทุน
        </h2>

        <p className="text-sm text-gray-400 mb-6">
          เริ่มจากรูปแบบพอร์ตสำเร็จรูป แล้วปรับให้เหมาะกับแผนการลงทุนของคุณ
        </p>

        <div className="bg-neutral-800 p-4 rounded-xl mb-6">
          <p className="text-sm text-gray-300">
            เลือกรูปแบบพอร์ตที่เหมาะกับสไตล์การลงทุนของคุณ จากนั้นค่อยปรับรายชื่อหุ้นและการตั้งค่าการจัดสรรในพื้นที่ทำงานส่วนตัว
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-white transition px-4 py-2"
          >
            ยกเลิก
          </button>

          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-lg bg-emerald-500 text-black text-sm font-medium hover:bg-emerald-600 transition"
          >
            เลือกรูปแบบพอร์ต
          </button>
        </div>
      </div>
    </div>
  );
}
