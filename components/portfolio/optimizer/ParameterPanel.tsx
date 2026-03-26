import type { ParameterPanelProps, RiskTolerance } from './types';
import InfoPopover from '@/components/portfolio/optimizer/InfoPopover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ParameterPanel({
  investmentAmount,
  setInvestmentAmount,
  monthlyDca,
  setMonthlyDca,
  targetYears,
  setTargetYears,
  riskTolerance,
  setRiskTolerance,
  investmentHorizon,
  setInvestmentHorizon,
  modelName,
  setModelName,
  brokerMinOrder,
  setBrokerMinOrder,
  requireDiversification,
  setRequireDiversification,
  activePreset,
  presetConfigPanel,
  status,
  statusMessage,
  canRunOptimization,
  onOptimize,
  onReset,
  onBack,
}: ParameterPanelProps) {
  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white sm:text-xl">พารามิเตอร์การจัดพอร์ต</h2>
      <p className="mt-1 text-sm text-gray-400">ตั้งค่าที่จำเป็นก่อนเริ่มให้ AI คำนวณพอร์ต</p>
      <div className="mt-3 inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-cyan-200">
        preset mode: {activePreset}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="investmentAmount" className="mb-1 flex items-center text-sm font-medium text-gray-300">
            เงินลงทุนตั้งต้น (USD)
          </label>
          <input
            id="investmentAmount"
            type="number"
            min={100}
            value={investmentAmount}
            onChange={(e) => setInvestmentAmount(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder:text-gray-500 focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="monthlyDca" className="mb-1 flex items-center text-sm font-medium text-gray-300">
            เงินลงทุนรายเดือน (Monthly DCA) (USD)
          </label>
          <input
            id="monthlyDca"
            type="number"
            min={0}
            value={monthlyDca}
            onChange={(e) => setMonthlyDca(Math.max(0, Number(e.target.value) || 0))}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder:text-gray-500 focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="targetYears" className="mb-1 flex items-center text-sm font-medium text-gray-300">
            จำนวนปีเป้าหมาย (ไม่เกิน 20 ปี)
          </label>
          <input
            id="targetYears"
            type="number"
            min={1}
            max={20}
            value={targetYears}
            onChange={(e) => {
              const nextValue = Number(e.target.value) || 1;
              setTargetYears(Math.min(20, Math.max(1, nextValue)));
            }}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder:text-gray-500 focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <p className="mb-2 flex items-center text-sm font-medium text-gray-300">
            ระดับความเสี่ยง
          </p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: 'low', label: 'ต่ำ' },
              { key: 'medium', label: 'กลาง' },
              { key: 'high', label: 'สูง' },
            ] as { key: RiskTolerance; label: string }[]).map((risk) => {
              const active = riskTolerance === risk.key;
              return (
                <button
                  key={risk.key}
                  type="button"
                  onClick={() => setRiskTolerance(risk.key)}
                  aria-pressed={active}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {risk.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center text-sm font-medium text-gray-300">
            <span>โมเดลที่ใช้จัดพอร์ต</span>
            <InfoPopover title="โมเดลจัดพอร์ต" description="MVO เหมาะกับการบาลานซ์ผลตอบแทน/ความผันผวน ส่วน Semi เหมาะกับผู้ที่เน้นลดความเสี่ยงขาลง" />
          </div>
          <Select
            value={modelName}
            onValueChange={(value) => setModelName(value as 'mvo' | 'semi')}
          >
            <SelectTrigger className="w-full rounded-lg border-gray-600 bg-gray-700 text-white">
              <SelectValue placeholder="เลือกโมเดล" />
            </SelectTrigger>
            <SelectContent className="border-gray-600 bg-gray-800 text-gray-100">
              <SelectItem value="mvo">MVO (Mean-Variance)</SelectItem>
              <SelectItem value="semi">Semi-Variance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="brokerMinOrder" className="mb-1 flex items-center text-sm font-medium text-gray-300">
            มูลค่าขั้นต่ำต่อคำสั่งซื้อ (USD)
            <InfoPopover title="คำสั่งซื้อขั้นต่ำ" description="ใช้ตรวจสอบว่าจำนวนเงินที่จัดให้แต่ละหุ้นไม่ต่ำกว่าขั้นต่ำของโบรกเกอร์" />
          </label>
          <input
            id="brokerMinOrder"
            type="number"
            step="0.01"
            value={brokerMinOrder}
            onChange={(e) => setBrokerMinOrder(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder:text-gray-500 focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={requireDiversification}
              onChange={(e) => setRequireDiversification(e.target.checked)}
              className="h-4 w-4"
            />
            เปิดการกระจายความเสี่ยง
            <InfoPopover title="การกระจายความเสี่ยง" description="ช่วยลดโอกาสที่พอร์ตกระจุกตัวในหุ้นไม่กี่ตัว" />
          </label>
        </div>
      </div>

      {presetConfigPanel}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onOptimize}
          disabled={status === 'PROCESSING' || !canRunOptimization}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600"
        >
          {status === 'PROCESSING' ? 'กำลังคำนวณพอร์ต...' : 'เริ่มจัดพอร์ตด้วย AI'}
        </button>
        <button
          onClick={onReset}
          type="button"
          className="rounded-lg border border-gray-600 bg-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-600"
        >
          รีเซ็ตค่า
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-gray-600 bg-transparent px-5 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-700"
        >
          กลับหน้าคัดกรองหุ้น
        </button>
      </div>

      {statusMessage ? <p className="mt-3 text-sm text-gray-400">{statusMessage}</p> : null}
    </section>
  );
}
