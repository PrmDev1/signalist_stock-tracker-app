import type { ParameterPanelProps, RiskTolerance } from './types';
import InfoPopover from '@/components/portfolio/optimizer/InfoPopover';
import type { PortfolioPreset } from './preset-config.types';
import { Bot, CalendarClock, DollarSign, Landmark, RefreshCcw, Shield, Sparkles } from 'lucide-react';
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
  const applyTargetYears = (years: number) => {
    const normalizedYears = Math.min(20, Math.max(1, years));
    setTargetYears(normalizedYears);

    if (normalizedYears <= 3) {
      setInvestmentHorizon('short');
      return;
    }

    if (normalizedYears <= 7) {
      setInvestmentHorizon('medium');
      return;
    }

    setInvestmentHorizon('long');
  };

  const riskOptions: Array<{
    key: RiskTolerance;
    label: string;
    description: string;
    accent: string;
    icon: typeof Shield;
    recommended?: boolean;
  }> = [
    {
      key: 'low',
      label: 'Low',
      description: 'Steady growth with lower fluctuation, suitable when capital preservation matters most.',
      accent: 'text-sky-300',
      icon: Shield,
    },
    {
      key: 'medium',
      label: 'Medium',
      description: 'Balanced growth with moderate swings, designed for most long-term investors.',
      accent: 'text-[#7db8ff]',
      icon: Bot,
      recommended: true,
    },
    {
      key: 'high',
      label: 'High',
      description: 'Higher upside with larger drawdowns, built for aggressive return targets.',
      accent: 'text-violet-300',
      icon: Sparkles,
    },
  ];

  const presetOptions: Array<{
    key: PortfolioPreset;
    title: string;
    description: string;
    detail: string;
    recommended?: boolean;
  }> = [
    {
      key: 'growth',
      title: 'Growth Mode',
      description: 'Momentum-oriented allocation for investors prioritizing long-term upside.',
      detail: 'EMA-driven profile with faster growth bias',
    },
    {
      key: 'balanced',
      title: 'Mix Mode',
      description: 'Diversified allocation that blends growth, income, and stability.',
      detail: 'Best fit for general-purpose portfolio building',
      recommended: true,
    },
    {
      key: 'dividend',
      title: 'Dividend Mode',
      description: 'Income-focused portfolio emphasizing dividend consistency and resilience.',
      detail: 'MHR-based preset for cash-flow-oriented investing',
    },
    {
      key: 'custom',
      title: 'Custom Mode',
      description: 'Full manual control over lookback, method, span, and optional allocations.',
      detail: 'Flexible preset for advanced portfolio tuning',
    },
  ];

  const selectedPreset = presetOptions.find((preset) => preset.key === activePreset) ?? presetOptions[0];

  const quickTargetYears = [1, 3, 5, 10];
  const safeInvestmentAmount = Number.isFinite(investmentAmount) ? Math.max(0, investmentAmount) : 0;
  const safeMonthlyDca = Number.isFinite(monthlyDca) ? Math.max(0, monthlyDca) : 0;
  const safeTargetYears = Number.isFinite(targetYears) ? Math.max(1, targetYears) : 1;
  const projectedContributionTotal = safeMonthlyDca * safeTargetYears * 12;
  const estimatedPlanValue = safeInvestmentAmount;

  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,35,0.96),rgba(11,15,24,0.98))] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.25)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white sm:text-2xl">Configure RoboAdvisor</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">Set the capital plan, risk profile, and optimization method before continuing to the RoboAdvisor results screen.</p>
        </div>
        <div className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">
          preset: {activePreset}
        </div>
      </div>

      <div className="mt-6 space-y-8">
        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#7db8ff]/25 bg-[#7db8ff]/10 text-sm font-semibold text-[#b9d8ff]">
              1
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">How do you feel about risk?</h3>
              <p className="text-sm text-gray-400">Select the real risk profile that will be sent with your optimization request.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {riskOptions.map((risk) => {
              const active = riskTolerance === risk.key;
              const Icon = risk.icon;

              return (
                <button
                  key={risk.key}
                  type="button"
                  onClick={() => setRiskTolerance(risk.key)}
                  aria-pressed={active}
                  className={`rounded-[24px] border p-5 text-left transition-all ${
                    active
                      ? 'border-[#4d73ff] bg-[linear-gradient(180deg,rgba(44,57,107,0.45),rgba(17,20,31,0.96))] shadow-[0_0_0_1px_rgba(77,115,255,0.25),0_18px_40px_rgba(20,30,70,0.3)]'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] ${risk.accent}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {risk.recommended ? (
                      <span className="rounded-full bg-[#295dff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                        Recommended
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-6 text-2xl font-semibold text-white">{risk.label}</p>
                  <p className="mt-3 text-sm leading-7 text-gray-400">{risk.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#7db8ff]/25 bg-[#7db8ff]/10 text-sm font-semibold text-[#b9d8ff]">
              2
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Selected strategy mode</h3>
              <p className="text-sm text-gray-400">This section now shows only the settings for the preset the user already selected.</p>
            </div>
          </div>
          <div className="rounded-[24px] border border-[#4d73ff]/25 bg-[linear-gradient(180deg,rgba(44,57,107,0.3),rgba(17,20,31,0.96))] p-5 shadow-[0_0_0_1px_rgba(77,115,255,0.18),0_18px_40px_rgba(20,30,70,0.22)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center rounded-full border border-[#7db8ff]/25 bg-[#7db8ff]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b9d8ff]">
                  Active preset
                </div>
                <h4 className="mt-4 text-2xl font-semibold text-white">{selectedPreset.title}</h4>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300">{selectedPreset.description}</p>
              </div>
              <div className="space-y-2 sm:text-right">
                {selectedPreset.recommended ? (
                  <div>
                    <span className="rounded-full bg-[#826bff]/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c6bcff]">
                      Recommended
                    </span>
                  </div>
                ) : null}
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#9ebcff]">{selectedPreset.detail}</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            {presetConfigPanel}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#7db8ff]/25 bg-[#7db8ff]/10 text-sm font-semibold text-[#b9d8ff]">
              3
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Set your target</h3>
              <p className="text-sm text-gray-400">Every input below is the real value used to build the RoboAdvisor request payload.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-5 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Investment timeline</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {quickTargetYears.map((years) => {
                    const active = targetYears === years;
                    return (
                      <button
                        key={years}
                        type="button"
                        onClick={() => applyTargetYears(years)}
                        className={`min-w-24 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                          active
                            ? 'bg-[#295dff] text-white shadow-[0_10px_30px_rgba(41,93,255,0.35)]'
                            : 'border border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/[0.08]'
                        }`}
                      >
                        {years === 1 ? '1 Year' : years === 10 ? '10+ Years' : `${years} Years`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="investmentAmount" className="mb-2 flex items-center text-sm font-medium text-gray-300">
                    <DollarSign className="mr-2 h-4 w-4 text-[#7db8ff]" />
                    เงินลงทุนตั้งต้น (USD)
                  </label>
                  <input
                    id="investmentAmount"
                    type="number"
                    min={100}
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                    className="w-full rounded-2xl border border-white/10 bg-[#1b1f29] px-4 py-3 text-white placeholder:text-gray-500 focus:border-[#4d73ff] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="monthlyDca" className="mb-2 flex items-center text-sm font-medium text-gray-300">
                    <RefreshCcw className="mr-2 h-4 w-4 text-emerald-300" />
                    เงินลงทุนรายเดือน (Monthly DCA) (USD)
                  </label>
                  <input
                    id="monthlyDca"
                    type="number"
                    min={0}
                    value={monthlyDca}
                    onChange={(e) => setMonthlyDca(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full rounded-2xl border border-white/10 bg-[#1b1f29] px-4 py-3 text-white placeholder:text-gray-500 focus:border-[#4d73ff] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="targetYears" className="mb-2 flex items-center text-sm font-medium text-gray-300">
                    <CalendarClock className="mr-2 h-4 w-4 text-amber-300" />
                    จำนวนปีเป้าหมาย (ไม่เกิน 20 ปี)
                  </label>
                  <input
                    id="targetYears"
                    type="number"
                    min={1}
                    max={20}
                    value={targetYears}
                    onChange={(e) => applyTargetYears(Number(e.target.value) || 1)}
                    className="w-full rounded-2xl border border-white/10 bg-[#1b1f29] px-4 py-3 text-white placeholder:text-gray-500 focus:border-[#4d73ff] focus:outline-none"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center text-sm font-medium text-gray-300">
                    <Landmark className="mr-2 h-4 w-4 text-cyan-300" />
                    โมเดลที่ใช้จัดพอร์ต
                    <InfoPopover title="โมเดลจัดพอร์ต" description="MVO เหมาะกับการบาลานซ์ผลตอบแทน/ความผันผวน ส่วน Semi เหมาะกับผู้ที่เน้นลดความเสี่ยงขาลง" />
                  </div>
                  <Select
                    value={modelName}
                    onValueChange={(value) => setModelName(value as 'mvo' | 'semi')}
                  >
                    <SelectTrigger className="w-full rounded-2xl border-white/10 bg-[#1b1f29] text-white">
                      <SelectValue placeholder="เลือกโมเดล" />
                    </SelectTrigger>
                    <SelectContent className="border-gray-600 bg-gray-800 text-gray-100">
                      <SelectItem value="mvo">MVO (Mean-Variance)</SelectItem>
                      <SelectItem value="semi">Semi-Variance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label htmlFor="brokerMinOrder" className="mb-2 flex items-center text-sm font-medium text-gray-300">
                    มูลค่าขั้นต่ำต่อคำสั่งซื้อ (USD)
                    <InfoPopover title="คำสั่งซื้อขั้นต่ำ" description="ใช้ตรวจสอบว่าจำนวนเงินที่จัดให้แต่ละหุ้นไม่ต่ำกว่าขั้นต่ำของโบรกเกอร์" />
                  </label>
                  <input
                    id="brokerMinOrder"
                    type="number"
                    step="0.01"
                    value={brokerMinOrder}
                    onChange={(e) => setBrokerMinOrder(Number(e.target.value))}
                    className="w-full rounded-2xl border border-white/10 bg-[#1b1f29] px-4 py-3 text-white placeholder:text-gray-500 focus:border-[#4d73ff] focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-[#1b1f29] px-4 py-4 text-sm text-gray-300">
                    <span className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={requireDiversification}
                        onChange={(e) => setRequireDiversification(e.target.checked)}
                        className="h-4 w-4"
                      />
                      เปิดการกระจายความเสี่ยง
                      <InfoPopover title="การกระจายความเสี่ยง" description="ช่วยลดโอกาสที่พอร์ตกระจุกตัวในหุ้นไม่กี่ตัว" />
                    </span>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                      {requireDiversification ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <aside className="rounded-[24px] border border-[#4d73ff]/20 bg-[linear-gradient(180deg,rgba(44,57,107,0.2),rgba(17,20,31,0.92))] p-5">
              <div className="inline-flex items-center gap-2 text-[#c6d8ff]">
                <Sparkles className="h-4 w-4" />
                <p className="text-base font-semibold">Quick projection</p>
              </div>

              <div className="mt-4 rounded-[22px] border border-white/10 bg-[#f6f8ff] px-5 py-4 text-[#1d2b6c]">
                <p className="text-xs uppercase tracking-[0.18em] text-[#5c6fb7]">Estimated plan value</p>
                <p className="mt-2 text-3xl font-bold">
                  ${Math.round(estimatedPlanValue).toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-[#4a5fa8]">Based on the current initial deposit only. Monthly contributions are shown separately for the {safeTargetYears}-year plan.</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[#4a5fa8]">
                  <div className="rounded-2xl bg-white px-3 py-3">
                    <p className="uppercase tracking-[0.14em] text-[#7487c4]">Initial deposit</p>
                    <p className="mt-1 text-sm font-semibold text-[#1d2b6c]">${Math.round(safeInvestmentAmount).toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3">
                    <p className="uppercase tracking-[0.14em] text-[#7487c4]">Monthly DCA total</p>
                    <p className="mt-1 text-sm font-semibold text-[#1d2b6c]">${Math.round(projectedContributionTotal).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm text-gray-300">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <span>Risk profile</span>
                  <span className="font-semibold text-white">{riskOptions.find((option) => option.key === riskTolerance)?.label}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <span>Selected preset</span>
                  <span className="font-semibold text-white">{presetOptions.find((option) => option.key === activePreset)?.title}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <span>Planning horizon</span>
                  <span className="font-semibold text-white">{investmentHorizon}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <span>Model</span>
                  <span className="font-semibold text-white">{modelName === 'mvo' ? 'MVO' : 'Semi-Variance'}</span>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onOptimize}
          disabled={status === 'PROCESSING' || !canRunOptimization}
          className="rounded-2xl bg-[linear-gradient(90deg,#7db8ff,#6c4cff)] px-5 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:brightness-100"
        >
          {status === 'PROCESSING' ? 'กำลังคำนวณพอร์ต...' : 'Continue to RoboAdvisor results'}
        </button>
        <button
          onClick={onReset}
          type="button"
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-white/[0.08]"
        >
          รีเซ็ตค่า
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-2xl border border-white/10 bg-transparent px-5 py-3 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/[0.05]"
        >
          กลับหน้าคัดกรองหุ้น
        </button>
      </div>

      {statusMessage ? (
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-gray-300">
          <div className="flex items-center gap-2 text-[#b9d8ff]">
            <Sparkles className="h-4 w-4" />
            RoboAdvisor status
          </div>
          <p className="mt-2 text-gray-400">{statusMessage}</p>
        </div>
      ) : null}
    </section>
  );
}
