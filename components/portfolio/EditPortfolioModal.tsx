'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ChartNoAxesColumn, Loader2, Pencil, Search, Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EditableAssetRow, { type EditablePortfolioAsset } from '@/components/portfolio/EditableAssetRow';
import { getPortfolioTickers } from '@/lib/actions/portfolio.actions';
import {
  getPortfolioOptimizationStatus,
  startPortfolioOptimization,
  updateSavedPortfolio,
} from '@/lib/actions/cloudflare.actions';
import type { FilteredStock } from '@/lib/portfolio-filtered-stocks';

type RiskLevel = 'low' | 'medium' | 'high';
type ModelName = 'mvo' | 'semi';

interface EditPortfolioModalProps {
  portfolio: EditPortfolioData;
  onSave: (portfolio: EditPortfolioData & { editedAssets: EditablePortfolioAsset[]; totalInvestment: number }) => void;
}

interface EditPortfolioData {
  id: string;
  name: string;
  tickers: string[];
  allocations?: Record<string, { weight: number; allocatedAmount: number }>;
  initialCapital?: number;
  monthlyDca?: number;
  targetYears?: number;
  lookbackYears?: number;
  requireDiversification?: boolean;
  modelName?: 'mvo' | 'semi';
  tickerTags?: Record<string, string>;
  mvoId?: string;
  riskLevel: 'low' | 'medium' | 'high';
  volatility: number;
  expectedReturn: number;
  updatedAt: string;
}

interface StockSuggestion {
  symbol: string;
  companyName: string;
  price: number;
  tag: string;
}

interface OptimizeResult {
  reqId: string;
  allocations: Record<string, { weight: number; allocatedAmount: number }>;
  expectedReturn: number;
  volatility: number;
  backtestAndMetrics?: any;
  riskRewardProfile?: any;
}

function slugifyId(symbol: string): string {
  return `${symbol.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampLookbackYears(years?: number | string): number {
  const parsedYears = Number(years);

  if (!Number.isFinite(parsedYears)) return 5;
  return Math.max(3, Math.min(20, Math.round(parsedYears)));
}

function buildInitialAssets(portfolio: EditPortfolioData): EditablePortfolioAsset[] {
  const totalInvestment = portfolio.initialCapital && portfolio.initialCapital > 0
    ? portfolio.initialCapital
    : Math.max(portfolio.tickers.length * 2500, 10000);

  const equalWeight = portfolio.tickers.length > 0 ? 100 / portfolio.tickers.length : 0;

  return portfolio.tickers.map((ticker) => {
    const normalizedTicker = String(ticker).trim().toUpperCase();
    const tag = portfolio.tickerTags?.[normalizedTicker] ?? 'unknown';
    const amount = totalInvestment * (equalWeight / 100);
    const fallbackPrice = 100;

    return {
      id: slugifyId(normalizedTicker),
      symbol: normalizedTicker,
      companyName: normalizedTicker,
      tag,
      shares: Number((amount / fallbackPrice).toFixed(2)),
      weight: Number(equalWeight.toFixed(1)),
      price: fallbackPrice,
    };
  });
}

function normalizeTag(raw?: string): string {
  const value = String(raw ?? '').trim().toLowerCase();
  return value || 'unknown';
}

export default function EditPortfolioModal({ portfolio, onSave }: EditPortfolioModalProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [search, setSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<StockSuggestion[]>([]);

  const [totalInvestment, setTotalInvestment] = useState<number>(portfolio.initialCapital && portfolio.initialCapital > 0 ? portfolio.initialCapital : Math.max(portfolio.tickers.length * 2500, 10000));
  const [assets, setAssets] = useState<EditablePortfolioAsset[]>(() => buildInitialAssets(portfolio));

  const [riskLevel, setRiskLevel] = useState<RiskLevel>(portfolio.riskLevel);
  const [modelName, setModelName] = useState<ModelName>(portfolio.modelName ?? 'mvo');
  const [lookbackYears, setLookbackYears] = useState<number>(clampLookbackYears(portfolio.lookbackYears));
  const [monthlyDca, setMonthlyDca] = useState(portfolio.monthlyDca ?? 0);
  const [targetYears, setTargetYears] = useState(portfolio.targetYears ?? 10);
  const [brokerMinOrder, setBrokerMinOrder] = useState(5);
  const [requireDiversification, setRequireDiversification] = useState(portfolio.requireDiversification ?? true);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [optimizedResult, setOptimizedResult] = useState<OptimizeResult | null>(null);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSearch('');
      setSearchResults([]);
      setSearchLoading(false);
      setTotalInvestment(portfolio.initialCapital && portfolio.initialCapital > 0 ? portfolio.initialCapital : Math.max(portfolio.tickers.length * 2500, 10000));
      setAssets(buildInitialAssets(portfolio));
      setRiskLevel(portfolio.riskLevel);
      setModelName(portfolio.modelName ?? 'mvo');
      setLookbackYears(clampLookbackYears(portfolio.lookbackYears));
      setMonthlyDca(portfolio.monthlyDca ?? 0);
      setTargetYears(portfolio.targetYears ?? 10);
      setBrokerMinOrder(5);
      setRequireDiversification(portfolio.requireDiversification ?? true);
      setIsOptimizing(false);
      setIsSaving(false);
      setStatusMessage(null);
      setOptimizedResult(null);
    }
  }, [open, portfolio]);

  useEffect(() => {
    if (!open || assets.length === 0) return;

    let cancelled = false;

    const hydrateAssetMetadata = async () => {
      const updates = await Promise.all(
        assets.map(async (asset) => {
          try {
            const response = await getPortfolioTickers(1, 20, { search: asset.symbol });
            if (!response.success || !response.tickers) return asset;

            const exact = response.tickers.find((item) => String(item.ticker || '').trim().toUpperCase() === asset.symbol);
            if (!exact) return asset;

            const price = Number.isFinite(exact.latestPrice)
              ? Number(exact.latestPrice)
              : Number.isFinite(exact.yesterdayPrice)
                ? Number(exact.yesterdayPrice)
                : asset.price;

            return {
              ...asset,
              companyName: exact.companyName || asset.companyName,
              price,
              tag: normalizeTag(asset.tag !== 'unknown' ? asset.tag : exact.sectorPerformanceTier),
            };
          } catch {
            return asset;
          }
        })
      );

      if (!cancelled) {
        setAssets(updates);
      }
    };

    void hydrateAssetMetadata();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const term = search.trim();
    if (!term) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await getPortfolioTickers(1, 25, { search: term });
        if (!response.success || !response.tickers) {
          setSearchResults([]);
          return;
        }

        const existing = new Set(assets.map((asset) => asset.symbol));
        const mapped = response.tickers
          .map((item) => {
            const symbol = String(item.ticker || '').trim().toUpperCase();
            const price = Number.isFinite(item.latestPrice)
              ? Number(item.latestPrice)
              : Number.isFinite(item.yesterdayPrice)
                ? Number(item.yesterdayPrice)
                : 0;

            return {
              symbol,
              companyName: item.companyName || symbol,
              price,
              tag: normalizeTag(item.sectorPerformanceTier),
            } satisfies StockSuggestion;
          })
          .filter((item) => item.symbol && !existing.has(item.symbol));

        setSearchResults(mapped.slice(0, 8));
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [open, search, assets]);

  const totalAllocation = useMemo(
    () => assets.reduce((sum, asset) => sum + (Number.isFinite(asset.weight) ? asset.weight : 0), 0),
    [assets]
  );

  const totalInvested = useMemo(
    () => assets.reduce((sum, asset) => sum + (totalInvestment * (asset.weight / 100)), 0),
    [assets, totalInvestment]
  );

  const allocationBalanced = Math.abs(totalAllocation - 100) < 0.01;
  const canProceed = assets.length >= 2;
  const oldAllocations = portfolio.allocations || {};
  const oldSymbols = Object.keys(oldAllocations);
  const newAllocations = optimizedResult?.allocations || {};
  const newSymbols = Object.keys(newAllocations);
  const compareSymbols = Array.from(new Set([...oldSymbols, ...newSymbols])).sort();

  const removeAsset = (id: string) => {
    setAssets((prev) => prev.filter((asset) => asset.id !== id));
    setOptimizedResult(null);
  };

  const addAsset = (stock: StockSuggestion) => {
    setAssets((prev) => {
      const nextCount = prev.length + 1;
      const defaultWeight = nextCount > 0 ? Number((100 / nextCount).toFixed(1)) : 0;
      return [
        ...prev,
        {
          id: slugifyId(stock.symbol),
          symbol: stock.symbol,
          companyName: stock.companyName,
          tag: stock.tag,
          shares: Number((1000 / Math.max(stock.price, 1)).toFixed(2)),
          weight: defaultWeight,
          price: stock.price || 0,
        },
      ];
    });
    setSearch('');
    setSearchResults([]);
    setOptimizedResult(null);
  };

  const stocksPayload = useMemo<FilteredStock[]>(() => {
    return assets.map((asset) => ({
      symbol: asset.symbol,
      name: asset.companyName,
      sector: 'Unknown',
      marketCap: 0,
      tag: normalizeTag(asset.tag),
      latestPrice: Number.isFinite(asset.price) ? asset.price : undefined,
    }));
  }, [assets]);

  const shareOverrides = useMemo(() => {
    return assets.reduce<Record<string, { shares: number; price?: number; tag?: string }>>((acc, asset) => {
      const symbol = asset.symbol.trim().toUpperCase();
      if (!symbol) return acc;

      acc[symbol] = {
        shares: Math.max(0, Number.isFinite(asset.shares) ? Number(asset.shares) : 0),
        price: Number.isFinite(asset.price) ? Number(asset.price) : undefined,
        tag: normalizeTag(asset.tag),
      };

      return acc;
    }, {});
  }, [assets]);

  const handleRunOptimization = async () => {
    if (!canProceed) {
      toast.error('Please keep at least 2 stocks before optimizing.');
      return;
    }

    setIsOptimizing(true);
    setStatusMessage('Submitting optimization request...');
    setOptimizedResult(null);

    try {
      const optimizeResponse = await startPortfolioOptimization(
        stocksPayload,
        lookbackYears,
        riskLevel,
        requireDiversification,
        modelName,
        shareOverrides
      );

      if (!optimizeResponse.success || !optimizeResponse.reqId) {
        throw new Error(optimizeResponse.error || 'Failed to start optimization');
      }

      const reqId = optimizeResponse.reqId;
      let finalStatus: Awaited<ReturnType<typeof getPortfolioOptimizationStatus>> | null = null;

      for (let attempt = 0; attempt < 30; attempt += 1) {
        setStatusMessage('Optimizing updated portfolio...');
        const status = await getPortfolioOptimizationStatus(reqId, totalInvestment, brokerMinOrder);

        if (!status.success) {
          throw new Error(status.error || 'Failed to check optimization status');
        }

        if (status.status === 'PORTFOLIO_READY' && status.portfolio) {
          finalStatus = status;
          break;
        }

        if (status.status === 'FAILED') {
          throw new Error(status.message || 'Optimization failed');
        }

        await new Promise((resolve) => setTimeout(resolve, 2500));
      }

      if (!finalStatus?.portfolio) {
        throw new Error('Optimization timed out before results were ready');
      }

      setOptimizedResult({
        reqId,
        allocations: finalStatus.portfolio.allocations,
        expectedReturn: finalStatus.portfolio.expectedReturn,
        volatility: finalStatus.portfolio.volatility,
        backtestAndMetrics: finalStatus.backtestAndMetrics,
        riskRewardProfile: finalStatus.explainability?.riskRewardProfile,
      });
      setStatusMessage('Optimization ready. Review the compare panel before saving.');
      toast.success('Optimization completed. Review changes below.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(message);
      setStatusMessage(message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSave = async () => {
    if (!optimizedResult) {
      toast.error('Please run optimization first.');
      return;
    }

    setIsSaving(true);
    setStatusMessage('Saving updated portfolio...');

    try {
      const tickerTags = assets.reduce<Record<string, string>>((acc, asset) => {
        const symbol = asset.symbol.trim().toUpperCase();
        if (!symbol) return acc;
        acc[symbol] = normalizeTag(asset.tag);
        return acc;
      }, {});

      const response = await updateSavedPortfolio({
        id: portfolio.id,
        name: portfolio.name,
        tickers: assets.map((asset) => asset.symbol.trim().toUpperCase()),
        tickerTags,
        allocations: optimizedResult.allocations,
        expectedReturn: optimizedResult.expectedReturn,
        volatility: optimizedResult.volatility,
        initialCapital: totalInvestment,
        riskLevel,
        modelName,
        mvoId: optimizedResult.reqId,
        monthlyDca,
        targetYears,
        lookbackYears,
        requireDiversification,
        backtestAndMetrics: optimizedResult.backtestAndMetrics || null,
        riskRewardProfile: optimizedResult.riskRewardProfile || null,
      });

      if (!response.success || !response.portfolio) {
        throw new Error(response.error || 'Failed to save updated portfolio');
      }

      onSave({
        ...portfolio,
        ...response.portfolio,
        editedAssets: assets,
        totalInvestment,
      });

      toast.success('Portfolio updated successfully');
      setOpen(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(message);
      setStatusMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-xl border border-[#2c3d59] bg-[#0d1626]/85 text-[#8dc2ff] shadow-[0_10px_25px_rgba(8,15,30,0.35)] transition-all hover:border-[#4d8bff] hover:bg-[#12203a] hover:text-white"
          title={`Edit ${portfolio.name}`}
          aria-label={`Edit ${portfolio.name}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-hidden border-[#22324d] bg-[linear-gradient(180deg,#08111e,#0a1322_50%,#09101b)] p-0 text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:max-w-4xl">
        <div className="flex max-h-[90vh] flex-col overflow-hidden">
          <DialogHeader className="border-b border-[#1d2a41] bg-[radial-gradient(circle_at_top_right,rgba(52,123,255,0.16),transparent_28%),linear-gradient(180deg,rgba(10,18,31,0.98),rgba(8,14,26,0.98))] px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <DialogTitle className="text-2xl font-semibold tracking-tight text-white">Edit Portfolio</DialogTitle>
                <DialogDescription className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                  {step === 1
                    ? 'Step 1: review holdings, add/remove stocks, and confirm what will be optimized.'
                    : 'Step 2: adjust optimizer parameters, run optimization, then review old vs new allocations before saving.'}
                </DialogDescription>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[#22324d] bg-[#09101a]/85 p-3 lg:min-w-[280px]">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Step</p>
                  <p className="mt-1 text-sm font-medium text-gray-100">{step === 1 ? 'Select Stocks' : 'Optimize Portfolio'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Portfolio</p>
                  <p className="mt-1 text-sm font-medium text-gray-100">{portfolio.name}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Assets</p>
                  <p className="mt-1 text-sm font-medium text-gray-100">{assets.length} selected</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Target</p>
                  <p className="mt-1 text-sm font-medium text-emerald-300">${totalInvestment.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {step === 1 ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#22324d] bg-[#0b1524] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#11203a] text-[#8bc1ff]">
                      <Search className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Add Assets</h3>
                      <p className="text-xs text-gray-400">Search real stocks from portfolio ticker metadata and add them into this edit list.</p>
                    </div>
                  </div>

                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value.toUpperCase())}
                    placeholder="Search stocks like NVDA, KO, MSFT..."
                    className="border-[#2a3d5e] bg-[#07101d] text-white placeholder:text-gray-500 focus-visible:border-[#4d8bff]"
                  />

                  {searchLoading ? (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#22324d] bg-[#08111e] px-4 py-3 text-sm text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching stocks...
                    </div>
                  ) : null}

                  {searchResults.length > 0 && (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-[#22324d] bg-[#08111e]">
                      {searchResults.map((stock) => (
                        <button
                          key={stock.symbol}
                          type="button"
                          onClick={() => addAsset(stock)}
                          className="flex w-full items-center justify-between gap-3 border-b border-[#162338] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#0e1b30]"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">{stock.symbol}</span>
                              <span className="rounded-full border border-[#355786] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[#8bc1ff]">
                                {stock.tag}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-400">{stock.companyName}</p>
                          </div>
                          <span className="text-sm font-medium text-emerald-300">${stock.price.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {assets.map((asset) => (
                    <EditableAssetRow
                      key={asset.id}
                      asset={asset}
                      onRemove={removeAsset}
                    />
                  ))}

                  {assets.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[#2a3d5e] bg-[#09121e] px-6 py-10 text-center">
                      <p className="text-sm font-medium text-gray-200">Your edit list is empty</p>
                      <p className="mt-1 text-sm text-gray-500">Use search above to add stocks into this portfolio.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5 sm:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#11203a] text-[#8bc1ff]">
                      <Settings2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Optimize Portfolio</h3>
                      <p className="text-sm text-gray-400">Use updated parameters, run optimization, then compare before saving.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 flex items-center text-sm font-medium text-gray-300">เงินลงทุนตั้งต้น (USD)</label>
                      <input
                        type="number"
                        min={100}
                        value={totalInvestment}
                        onChange={(event) => setTotalInvestment(Math.max(0, Number(event.target.value) || 0))}
                        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder:text-gray-500 focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 flex items-center text-sm font-medium text-gray-300">เงินลงทุนรายเดือน (USD)</label>
                      <input
                        type="number"
                        min={0}
                        value={monthlyDca}
                        onChange={(event) => setMonthlyDca(Math.max(0, Number(event.target.value) || 0))}
                        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder:text-gray-500 focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 flex items-center text-sm font-medium text-gray-300">จำนวนปีเป้าหมาย</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={targetYears}
                        onChange={(event) => setTargetYears(Math.min(20, Math.max(1, Number(event.target.value) || 1)))}
                        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder:text-gray-500 focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <p className="mb-2 flex items-center text-sm font-medium text-gray-300">ระดับความเสี่ยง</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['low', 'medium', 'high'] as RiskLevel[]).map((risk) => {
                          const active = riskLevel === risk;
                          const label = risk === 'low' ? 'ต่ำ' : risk === 'medium' ? 'กลาง' : 'สูง';
                          return (
                            <button
                              key={risk}
                              type="button"
                              onClick={() => setRiskLevel(risk)}
                              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                active
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 flex items-center text-sm font-medium text-gray-300">ระยะเวลาข้อมูลย้อนหลัง</label>
                      <input
                        type="number"
                        min={3}
                        max={20}
                        value={lookbackYears}
                        onChange={(event) => setLookbackYears(clampLookbackYears(event.target.value))}
                        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder:text-gray-500 focus:border-blue-600 focus:outline-none"
                      />
                      <p className="mt-1 text-xs text-gray-500">กรอกได้ตั้งแต่ 3 ถึง 20 ปี และหากกรอกเกินช่วง ระบบจะปรับกลับอัตโนมัติ</p>
                    </div>

                    <div>
                      <label className="mb-1 flex items-center text-sm font-medium text-gray-300">โมเดลที่ใช้จัดพอร์ต</label>
                      <select
                        value={modelName}
                        onChange={(event) => setModelName(event.target.value as ModelName)}
                        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-600 focus:outline-none"
                      >
                        <option value="mvo">MVO (Mean-Variance)</option>
                        <option value="semi">Semi-Variance</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 flex items-center text-sm font-medium text-gray-300">มูลค่าขั้นต่ำต่อคำสั่งซื้อ (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={brokerMinOrder}
                        onChange={(event) => setBrokerMinOrder(Number(event.target.value) || 0)}
                        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder:text-gray-500 focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={requireDiversification}
                          onChange={(event) => setRequireDiversification(event.target.checked)}
                          className="h-4 w-4"
                        />
                        เปิดการกระจายความเสี่ยง
                      </label>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#22324d] bg-[linear-gradient(180deg,rgba(12,19,33,0.95),rgba(9,16,28,0.95))] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#11203a] text-[#8bc1ff]">
                      <ChartNoAxesColumn className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Portfolio Summary</h3>
                      <p className="text-xs text-gray-400">Snapshot before running re-optimization and saving.</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#1d2a41] bg-[#07101d] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Assets selected</span>
                        <span className="text-sm font-semibold text-white">{assets.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Current allocation</span>
                        <span className={`text-sm font-semibold ${allocationBalanced ? 'text-emerald-300' : 'text-amber-300'}`}>
                          {totalAllocation.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Estimated invested</span>
                        <span className="text-sm font-semibold text-white">
                          ${totalInvested.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {optimizedResult ? (
                  <div className="rounded-2xl border border-[#2a3d5e] bg-[#08111e] p-5">
                    <h4 className="text-sm font-semibold text-white">Compare Allocation (Old vs New)</h4>
                    <div className="mt-3 overflow-hidden rounded-xl border border-[#1d2a41]">
                      <table className="w-full text-sm">
                        <thead className="bg-[#0d1728] text-xs uppercase tracking-wide text-gray-400">
                          <tr>
                            <th className="px-3 py-2 text-left">Ticker</th>
                            <th className="px-3 py-2 text-right">Old %</th>
                            <th className="px-3 py-2 text-right">New %</th>
                            <th className="px-3 py-2 text-right">Delta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {compareSymbols.map((symbol) => {
                            const oldWeight = Number((oldAllocations[symbol]?.weight || 0) * 100);
                            const newWeight = Number((newAllocations[symbol]?.weight || 0) * 100);
                            const delta = newWeight - oldWeight;

                            return (
                              <tr key={symbol} className="border-t border-[#162338] text-gray-200">
                                <td className="px-3 py-2 font-medium text-white">{symbol}</td>
                                <td className="px-3 py-2 text-right">{oldWeight.toFixed(2)}%</td>
                                <td className="px-3 py-2 text-right">{newWeight.toFixed(2)}%</td>
                                <td className={`px-3 py-2 text-right font-semibold ${delta >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                  {delta >= 0 ? '+' : ''}{delta.toFixed(2)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-[#1d2a41] bg-[#08111d] px-6 py-4 sm:justify-between">
            <p className="text-xs text-gray-500">
              {step === 1
                ? 'Step 1 edits holdings only. Continue to Step 2 for optimization parameters.'
                : 'Run optimization first, review compare panel, then save the updated portfolio.'}
            </p>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              {step === 2 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="border-[#2a3d5e] bg-[#0d1524] text-gray-200 hover:bg-[#132038] hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="border-[#2a3d5e] bg-[#0d1524] text-gray-200 hover:bg-[#132038] hover:text-white"
                >
                  Cancel
                </Button>
              )}

              {step === 1 ? (
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canProceed}
                  className="bg-[linear-gradient(135deg,#4d8bff,#2d6bff)] text-white shadow-[0_16px_35px_rgba(45,107,255,0.22)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </Button>
              ) : optimizedResult ? (
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-[linear-gradient(135deg,#18d299,#0cc38a)] text-[#03130f] shadow-[0_16px_35px_rgba(11,199,137,0.22)] hover:brightness-105"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleRunOptimization}
                  disabled={isOptimizing || !canProceed}
                  className="bg-[linear-gradient(135deg,#4d8bff,#2d6bff)] text-white shadow-[0_16px_35px_rgba(45,107,255,0.22)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isOptimizing ? 'Optimizing...' : 'Run Re-Optimization'}
                </Button>
              )}
            </div>
          </DialogFooter>
          {statusMessage ? (
            <div className="border-t border-[#1d2a41] bg-[#09111c] px-6 py-3 text-sm text-gray-400">
              {statusMessage}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
