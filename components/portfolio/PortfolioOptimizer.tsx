"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { startPortfolioOptimization, getPortfolioOptimizationStatus, savePortfolioToDatabase } from '@/lib/actions/cloudflare.actions';
import {
  type FilteredStock,
  getFilteredStocksFromSession,
  setFilteredStocksInSession,
} from '@/lib/portfolio-filtered-stocks';
import {
  getOptimizerParamsFromSession,
  setOptimizerParamsInSession,
} from '@/lib/portfolio-optimizer-params';
import ParameterPanel from './optimizer/ParameterPanel';
import PreviewPanel from './optimizer/PreviewPanel';
import ResultsPanel from './optimizer/ResultsPanel';
import GrowthConfig from './optimizer/GrowthConfig';
import DividendConfig from './optimizer/DividendConfig';
import BalancedConfig from './optimizer/BalancedConfig';
import CustomConfig from './optimizer/CustomConfig';
import type {
  InvestmentHorizon,
  PortfolioResult,
  RiskTolerance,
} from '@/components/portfolio/optimizer/types';
import type {
  PortfolioConfigurationState,
  PortfolioPreset,
} from '@/components/portfolio/optimizer/preset-config.types';
import {
  getDefaultPresetFormValues,
  toConfigurationState,
} from '@/components/portfolio/optimizer/preset-config.types';
import type {
  BacktestAndMetrics,
  EducationalInsights,
  RiskRewardProfile,
} from '@/components/portfolio/analysis-types';

interface PortfolioOptimizerProps {
  mode?: 'settings' | 'results';
}

export default function PortfolioOptimizer({ mode = 'settings' }: PortfolioOptimizerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetQuery = searchParams.get('preset');
  const resolvedPresetFromQuery: PortfolioPreset =
    presetQuery === 'growth' ||
    presetQuery === 'dividend' ||
    presetQuery === 'balanced' ||
    presetQuery === 'custom'
      ? presetQuery
      : 'custom';

  // Helper for navigation back to select-stocks with preset
  const selectStocksUrl = `/portfolio/select-stocks?preset=${resolvedPresetFromQuery}`;

  const [selectedStocks, setSelectedStocks] = useState<FilteredStock[]>([]);
  const [isSelectionReady, setIsSelectionReady] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState<number>(10000);
  const [monthlyDca, setMonthlyDca] = useState<number>(0);
  const [targetYears, setTargetYears] = useState<number>(10);
  const [investmentHorizon, setInvestmentHorizon] = useState<InvestmentHorizon>('medium');
  const [brokerMinOrder, setBrokerMinOrder] = useState<number>(5);
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>('medium');
  const optimizedRiskLevelRef = useRef<RiskTolerance>('medium');
  const [requireDiversification, setRequireDiversification] = useState<boolean>(true);
  const [modelName, setModelName] = useState<'mvo' | 'semi'>('mvo');
  const [portfolioName, setPortfolioName] = useState('My Optimized Portfolio');
  const [reqId, setReqId] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'READY' | 'FAILED'>('IDLE');
  const [result, setResult] = useState<PortfolioResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [backtestAndMetrics, setBacktestAndMetrics] = useState<BacktestAndMetrics | null>(null);
  const [educationalInsights, setEducationalInsights] = useState<EducationalInsights | null>(null);
  const [riskRewardProfile, setRiskRewardProfile] = useState<RiskRewardProfile | null>(null);
  const [presetConfig, setPresetConfig] = useState<PortfolioConfigurationState>(() =>
    toConfigurationState(getDefaultPresetFormValues(resolvedPresetFromQuery))
  );
  const hasAutoStartedRef = useRef(false);
  const [isResultParamsReady, setIsResultParamsReady] = useState(mode === 'settings');

  const canCreatePortfolio = selectedStocks.length >= 2;
  const activePreset = presetConfig.preset;
  const availableTagAllocations = useMemo(
    () => ({
      growth: selectedStocks.some((stock) => String(stock.tag ?? '').trim().toLowerCase() === 'growth'),
      dividend: selectedStocks.some((stock) => String(stock.tag ?? '').trim().toLowerCase() === 'dividend'),
      balanced: selectedStocks.some((stock) => String(stock.tag ?? '').trim().toLowerCase() === 'balanced'),
      core: selectedStocks.some((stock) => String(stock.tag ?? '').trim().toLowerCase() === 'core'),
    }),
    [selectedStocks]
  );

  const lookbackYears = useMemo(() => {
    if (Number.isFinite(presetConfig.lookbackYears)) {
      return Number(presetConfig.lookbackYears);
    }
    if (investmentHorizon === 'short') return 3;
    if (investmentHorizon === 'long') return 10;
    return 5;
  }, [investmentHorizon, presetConfig.lookbackYears]);

  const canRunOptimization =
    canCreatePortfolio &&
    Number.isFinite(investmentAmount) &&
    investmentAmount > 0 &&
    Number.isFinite(monthlyDca) &&
    monthlyDca >= 0 &&
    Number.isFinite(targetYears) &&
    targetYears >= 1 &&
    targetYears <= 20;

  useEffect(() => {
    const stocksFromFilter = getFilteredStocksFromSession(resolvedPresetFromQuery);

    if (stocksFromFilter.length === 0) {
      router.replace(selectStocksUrl);
      return;
    }

    setSelectedStocks(stocksFromFilter);
    setIsSelectionReady(true);
  }, [router, selectStocksUrl]);

  useEffect(() => {
    if (mode !== 'results' || !isSelectionReady) return;

    const params = getOptimizerParamsFromSession();
    if (!params) {
      router.replace('/portfolio/optimizer');
      return;
    }

    setInvestmentAmount(params.investmentAmount);
    setMonthlyDca(params.monthlyDca);
    setTargetYears(params.targetYears);
    setRiskTolerance(params.riskTolerance);
    setInvestmentHorizon(params.investmentHorizon);
    setModelName(params.modelName);
    setBrokerMinOrder(params.brokerMinOrder);
    setRequireDiversification(params.requireDiversification);
    setPresetConfig(params.presetConfig);
    setIsResultParamsReady(true);
  }, [isSelectionReady, mode, router]);

  const handleOptimize = async () => {
    if (selectedStocks.length === 0) {
      router.replace(selectStocksUrl);
      return;
    }

    if (!canCreatePortfolio) {
      setErrorMsg('กรุณาเลือกหุ้นอย่างน้อย 2 ตัวก่อนเริ่มจัดพอร์ต');
      setStatus('FAILED');
      return;
    }

    if (!canRunOptimization) {
      setErrorMsg('กรุณาตรวจสอบพารามิเตอร์ก่อนเริ่มจัดพอร์ต');
      setStatus('FAILED');
      return;
    }

    setStatus('PROCESSING');
    setResult(null);
    setReqId(null);
    setErrorMsg(null);
    setModelUsed(null);
    setBacktestAndMetrics(null);
    setEducationalInsights(null);
    setRiskRewardProfile(null);
    setStatusMessage(`กำลังเตรียมหุ้น ${selectedStocks.length} ตัวสำหรับการจัดพอร์ต`);

    const selectedRiskLevel = riskTolerance;
    optimizedRiskLevelRef.current = selectedRiskLevel;

    try {
      const response = await startPortfolioOptimization(
        selectedStocks,
        lookbackYears,
        selectedRiskLevel,
        requireDiversification,
        modelName,
        undefined,
        {
          preset: presetConfig.preset,
          customMethod: presetConfig.customMethod,
          span: presetConfig.span,
          targetAllocations: presetConfig.targetAllocations,
        }
      );

      if (!response.success) {
        setErrorMsg(response.error || 'ไม่สามารถเริ่มจัดพอร์ตได้');
        setStatus('FAILED');
        return;
      }

      setReqId(response.reqId || null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMsg('เกิดข้อผิดพลาด: เริ่มจัดพอร์ตไม่สำเร็จ ' + errorMessage);
      setStatus('FAILED');
    }
  };

  useEffect(() => {
    if (mode !== 'results') return;
    if (!isSelectionReady || !isResultParamsReady) return;
    if (hasAutoStartedRef.current) return;

    hasAutoStartedRef.current = true;
    void handleOptimize();
  }, [isResultParamsReady, isSelectionReady, mode]);

  const handleGoToResultsPage = () => {
    if (!canCreatePortfolio) {
      setErrorMsg('กรุณาเลือกหุ้นอย่างน้อย 2 ตัวก่อนเริ่มจัดพอร์ต');
      setStatus('FAILED');
      return;
    }

    if (!canRunOptimization) {
      setErrorMsg('กรุณาตรวจสอบพารามิเตอร์ก่อนเริ่มจัดพอร์ต');
      setStatus('FAILED');
      return;
    }

    setOptimizerParamsInSession({
      investmentAmount,
      monthlyDca,
      targetYears,
      riskTolerance,
      investmentHorizon,
      modelName,
      brokerMinOrder,
      requireDiversification,
      presetConfig,
    });

    setFilteredStocksInSession(selectedStocks, activePreset);

    router.push(`/portfolio/optimizer/start?preset=${activePreset}`);
  };

  const handlePresetChange = (nextPreset: PortfolioPreset) => {
    setPresetConfig(toConfigurationState(getDefaultPresetFormValues(nextPreset)));
    setFilteredStocksInSession(selectedStocks, nextPreset);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkStatus = async () => {
      if (!reqId) return;

      try {
        const response = await getPortfolioOptimizationStatus(reqId, investmentAmount, brokerMinOrder);

        if (!response.success) {
          setErrorMsg('ตรวจสอบสถานะไม่สำเร็จ: ' + response.error);
          setStatus('FAILED');
          return;
        }

        if (response.status === 'PORTFOLIO_READY' && response.portfolio) {
          setResult(response.portfolio);
          setModelUsed(response.modelUsed || null);
          setBacktestAndMetrics(response.backtestAndMetrics || null);
          setEducationalInsights(response.explainability?.educationalInsights || null);
          setRiskRewardProfile(response.explainability?.riskRewardProfile || null);
          setStatusMessage(response.message || null);
          setStatus('READY');
        } else if (response.status === 'FAILED') {
          setStatus('FAILED');
          setStatusMessage(response.message || 'การจัดพอร์ตล้มเหลว');
          setErrorMsg(response.message || 'การจัดพอร์ตล้มเหลว');
        } else if (response.status === 'PROCESSING') {
          setStatusMessage(response.message || 'กำลังประมวลผล...');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setErrorMsg('ตรวจสอบสถานะไม่สำเร็จ: ' + errorMessage);
      }
    };

    if (status === 'PROCESSING' && reqId) {
      interval = setInterval(checkStatus, 3000);
    }

    return () => clearInterval(interval);
  }, [reqId, status, investmentAmount, brokerMinOrder]);

  const handleResetParameters = () => {
    setInvestmentAmount(10000);
    setMonthlyDca(0);
    setTargetYears(10);
    setInvestmentHorizon('medium');
    setBrokerMinOrder(5);
    setRiskTolerance('medium');
    setRequireDiversification(true);
    setModelName('mvo');
    setPresetConfig(toConfigurationState(getDefaultPresetFormValues(resolvedPresetFromQuery)));
    setErrorMsg(null);
    setStatus('IDLE');
    setStatusMessage(null);
    setResult(null);
    setReqId(null);
    setBacktestAndMetrics(null);
    setEducationalInsights(null);
    setRiskRewardProfile(null);
  };

  const handleSavePortfolio = async () => {
    if (!result || selectedStocks.length === 0) return;

    if (!canCreatePortfolio) {
      setErrorMsg('ไม่สามารถสร้างพอร์ตได้ เพราะมีหุ้นน้อยกว่า 2 ตัว กรุณากลับไปเลือกหุ้นเพิ่ม');
      setStatus('FAILED');
      return;
    }

    setIsSaving(true);
    try {
      const tickers = Object.keys(result.allocations)
        .map((ticker) => ticker.trim().toUpperCase())
        .filter(Boolean);

      const tickerTags = selectedStocks.reduce<Record<string, string>>((acc, stock) => {
        const symbol = stock.symbol.trim().toUpperCase();
        const tag = typeof stock.tag === 'string' ? stock.tag.trim().toLowerCase() : '';

        if (symbol && tag && tickers.includes(symbol)) {
          acc[symbol] = tag;
        }

        return acc;
      }, {});

      const response = await savePortfolioToDatabase(
        portfolioName,
        tickers,
        tickerTags,
        result.allocations,
        result.expectedReturn,
        result.volatility,
        investmentAmount,
        optimizedRiskLevelRef.current,
        modelName,
        reqId || undefined,
        monthlyDca,
        targetYears,
        backtestAndMetrics,
        riskRewardProfile
      );

      if (response.success) {
        setErrorMsg(null);
        router.push('/portfolio');
        setStatus('IDLE');
        setReqId(null);
        setResult(null);
        setModelUsed(null);
        setStatusMessage(null);
        setBacktestAndMetrics(null);
        setEducationalInsights(null);
        setRiskRewardProfile(null);
      } else {
        setErrorMsg('บันทึกพอร์ตไม่สำเร็จ: ' + response.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMsg('เกิดข้อผิดพลาด: บันทึกพอร์ตไม่สำเร็จ ' + errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveStock = (symbol: string) => {
    const nextStocks = selectedStocks.filter((stock) => stock.symbol !== symbol);
    setSelectedStocks(nextStocks);
    setFilteredStocksInSession(nextStocks, activePreset);

    if (nextStocks.length === 0) {
      router.replace(`/portfolio/select-stocks?preset=${activePreset}`);
      return;
    }

    if (nextStocks.length < 2) {
      setStatus('FAILED');
      setErrorMsg('ต้องมีหุ้นอย่างน้อย 2 ตัว เพื่อสร้างและจัดพอร์ต');
    }
  };

  if (!isSelectionReady) {
    return <div className="min-h-screen flex items-center justify-center text-gray-300">กำลังโหลดรายการหุ้น...</div>;
  }

  if (mode === 'results' && !isResultParamsReady) {
    return <div className="min-h-screen flex items-center justify-center text-gray-300">กำลังโหลดพารามิเตอร์...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <section className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(88,98,255,0.22),transparent_26%),linear-gradient(180deg,rgba(18,22,35,0.96),rgba(10,13,22,0.98))] p-5 shadow-[0_26px_90px_rgba(0,0,0,0.3)] sm:p-6 lg:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                if (mode === 'results') {
                  router.push(`/portfolio/optimizer?preset=${activePreset}`);
                } else {
                  router.push(selectStocksUrl);
                }
              }}
              className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/[0.08]"
            >
              <ChevronLeft className="h-4 w-4" />
              {mode === 'results' ? 'กลับไปหน้า Parameter' : 'กลับไปหน้าคัดกรองหุ้น'}
            </button>

            <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#7db8ff]/25 bg-[#7db8ff]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b9d8ff] sm:self-auto">
              <Sparkles className="h-3.5 w-3.5" />
              RoboAdvisor
            </div>
          </div>
          <h1 className="mt-8 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            {mode === 'results' ? 'RoboAdvisor Portfolio Results' : 'Build your portfolio with RoboAdvisor'}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400 sm:text-base">
            {mode === 'results'
              ? 'Review the optimization outcome, validate the allocation mix, and save the finished portfolio to your workspace.'
              : 'Review your selected stocks, configure the RoboAdvisor strategy, and continue when the portfolio settings are ready.'}
          </p>
        </section>

        {!canCreatePortfolio && (
          <section className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-yellow-300">
            <p className="font-semibold">ต้องมีหุ้นอย่างน้อย 2 ตัว</p>
            <p className="text-sm">ตอนนี้คุณเลือกไว้ {selectedStocks.length} ตัว กรุณาเพิ่มอย่างน้อยอีก 1 ตัว</p>
          </section>
        )}

        {mode === 'settings' ? (
          <div className="space-y-6">
            <PreviewPanel
              selectedStocks={selectedStocks}
              onRemoveStock={handleRemoveStock}
            />

            <ParameterPanel
              investmentAmount={investmentAmount}
              setInvestmentAmount={setInvestmentAmount}
              monthlyDca={monthlyDca}
              setMonthlyDca={setMonthlyDca}
              targetYears={targetYears}
              setTargetYears={setTargetYears}
              riskTolerance={riskTolerance}
              setRiskTolerance={setRiskTolerance}
              investmentHorizon={investmentHorizon}
              setInvestmentHorizon={setInvestmentHorizon}
              modelName={modelName}
              setModelName={setModelName}
              brokerMinOrder={brokerMinOrder}
              setBrokerMinOrder={setBrokerMinOrder}
              requireDiversification={requireDiversification}
              setRequireDiversification={setRequireDiversification}
              activePreset={activePreset}
              presetConfigPanel={
                activePreset === 'growth' ? (
                  <GrowthConfig value={presetConfig} onChange={setPresetConfig} />
                ) : activePreset === 'dividend' ? (
                  <DividendConfig value={presetConfig} onChange={setPresetConfig} />
                ) : activePreset === 'balanced' ? (
                  <BalancedConfig value={presetConfig} onChange={setPresetConfig} availableTagAllocations={availableTagAllocations} />
                ) : (
                  <CustomConfig value={presetConfig} onChange={setPresetConfig} availableTagAllocations={availableTagAllocations} />
                )
              }
              status={status}
              statusMessage={statusMessage}
              canRunOptimization={canRunOptimization}
              onOptimize={handleGoToResultsPage}
              onReset={handleResetParameters}
              onBack={() => router.push(`/portfolio/select-stocks?preset=${activePreset}`)}
            />
          </div>
        ) : (
          <ResultsPanel
            status={status}
            errorMsg={errorMsg}
            result={result}
            modelUsed={modelUsed}
            backtestAndMetrics={backtestAndMetrics}
            educationalInsights={educationalInsights}
            riskRewardProfile={riskRewardProfile}
            portfolioName={portfolioName}
            setPortfolioName={setPortfolioName}
            onSavePortfolio={handleSavePortfolio}
            isSaving={isSaving}
            canCreatePortfolio={canCreatePortfolio}
          />
        )}
      </div>
    </div>
  );
}
