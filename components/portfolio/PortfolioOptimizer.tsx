"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { startPortfolioOptimization, getPortfolioOptimizationStatus, savePortfolioToDatabase } from '@/lib/actions/cloudflare.actions';
import { type CompanyProfile, fetchRiskBounds, getPortfolioTickers } from '@/lib/actions/portfolio.actions';
import {
  clearRoboChatStocksFromSession,
  type FilteredStock,
  getFilteredStocksFromSession,
  getRoboChatStocksFromSession,
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
  PortfolioRiskLevel,
  RiskBounds,
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

const ROBOCHAT_PLACEHOLDER_SECTOR = 'RoboChat Selection';

function normalizeTickerList(tickers: string[]): string[] {
  return Array.from(
    new Set(
      tickers
        .map((ticker) => ticker.trim().toUpperCase())
        .filter(Boolean)
    )
  );
}

function extractTickersFromFilteredStocks(stocks: FilteredStock[]): string[] {
  return normalizeTickerList(stocks.map((stock) => stock.symbol));
}

function requiresStockHydration(stocks: FilteredStock[]): boolean {
  return stocks.some((stock) => {
    const normalizedSector = String(stock.sector ?? '').trim();
    const hasPriceData = Number.isFinite(stock.latestPrice) || Number.isFinite(stock.dayChangePercent);

    return normalizedSector === ROBOCHAT_PLACEHOLDER_SECTOR || (!normalizedSector || normalizedSector === '-') || !hasPriceData;
  });
}

function mapCompanyProfileToFilteredStock(stock: CompanyProfile): FilteredStock {
  const latestPrice = Number.isFinite(stock.latestPrice) ? Number(stock.latestPrice) : undefined;
  const yesterdayPrice = Number.isFinite(stock.yesterdayPrice) ? Number(stock.yesterdayPrice) : undefined;
  const dayChangePercent =
    Number.isFinite(latestPrice) && Number.isFinite(yesterdayPrice) && Number(yesterdayPrice) > 0
      ? ((Number(latestPrice) - Number(yesterdayPrice)) / Number(yesterdayPrice)) * 100
      : undefined;

  return {
    symbol: String(stock.ticker ?? '').trim().toUpperCase(),
    name: String(stock.companyName ?? stock.ticker ?? '').trim(),
    sector: String(stock.sector ?? '').trim() || '-',
    marketCap: 0,
    tag: typeof stock.sectorPerformanceTier === 'string' ? stock.sectorPerformanceTier.trim().toLowerCase() : undefined,
    latestPrice,
    dayChangePercent,
  };
}

function buildFallbackFilteredStocks(tickers: string[], stocksByTicker: Map<string, FilteredStock>): FilteredStock[] {
  return tickers.map((ticker) => {
    const existing = stocksByTicker.get(ticker);
    if (existing) return existing;

    return {
      symbol: ticker,
      name: ticker,
      sector: '-',
      marketCap: 0,
    };
  });
}

function buildTickerMap(stocks: FilteredStock[]): Record<string, string> {
  return stocks.reduce<Record<string, string>>((acc, stock) => {
    const symbol = String(stock.symbol ?? '').trim().toUpperCase();
    if (!symbol) return acc;

    acc[symbol] = typeof stock.tag === 'string' && stock.tag.trim().length > 0
      ? stock.tag.trim().toLowerCase()
      : 'unknown';

    return acc;
  }, {});
}

function clampRiskToBounds(value: number | null, bounds: RiskBounds): number {
  if (!Number.isFinite(value)) {
    return Number(((bounds.minRisk + bounds.maxRisk) / 2).toFixed(6));
  }

  return Number(Math.min(bounds.maxRisk, Math.max(bounds.minRisk, Number(value))).toFixed(6));
}

function classifyRiskLevel(targetRisk: number | null, bounds: RiskBounds | null): PortfolioRiskLevel | null {
  if (!bounds || !Number.isFinite(targetRisk) || bounds.maxRisk <= bounds.minRisk) {
    return null;
  }

  const posPct = ((Number(targetRisk) - bounds.minRisk) / (bounds.maxRisk - bounds.minRisk)) * 100;

  if (posPct < 35) return 'LOW';
  if (posPct > 45) return 'HIGH';
  return 'MED';
}

function normalizePortfolioRiskLevel(value: PortfolioRiskLevel | string | null | undefined): 'low' | 'medium' | 'high' {
  const normalized = String(value ?? '').trim().toUpperCase();

  if (normalized === 'LOW') return 'low';
  if (normalized === 'HIGH') return 'high';
  return 'medium';
}

export default function PortfolioOptimizer({ mode = 'settings' }: PortfolioOptimizerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetQuery = searchParams.get('preset');
  const handoffTickersQuery = searchParams.get('tickers');
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
  const [selectionLoadingMessage, setSelectionLoadingMessage] = useState('กำลังโหลดรายการหุ้น...');
  const [investmentAmount, setInvestmentAmount] = useState<number>(10000);
  const [monthlyDca, setMonthlyDca] = useState<number>(0);
  const [targetYears, setTargetYears] = useState<number>(10);
  const [investmentHorizon, setInvestmentHorizon] = useState<InvestmentHorizon>('medium');
  const [brokerMinOrder, setBrokerMinOrder] = useState<number>(5);
  const [targetRisk, setTargetRisk] = useState<number | null>(null);
  const [riskBounds, setRiskBounds] = useState<RiskBounds | null>(null);
  const [isFetchingRiskBounds, setIsFetchingRiskBounds] = useState(false);
  const [riskBoundsError, setRiskBoundsError] = useState<string | null>(null);
  const optimizedRiskLevelRef = useRef<'low' | 'medium' | 'high'>('medium');
  const lastRiskBoundsWarningRef = useRef<string | null>(null);
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

  const tickerMap = useMemo(() => buildTickerMap(selectedStocks), [selectedStocks]);
  const targetAllocationsKey = useMemo(
    () => JSON.stringify(presetConfig.targetAllocations || {}),
    [presetConfig.targetAllocations]
  );
  const derivedRiskLevel = useMemo(
    () => classifyRiskLevel(targetRisk, riskBounds),
    [riskBounds, targetRisk]
  );

  const canRunOptimization =
    canCreatePortfolio &&
    Number.isFinite(investmentAmount) &&
    investmentAmount > 0 &&
    Number.isFinite(monthlyDca) &&
    monthlyDca >= 0 &&
    Number.isFinite(targetYears) &&
    targetYears >= 1 &&
    targetYears <= 20 &&
    !!riskBounds &&
    Number.isFinite(targetRisk) &&
    !isFetchingRiskBounds;

  useEffect(() => {
    let isCancelled = false;

    const initializeSelection = async () => {
      const stocksFromFilter = getFilteredStocksFromSession(resolvedPresetFromQuery);
      const roboChatHandoffStocks = getRoboChatStocksFromSession();
      const queryTickers = normalizeTickerList((handoffTickersQuery ?? '').split(','));
      const handoffTickers = extractTickersFromFilteredStocks(roboChatHandoffStocks);
      const storedTickers = extractTickersFromFilteredStocks(stocksFromFilter);

      const shouldHydrateStoredStocks = stocksFromFilter.length > 0 && requiresStockHydration(stocksFromFilter);
      const pendingHydrationTickers =
        queryTickers.length > 0
          ? queryTickers
          : handoffTickers.length > 0
            ? handoffTickers
            : shouldHydrateStoredStocks
              ? storedTickers
              : [];

      if (stocksFromFilter.length > 0 && pendingHydrationTickers.length === 0) {
        if (isCancelled) return;
        setErrorMsg(null);
        setSelectedStocks(stocksFromFilter);
        setIsSelectionReady(true);
        return;
      }

      if (pendingHydrationTickers.length === 0) {
        router.replace(selectStocksUrl);
        return;
      }

      setSelectionLoadingMessage('กำลังดึงข้อมูลราคาหุ้นล่าสุดและข้อมูลบริษัท...');

      try {
        const responses = await Promise.all(
          pendingHydrationTickers.map(async (ticker) => {
            const response = await getPortfolioTickers(1, 20, { search: ticker });
            if (!response.success || !response.tickers) return null;

            return response.tickers.find((stock) => String(stock.ticker ?? '').trim().toUpperCase() === ticker) ?? null;
          })
        );

        if (isCancelled) return;

        const hydratedStocks = responses.filter((stock): stock is CompanyProfile => stock !== null).map(mapCompanyProfileToFilteredStock);
        const fallbackStockMap = new Map<string, FilteredStock>([
          ...stocksFromFilter.map((stock) => [stock.symbol.trim().toUpperCase(), stock] as const),
          ...roboChatHandoffStocks.map((stock) => [stock.symbol.trim().toUpperCase(), stock] as const),
        ]);

        const nextStocks = buildFallbackFilteredStocks(
          pendingHydrationTickers,
          new Map<string, FilteredStock>([
            ...fallbackStockMap,
            ...hydratedStocks.map((stock) => [stock.symbol, stock] as const),
          ])
        );

        setFilteredStocksInSession(nextStocks, resolvedPresetFromQuery);
        clearRoboChatStocksFromSession();
        setErrorMsg(null);
        setSelectedStocks(nextStocks);
        setIsSelectionReady(true);

        const hydratedCount = hydratedStocks.length;
        if (hydratedCount < pendingHydrationTickers.length) {
          setStatus('FAILED');
          setErrorMsg('โหลดข้อมูลหุ้นได้ไม่ครบทุกตัว ข้อมูลบางแถวอาจยังไม่สมบูรณ์');
        }
      } catch (error) {
        if (isCancelled) return;

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setErrorMsg('ไม่สามารถโหลดข้อมูลหุ้นล่าสุดได้: ' + errorMessage);
        setStatus('FAILED');

        const fallbackTickers = pendingHydrationTickers;
        const fallbackStockMap = new Map<string, FilteredStock>([
          ...stocksFromFilter.map((stock) => [stock.symbol.trim().toUpperCase(), stock] as const),
          ...roboChatHandoffStocks.map((stock) => [stock.symbol.trim().toUpperCase(), stock] as const),
        ]);

        const sanitizedFallbackStocks = buildFallbackFilteredStocks(fallbackTickers, fallbackStockMap).map((stock) => ({
          ...stock,
          sector: stock.sector === ROBOCHAT_PLACEHOLDER_SECTOR ? '-' : stock.sector,
        }));

        setFilteredStocksInSession(sanitizedFallbackStocks, resolvedPresetFromQuery);
        clearRoboChatStocksFromSession();
        setSelectedStocks(sanitizedFallbackStocks);
        setIsSelectionReady(true);
      }
    };

    void initializeSelection();

    return () => {
      isCancelled = true;
    };
  }, [handoffTickersQuery, resolvedPresetFromQuery, router, selectStocksUrl]);

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
    setTargetRisk(params.targetRisk);
    setRiskBounds(params.riskBounds);
    setInvestmentHorizon(params.investmentHorizon);
    setModelName(params.modelName);
    setBrokerMinOrder(params.brokerMinOrder);
    setRequireDiversification(params.requireDiversification);
    setPresetConfig(params.presetConfig);
    optimizedRiskLevelRef.current = normalizePortfolioRiskLevel(classifyRiskLevel(params.targetRisk, params.riskBounds));
    setIsResultParamsReady(true);
  }, [isSelectionReady, mode, router]);

  useEffect(() => {
    if (!isSelectionReady || mode !== 'settings') return;

    if (Object.keys(tickerMap).length < 2) {
      setRiskBounds(null);
      setTargetRisk(null);
      setRiskBoundsError(null);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsFetchingRiskBounds(true);
      setRiskBoundsError(null);

      try {
        const response = await fetchRiskBounds({
          tickers: tickerMap,
          lookbackYears,
          modelName,
          preset: presetConfig.preset,
          targetAllocations: presetConfig.targetAllocations,
          requireDiversification,
        });

        if (cancelled) return;

        if (!response.success || !response.bounds) {
          const message = response.error || 'ไม่สามารถคำนวณช่วงความเสี่ยงได้';
          setRiskBounds(null);
          setTargetRisk(null);
          setRiskBoundsError(message);
          toast.error(message);
          return;
        }

        const nextBounds = response.bounds;
        const nextTargetRisk = clampRiskToBounds(targetRisk, nextBounds);
        const didAutoAdjustRiskTarget = Number.isFinite(targetRisk) && nextTargetRisk !== Number(targetRisk);

        setRiskBounds(nextBounds);
        setTargetRisk(nextTargetRisk);
        setRiskBoundsError(null);

        if (didAutoAdjustRiskTarget) {
          toast.info('ปรับค่าความเสี่ยงเป้าหมายให้สอดคล้องกับการตั้งค่าใหม่แล้ว (Risk target auto-adjusted)');
        }

        if (nextBounds.warningMsg && nextBounds.warningMsg !== lastRiskBoundsWarningRef.current) {
          lastRiskBoundsWarningRef.current = nextBounds.warningMsg;
          toast.warning(nextBounds.warningMsg);
        }
      } catch (error) {
        if (cancelled) return;

        const message = error instanceof Error ? error.message : 'ไม่สามารถคำนวณช่วงความเสี่ยงได้';
        setRiskBounds(null);
        setTargetRisk(null);
        setRiskBoundsError(message);
        toast.error(message);
      } finally {
        if (!cancelled) {
          setIsFetchingRiskBounds(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [isSelectionReady, lookbackYears, mode, modelName, presetConfig.preset, requireDiversification, targetAllocationsKey, tickerMap]);

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

    if (!riskBounds || !Number.isFinite(targetRisk)) {
      setErrorMsg('กรุณารอให้ระบบคำนวณช่วงความเสี่ยงให้เสร็จก่อน');
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

    optimizedRiskLevelRef.current = normalizePortfolioRiskLevel(derivedRiskLevel);

    try {
      const response = await startPortfolioOptimization(
        selectedStocks,
        lookbackYears,
        Number(targetRisk),
        requireDiversification,
        modelName,
        undefined,
        {
          preset: presetConfig.preset,
          customMethod: presetConfig.customMethod,
          span: presetConfig.span,
          targetAllocations: presetConfig.targetAllocations,
        },
        {
          minRisk: riskBounds.minRisk,
          maxRisk: riskBounds.maxRisk,
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
      targetRisk: Number(targetRisk),
      riskBounds,
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
          optimizedRiskLevelRef.current = normalizePortfolioRiskLevel(response.portfolio.riskLevel ?? derivedRiskLevel);
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
    setTargetRisk(null);
    setRiskBounds(null);
    setRiskBoundsError(null);
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-gray-200 shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
          <Loader2 className="h-5 w-5 animate-spin text-[#7db8ff]" />
          <span>{selectionLoadingMessage}</span>
        </div>
      </div>
    );
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
              targetRisk={targetRisk}
              setTargetRisk={setTargetRisk}
              riskBounds={riskBounds}
              isFetchingRiskBounds={isFetchingRiskBounds}
              riskBoundsError={riskBoundsError}
              derivedRiskLevel={derivedRiskLevel}
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
