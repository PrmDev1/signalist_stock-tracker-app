'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Activity, ArrowLeft, ArrowRight, BarChart3, Bot, DollarSign, Loader2, PiggyBank, Shield, Sparkles, TrendingUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { savePortfolioToDatabase } from '@/lib/actions/cloudflare.actions';
import CommunityPortfolioCard from './CommunityPortfolioCard';
import PortfolioFilters from './PortfolioFilters';
import type { BacktestAndMetrics } from '@/components/portfolio/analysis-types';
import type {
  CommunityAllocationEntry,
  CommunityPortfolioData,
  CommunityPortfolioFilterDraft,
  CommunityPortfolioQuery,
  CommunityPortfolioResponse,
} from './types';
import { normalizeCommunityAllocations } from './types';

const PAGE_SIZE = 6;

const EMPTY_FILTERS: CommunityPortfolioFilterDraft = {
  minReturn: '',
  maxReturn: '',
  minRisk: '',
  maxRisk: '',
  riskLevel: 'all',
  modelName: 'all',
  isDiversified: 'all',
};

function parsePositiveInteger(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNumericFilter(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

function normalizeRange(minValue?: number, maxValue?: number): Pick<CommunityPortfolioQuery, 'minReturn' | 'maxReturn'>;
function normalizeRange(minValue?: number, maxValue?: number): { minReturn?: number; maxReturn?: number } {
  if (typeof minValue === 'number' && typeof maxValue === 'number' && minValue > maxValue) {
    return { minReturn: maxValue, maxReturn: minValue };
  }

  return { minReturn: minValue, maxReturn: maxValue };
}

function normalizeRiskRange(minValue?: number, maxValue?: number): Pick<CommunityPortfolioQuery, 'minRisk' | 'maxRisk'> {
  if (typeof minValue === 'number' && typeof maxValue === 'number' && minValue > maxValue) {
    return { minRisk: maxValue, maxRisk: minValue };
  }

  return { minRisk: minValue, maxRisk: maxValue };
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCurrency(value?: number): string {
  if (!Number.isFinite(value)) return 'ไม่มีข้อมูล';

  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number(value));
}

function formatModel(value: string): string {
  return value.toLowerCase() === 'semi' ? 'Semi-Variance' : value.toUpperCase();
}

function formatRiskLabel(value?: string): string {
  const normalized = value?.trim().toLowerCase();

  if (normalized === 'low') return 'ความเสี่ยงต่ำ';
  if (normalized === 'high') return 'ความเสี่ยงสูง';
  return 'ความเสี่ยงปานกลาง';
}

function formatCreatedDate(value?: string | null): string {
  if (!value) return 'ไม่มีข้อมูล';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'ไม่มีข้อมูล';

  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(parsed);
}

function readDraftFromSearchParams(searchParams: URLSearchParams): CommunityPortfolioFilterDraft {
  const readTriState = (value: string | null): CommunityPortfolioFilterDraft['isDiversified'] => {
    if (value === 'true') return 'yes';
    if (value === 'false') return 'no';
    return 'all';
  };

  return {
    minReturn: searchParams.get('minReturn') ?? '',
    maxReturn: searchParams.get('maxReturn') ?? '',
    minRisk: searchParams.get('minRisk') ?? '',
    maxRisk: searchParams.get('maxRisk') ?? '',
    riskLevel: (searchParams.get('riskLevel') as CommunityPortfolioFilterDraft['riskLevel']) || 'all',
    modelName: (searchParams.get('modelName') as CommunityPortfolioFilterDraft['modelName']) || 'all',
    isDiversified: readTriState(searchParams.get('isDiversified')),
  };
}

function buildQueryFromDraft(draft: CommunityPortfolioFilterDraft, page: number): CommunityPortfolioQuery {
  const normalizedReturnRange = normalizeRange(parseNumericFilter(draft.minReturn), parseNumericFilter(draft.maxReturn));
  const normalizedRiskRange = normalizeRiskRange(parseNumericFilter(draft.minRisk), parseNumericFilter(draft.maxRisk));

  return {
    page,
    size: PAGE_SIZE,
    riskLevel: draft.riskLevel === 'all' ? undefined : draft.riskLevel,
    modelName: draft.modelName === 'all' ? undefined : draft.modelName,
    ...normalizedReturnRange,
    ...normalizedRiskRange,
    isDiversified:
      draft.isDiversified === 'all' ? undefined : draft.isDiversified === 'yes',
  };
}

function buildSearchString(draft: CommunityPortfolioFilterDraft, page: number): string {
  const next = new URLSearchParams();

  if (page > 1) next.set('page', String(page));
  if (draft.riskLevel !== 'all') next.set('riskLevel', draft.riskLevel);
  if (draft.modelName !== 'all') next.set('modelName', draft.modelName);
  if (draft.isDiversified !== 'all') next.set('isDiversified', draft.isDiversified === 'yes' ? 'true' : 'false');
  if (draft.minReturn) next.set('minReturn', draft.minReturn);
  if (draft.maxReturn) next.set('maxReturn', draft.maxReturn);
  if (draft.minRisk) next.set('minRisk', draft.minRisk);
  if (draft.maxRisk) next.set('maxRisk', draft.maxRisk);

  return next.toString();
}

function serializeDraft(draft: CommunityPortfolioFilterDraft): string {
  return JSON.stringify(draft);
}

function serializeQuery(query: CommunityPortfolioQuery): string {
  return JSON.stringify(query);
}

function buildApiSearchParams(query: CommunityPortfolioQuery): URLSearchParams {
  const next = new URLSearchParams();
  next.set('page', String(query.page));
  next.set('size', String(query.size));

  if (query.riskLevel) next.set('riskLevel', query.riskLevel);
  if (query.modelName) next.set('modelName', query.modelName);
  if (typeof query.minReturn === 'number') next.set('minReturn', String(query.minReturn));
  if (typeof query.maxReturn === 'number') next.set('maxReturn', String(query.maxReturn));
  if (typeof query.minRisk === 'number') next.set('minRisk', String(query.minRisk));
  if (typeof query.maxRisk === 'number') next.set('maxRisk', String(query.maxRisk));
  if (typeof query.isDiversified === 'boolean') next.set('isDiversified', String(query.isDiversified));

  return next;
}

function isCommunityPortfolioResponse(payload: unknown): payload is CommunityPortfolioResponse {
  return !!payload && typeof payload === 'object' && 'data' in payload && Array.isArray((payload as CommunityPortfolioResponse).data);
}

function LoadingCard() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/8 bg-white/5 p-5">
      <div className="h-6 w-28 animate-pulse rounded-full bg-white/10" />
      <div className="mt-5 h-8 w-40 animate-pulse rounded-xl bg-white/10" />
      <div className="mt-3 h-16 animate-pulse rounded-2xl bg-white/8" />
      <div className="mt-5 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/8" />
        ))}
      </div>
      <div className="mt-5 h-20 animate-pulse rounded-2xl bg-white/8" />
      <div className="mt-5 h-11 animate-pulse rounded-2xl bg-white/10" />
    </div>
  );
}

function InlineRefreshState() {
  return (
    <div className="rounded-[24px] border border-[#7db8ff]/20 bg-[#7db8ff]/8 px-4 py-3 text-sm text-[#d9e9ff] shadow-[0_0_24px_rgba(125,184,255,0.12)]">
      กำลังรีเฟรชรายการพอร์ตชุมชน...
    </div>
  );
}

function roundToCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

interface PortfolioPreviewResponse {
  reqId?: string;
  status: string;
  message?: string;
  modelUsed?: string;
  portfolio?: {
    allocations: Record<string, { weight: number; allocatedAmount: number }>;
    expectedReturn: number;
    volatility: number;
    sharpeRatio: number;
  };
  backtestAndMetrics?: BacktestAndMetrics;
}

type DetailStep = 1 | 2;

export default function CommunityPortfolioPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearchString = searchParams.toString();
  const parsedSearchParams = useMemo(() => new URLSearchParams(currentSearchString), [currentSearchString]);

  const [draftFilters, setDraftFilters] = useState<CommunityPortfolioFilterDraft>(() =>
    readDraftFromSearchParams(parsedSearchParams)
  );
  const [page, setPage] = useState<number>(() => parsePositiveInteger(parsedSearchParams.get('page'), 1));
  const [appliedQuery, setAppliedQuery] = useState<CommunityPortfolioQuery>(() =>
    buildQueryFromDraft(readDraftFromSearchParams(parsedSearchParams), parsePositiveInteger(parsedSearchParams.get('page'), 1))
  );
  const [items, setItems] = useState<CommunityPortfolioData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<CommunityPortfolioData | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [portfolioName, setPortfolioName] = useState<string>('');
  const [investmentAmount, setInvestmentAmount] = useState<string>('10000');
  const [monthlyDca, setMonthlyDca] = useState<string>('0');
  const [detailStep, setDetailStep] = useState<DetailStep>(1);
  const [brokerMinOrder] = useState<number>(5);
  const [previewData, setPreviewData] = useState<PortfolioPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreparingPreview, setIsPreparingPreview] = useState<boolean>(false);
  const [isCreatingPortfolio, setIsCreatingPortfolio] = useState<boolean>(false);

  useEffect(() => {
    const nextDraft = readDraftFromSearchParams(parsedSearchParams);
    const nextPage = parsePositiveInteger(parsedSearchParams.get('page'), 1);
    const nextQuery = buildQueryFromDraft(nextDraft, nextPage);

    setDraftFilters((current) => (serializeDraft(current) === serializeDraft(nextDraft) ? current : nextDraft));
    setPage((current) => (current === nextPage ? current : nextPage));
    setAppliedQuery((current) => (serializeQuery(current) === serializeQuery(nextQuery) ? current : nextQuery));
  }, [parsedSearchParams]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchPortfolios = async () => {
      const showBlockingLoading = items.length === 0;

      if (showBlockingLoading) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setError(null);

      try {
        const apiSearchParams = buildApiSearchParams(appliedQuery).toString();
        const response = await fetch(`/api/v1/portfolio/community/presets?${apiSearchParams}`, {
          cache: 'no-store',
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => ({}))) as unknown;

        if (!response.ok) {
          const nextError =
            payload && typeof payload === 'object' && 'error' in payload
              ? (payload as { error?: string }).error
              : payload && typeof payload === 'object' && 'detail' in payload
                ? (payload as { detail?: string }).detail
                    : 'ไม่สามารถโหลดพอร์ตชุมชนได้';
                  throw new Error(nextError || 'ไม่สามารถโหลดพอร์ตชุมชนได้');
        }

        const nextItems = isCommunityPortfolioResponse(payload) ? payload.data : [];
        setItems(nextItems);
        setTotalCount(
          isCommunityPortfolioResponse(payload) && typeof payload.total === 'number' ? payload.total : null
        );
      } catch (fetchError) {
        if (controller.signal.aborted) return;

        const nextMessage = fetchError instanceof Error ? fetchError.message : 'ไม่สามารถโหลดพอร์ตชุมชนได้';
        if (items.length === 0) {
          setItems([]);
          setTotalCount(null);
        }
        setError(nextMessage);
        toast.error(nextMessage);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    fetchPortfolios();

    return () => controller.abort();
  }, [appliedQuery]);

  const totalPages = totalCount !== null && totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 0;
  const hasNextPage = totalPages > 0 ? page < totalPages : items.length >= PAGE_SIZE;
  const activeSummary = useMemo(() => {
    const parts: string[] = [];

    if (appliedQuery.riskLevel) parts.push(formatRiskLabel(appliedQuery.riskLevel));
    if (appliedQuery.modelName) parts.push(formatModel(appliedQuery.modelName));
    if (typeof appliedQuery.isDiversified === 'boolean') {
      parts.push(appliedQuery.isDiversified ? 'กระจายการลงทุน' : 'กระจุกตัว');
    }

    return parts.length > 0 ? parts : ['พอร์ตชุมชนทั้งหมด'];
  }, [appliedQuery]);

  const selectedTopAllocations: CommunityAllocationEntry[] = selectedPortfolio
    ? normalizeCommunityAllocations(selectedPortfolio.allocations).slice(0, 8)
    : [];
  const selectedAllocations: CommunityAllocationEntry[] = selectedPortfolio
    ? normalizeCommunityAllocations(selectedPortfolio.allocations)
    : [];

  useEffect(() => {
    if (!selectedPortfolio) return;

    setPortfolioName(`พอร์ต ${selectedPortfolio.mvoId.slice(0, 8).toUpperCase()}`);
    setInvestmentAmount('10000');
    setMonthlyDca('0');
    setDetailStep(1);
    setPreviewData(null);
    setPreviewError(null);
  }, [selectedPortfolio]);

  const updateUrl = (nextDraft: CommunityPortfolioFilterDraft, nextPage: number) => {
    const search = buildSearchString(nextDraft, nextPage);
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  };

  const handleApply = () => {
    const nextPage = 1;
    const nextQuery = buildQueryFromDraft(draftFilters, nextPage);
    setPage(nextPage);
    setAppliedQuery(nextQuery);
    updateUrl(draftFilters, nextPage);
  };

  const handleReset = () => {
    setSelectedPortfolio(null);
    setDraftFilters(EMPTY_FILTERS);
    setPage(1);
    setAppliedQuery(buildQueryFromDraft(EMPTY_FILTERS, 1));
    router.replace(pathname, { scroll: false });
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    setAppliedQuery(buildQueryFromDraft(draftFilters, nextPage));
    updateUrl(draftFilters, nextPage);
  };

  const handleOpenApplyPage = (portfolio: CommunityPortfolioData) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(`community-portfolio:${portfolio.mvoId}`, JSON.stringify(portfolio));
    }

    router.push(`/community-portfolio/${encodeURIComponent(portfolio.mvoId)}`);
  };

  const handlePreparePreview = async () => {
    if (!selectedPortfolio) return;

    const normalizedName = portfolioName.trim();
    const normalizedInitialCapital = Number(investmentAmount);
    const normalizedMonthlyDca = Number(monthlyDca);

    if (!normalizedName) {
      toast.error('กรุณากรอกชื่อพอร์ต');
      return;
    }

    if (!Number.isFinite(normalizedInitialCapital) || normalizedInitialCapital <= 0) {
      toast.error('จำนวนเงินลงทุนต้องมากกว่า 0');
      return;
    }

    if (!Number.isFinite(normalizedMonthlyDca) || normalizedMonthlyDca < 0) {
      toast.error('เงิน DCA รายเดือนต้องไม่น้อยกว่า 0');
      return;
    }

    setIsPreparingPreview(true);
    setPreviewError(null);

    try {
      const response = await fetch(
        `/api/v1/portfolio/allocation/${encodeURIComponent(selectedPortfolio.mvoId)}?initialCapital=${encodeURIComponent(String(normalizedInitialCapital))}&brokerMinOrder=${encodeURIComponent(String(brokerMinOrder))}`,
        {
          method: 'GET',
          cache: 'no-store',
        }
      );

      const payload = (await response.json().catch(() => ({}))) as PortfolioPreviewResponse & { error?: string; detail?: string };

      if (!response.ok) {
        throw new Error(payload.error || payload.detail || payload.message || 'ไม่สามารถเตรียมตัวอย่างพอร์ตได้');
      }

      if (!payload.portfolio || !payload.portfolio.allocations || Object.keys(payload.portfolio.allocations).length < 2) {
        throw new Error('ข้อมูลตัวอย่างพอร์ตไม่สมบูรณ์ กรุณาลองเลือกพอร์ตอื่นหรือปรับจำนวนเงินลงทุน');
      }

      setPreviewData(payload);
      setDetailStep(2);
    } catch (previewIssue) {
      const message = previewIssue instanceof Error ? previewIssue.message : 'ไม่สามารถเตรียมตัวอย่างพอร์ตได้';
      setPreviewError(message);
      toast.error(message);
    } finally {
      setIsPreparingPreview(false);
    }
  };

  const handleCreatePortfolio = async () => {
    if (!selectedPortfolio) return;

    const normalizedName = portfolioName.trim();
    const normalizedInitialCapital = Number(investmentAmount);
    const normalizedMonthlyDca = Number(monthlyDca);
    const targetYears = Math.min(20, Math.max(1, Number(selectedPortfolio.lookbackYears || 10)));

    if (!normalizedName) {
      toast.error('กรุณากรอกชื่อพอร์ต');
      return;
    }

    if (!Number.isFinite(normalizedInitialCapital) || normalizedInitialCapital <= 0) {
      toast.error('จำนวนเงินลงทุนต้องมากกว่า 0');
      return;
    }

    if (!Number.isFinite(normalizedMonthlyDca) || normalizedMonthlyDca < 0) {
      toast.error('เงิน DCA รายเดือนต้องไม่น้อยกว่า 0');
      return;
    }

    if (!previewData?.portfolio || Object.keys(previewData.portfolio.allocations || {}).length < 2) {
      toast.error('กรุณาสร้างตัวอย่างพอร์ตขั้นสุดท้ายก่อนบันทึก');
      return;
    }

    setIsCreatingPortfolio(true);

    try {
      const allocations = Object.fromEntries(
        Object.entries(previewData.portfolio.allocations).map(([ticker, allocation]) => [
          ticker.trim().toUpperCase(),
          {
            weight: Number(allocation.weight || 0),
            allocatedAmount: roundToCurrency(Number(allocation.allocatedAmount || 0)),
          },
        ])
      ) as Record<string, { weight: number; allocatedAmount: number }>;

      const tickers = Object.keys(allocations);

      const simulatePromise = fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mvoHashId: selectedPortfolio.mvoId,
          initialCapital: normalizedInitialCapital,
          monthlyDca: normalizedMonthlyDca,
          investmentHorizon: targetYears,
        }),
      });

      const saveResponse = await savePortfolioToDatabase(
        normalizedName,
        tickers,
        {},
        allocations,
        previewData.portfolio.expectedReturn,
        previewData.portfolio.volatility,
        normalizedInitialCapital,
        selectedPortfolio.riskLv === 'low' || selectedPortfolio.riskLv === 'high' || selectedPortfolio.riskLv === 'medium'
          ? selectedPortfolio.riskLv
          : 'medium',
        selectedPortfolio.modelName === 'semi' ? 'semi' : 'mvo',
        selectedPortfolio.mvoId,
        normalizedMonthlyDca,
        targetYears,
        previewData.backtestAndMetrics,
        undefined,
        selectedPortfolio.lookbackYears,
        selectedPortfolio.isDiversified
      );

      const simulateResponse = await simulatePromise;
      const simulatePayload = (await simulateResponse.json().catch(() => ({}))) as { error?: string; message?: string };

      if (!saveResponse.success || !saveResponse.portfolioId) {
        throw new Error(saveResponse.error || 'ไม่สามารถสร้างพอร์ตจากกลยุทธ์ชุมชนนี้ได้');
      }

      if (!simulateResponse.ok) {
        toast.warning(
          simulatePayload.error ||
            simulatePayload.message ||
            'บันทึกพอร์ตแล้ว แต่ยังไม่สามารถเริ่ม Monte Carlo ได้ ระบบจะลองใหม่ให้อัตโนมัติในหน้ารายละเอียด'
        );
      }

          toast.success('สร้างพอร์ตและเพิ่มเข้าพื้นที่ทำงานของคุณแล้ว');
      setSelectedPortfolio(null);
      router.push(`/portfolio/${saveResponse.portfolioId}`);
    } catch (creationError) {
      const message = creationError instanceof Error ? creationError.message : 'ไม่สามารถสร้างพอร์ตได้';
      toast.error(message);
    } finally {
      setIsCreatingPortfolio(false);
    }
  };

  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(125,184,255,0.24),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,237,190,0.16),transparent_24%),linear-gradient(135deg,#0b0f19_0%,#0f1628_48%,#070b14_100%)] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-8">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(88,98,255,0.1),transparent_32%,rgba(15,237,190,0.08))]" />

        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7db8ff]/25 bg-[#7db8ff]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b9d8ff]">
              <Sparkles className="h-3.5 w-3.5" />
              พอร์ตชุมชน
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              ค้นหาพอร์ตจากชุมชนที่ออกแบบให้เหมาะกับสภาวะตลาดจริง
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-400">
              เลือกดูพอร์ตต้นแบบที่เข้าใจง่าย กรองตามผลตอบแทนและความผันผวน แล้วเปรียบเทียบแนวคิดที่สมดุลความเสี่ยงได้ดีก่อนตัดสินใจลงทุน
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[420px]">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Universe</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                <Bot className="h-5 w-5 text-[#7db8ff]" />
                พอร์ตต้นแบบที่จัดอันดับแล้ว
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">ตัวกรอง</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                <Shield className="h-5 w-5 text-[#0fedbe]" />
                ปรับแล้วใช้งานได้ทันที
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">การจัดเรียง</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                <BarChart3 className="h-5 w-5 text-[#fdd458]" />
                เรียงตาม Sharpe Ratio
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <PortfolioFilters
          value={draftFilters}
          loading={loading}
          onChange={setDraftFilters}
          onApply={handleApply}
          onReset={handleReset}
        />

        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,16,27,0.92),rgba(8,11,18,0.92))] p-5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">สถานะการค้นหาปัจจุบัน</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeSummary.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-200"
                  >
                    <Activity className="h-3.5 w-3.5 text-[#7db8ff]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">สถานะหน้า</p>
              <p className="mt-2 text-lg font-semibold text-white">
                หน้า {page} · {loading ? 'กำลังโหลด' : `แสดง ${items.length} รายการ`}
              </p>
            </div>
          </div>

          {isRefreshing ? <InlineRefreshState /> : null}

          {error && items.length > 0 ? (
            <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100 shadow-[0_0_32px_rgba(245,158,11,0.08)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold">กำลังแสดงข้อมูลที่โหลดไว้ล่าสุด</h2>
                  <p className="mt-1 text-sm text-amber-100/80">{error}</p>
                </div>
                <Button
                  type="button"
                  onClick={handleApply}
                  className="rounded-2xl bg-white/10 text-white hover:bg-white/15"
                >
                  ลองอีกครั้ง
                </Button>
              </div>
            </div>
          ) : null}

          {error && items.length === 0 ? (
            <div className="rounded-[28px] border border-rose-400/20 bg-rose-400/10 p-6 text-rose-100 shadow-[0_0_40px_rgba(244,63,94,0.08)]">
              <h2 className="text-lg font-semibold">ไม่สามารถโหลดพอร์ตชุมชนได้</h2>
              <p className="mt-2 text-sm text-rose-100/80">{error}</p>
              <Button
                type="button"
                onClick={handleApply}
                className="mt-4 rounded-2xl bg-white/10 text-white hover:bg-white/15"
              >
                โหลดใหม่
              </Button>
            </div>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <LoadingCard key={index} />
              ))}
            </div>
          ) : null}

          {!loading && !error && items.length === 0 ? (
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-10 text-center backdrop-blur-xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                <Sparkles className="h-7 w-7 text-[#7db8ff]" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-white">ไม่พบพอร์ตที่ตรงกับตัวกรองนี้</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-400">
                ลองขยายช่วงผลตอบแทนหรือความเสี่ยง เปลี่ยนโมเดล หรือยกเลิกเงื่อนไขการกระจายการลงทุนเพื่อดูพอร์ตเพิ่มเติม
              </p>
            </div>
          ) : null}

          {!loading && !error && items.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {items.map((portfolio) => (
                <CommunityPortfolioCard
                  key={portfolio.mvoId}
                  portfolio={portfolio}
                  onViewDetails={handleOpenApplyPage}
                />
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="text-sm font-medium text-white">การแบ่งหน้า</p>
              <p className="mt-1 text-sm text-gray-400">
                {totalPages > 0
                  ? `มีพอร์ตชุมชนทั้งหมด ${totalCount} รายการ แบ่งเป็น ${totalPages} หน้า`
                  : `แสดงพอร์ตทีละ ${PAGE_SIZE} รายการ และสามารถไปหน้าถัดไปได้เมื่อหน้าปัจจุบันเต็ม`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={loading || page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="rounded-2xl border-white/10 bg-black/20 text-white hover:bg-white/8"
              >
                <ArrowLeft className="h-4 w-4" />
                ก่อนหน้า
              </Button>
              <Button
                type="button"
                disabled={loading || !hasNextPage}
                onClick={() => handlePageChange(page + 1)}
                className="rounded-2xl bg-gradient-to-r from-[#5862ff] to-[#0fedbe] text-[#030712] shadow-[0_0_30px_rgba(88,98,255,0.28)] hover:scale-[1.01]"
              >
                ถัดไป
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {selectedPortfolio ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#020611]/80 p-4 backdrop-blur-md">
          <div className="flex min-h-full items-start justify-center py-2 sm:items-center">
            <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(125,184,255,0.22),transparent_30%),linear-gradient(180deg,rgba(11,15,25,0.98),rgba(7,10,18,0.98))] shadow-[0_30px_120px_rgba(0,0,0,0.6)]">
              <button
                type="button"
                onClick={() => setSelectedPortfolio(null)}
                className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-2 text-gray-300 transition-colors duration-300 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="shrink-0 border-b border-white/10 p-6 sm:p-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#7db8ff]/25 bg-[#7db8ff]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b9d8ff]">
                  <Sparkles className="h-3.5 w-3.5" />
                  รายละเอียดพอร์ตชุมชน
                </div>
                <h2 className="mt-4 text-3xl font-semibold text-white">
                  กลยุทธ์ {selectedPortfolio.mvoId.slice(0, 8).toUpperCase()}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                  ขั้นตอนที่ {detailStep} จาก 2 ตรวจสอบกลยุทธ์จากชุมชน กรอกข้อมูลพอร์ตของคุณ และยืนยันพอร์ตสุดท้ายก่อนบันทึกเข้าพื้นที่ทำงานส่วนตัว
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6 tv-scrollbar sm:p-8">
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">ผลตอบแทนคาดหวัง</p>
                        <p className="mt-2 text-2xl font-semibold text-emerald-300">
                          {formatPercent(selectedPortfolio.expectedReturn)}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">ความผันผวน</p>
                        <p className="mt-2 text-2xl font-semibold text-rose-300">
                          {formatPercent(selectedPortfolio.volatility)}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Sharpe Ratio</p>
                        <p className="mt-2 text-2xl font-semibold text-[#b9d8ff]">
                          {selectedPortfolio.sharpeRatio.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                      <p className="text-sm font-medium text-white">สัดส่วนการลงทุนหลัก</p>
                      <div className="mt-4 space-y-3">
                        {(detailStep === 2 && previewData?.portfolio
                          ? Object.entries(previewData.portfolio.allocations)
                              .map(([ticker, allocation]) => ({ ticker, weight: Number(allocation.weight || 0) }))
                              .filter((entry) => entry.weight > 0)
                              .sort((left, right) => right.weight - left.weight)
                              .slice(0, 8)
                          : selectedTopAllocations
                        ).map(({ ticker, weight }) => (
                          <div key={ticker}>
                            <div className="mb-1 flex items-center justify-between text-sm text-gray-300">
                              <span>{ticker}</span>
                              <span>{formatPercent(weight)}</span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#5862ff] via-[#7db8ff] to-[#0fedbe]"
                                style={{ width: `${Math.min(weight * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">รายละเอียดพอร์ต</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                          {(detailStep === 2 && previewData?.portfolio ? Object.keys(previewData.portfolio.allocations).length : selectedAllocations.length)} หุ้นที่จัดอันดับไว้
                        </p>
                      </div>

                      <div className="mt-4 overflow-hidden rounded-[22px] border border-white/8 bg-black/20">
                        <table className="w-full text-sm">
                          <thead className="bg-white/5 text-left text-[11px] uppercase tracking-[0.18em] text-gray-500">
                            <tr>
                              <th className="px-4 py-3 font-medium">Ticker</th>
                              <th className="px-4 py-3 text-right font-medium">สัดส่วน</th>
                              <th className="px-4 py-3 text-right font-medium">มูลค่าที่จัดสรร</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(detailStep === 2 && previewData?.portfolio
                              ? Object.entries(previewData.portfolio.allocations)
                                  .map(([ticker, allocation]) => ({
                                    ticker,
                                    weight: Number(allocation.weight || 0),
                                    allocatedAmount: Number(allocation.allocatedAmount || 0),
                                  }))
                                  .filter((entry) => entry.weight > 0)
                                  .sort((left, right) => right.weight - left.weight)
                              : selectedAllocations
                            ).map(({ ticker, weight, allocatedAmount }) => (
                              <tr key={`detail-${ticker}`} className="border-t border-white/6 text-gray-200">
                                <td className="px-4 py-3 font-medium text-white">{ticker}</td>
                                <td className="px-4 py-3 text-right">{formatPercent(weight)}</td>
                                <td className="px-4 py-3 text-right text-gray-400">
                                  {formatCurrency(allocatedAmount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                      <p className="text-sm font-medium text-white">ข้อมูลพอร์ต</p>
                      <dl className="mt-4 space-y-3 text-sm text-gray-300">
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-gray-500">โมเดล</dt>
                          <dd>{formatModel(selectedPortfolio.modelName)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-gray-500">ระดับความเสี่ยง</dt>
                          <dd>{formatRiskLabel(selectedPortfolio.riskLv)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-gray-500">ช่วงข้อมูลย้อนหลัง</dt>
                          <dd>{selectedPortfolio.lookbackYears} ปี</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-gray-500">การกระจายการลงทุน</dt>
                          <dd>{selectedPortfolio.isDiversified ? 'กระจายการลงทุน' : 'กระจุกตัว'}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-gray-500">วันที่สร้าง</dt>
                          <dd>{formatCreatedDate(selectedPortfolio.createAt)}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="rounded-[28px] border border-[#0fedbe]/15 bg-[linear-gradient(180deg,rgba(15,237,190,0.08),rgba(88,98,255,0.08))] p-5 shadow-[0_0_30px_rgba(15,237,190,0.06)]">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-2xl border border-[#0fedbe]/20 bg-[#0fedbe]/10 p-2 text-[#93fff0]">
                          <PiggyBank className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{detailStep === 1 ? 'ขั้นตอนที่ 1: ตั้งค่าพอร์ต' : 'ขั้นตอนที่ 2: ตรวจสอบพอร์ตสุดท้าย'}</p>
                          <p className="mt-2 text-sm leading-6 text-gray-300">
                            {detailStep === 1
                              ? 'กรอกข้อมูลที่ใช้สร้างพอร์ตจากกลยุทธ์ชุมชนนี้ เมื่อพร้อมแล้วให้สร้างตัวอย่างพอร์ตเพื่อดูสัดส่วนและผลทดสอบย้อนหลัง'
                              : 'ตรวจสอบพอร์ตสุดท้าย รวมถึง Sharpe Ratio และผลทดสอบย้อนหลัง ก่อนบันทึกเข้าพื้นที่พอร์ตส่วนตัวของคุณ'}
                          </p>
                        </div>
                      </div>

                      {detailStep === 1 ? (
                        <div className="mt-5 space-y-4">
                          <div>
                            <label htmlFor="community-portfolio-name" className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                              ชื่อพอร์ต
                            </label>
                            <Input
                              id="community-portfolio-name"
                              value={portfolioName}
                              onChange={(event) => setPortfolioName(event.target.value)}
                              placeholder="พอร์ตชุมชนของฉัน"
                              disabled={isPreparingPreview || isCreatingPortfolio}
                              className="h-11 rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-gray-500"
                            />
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label htmlFor="community-investment-amount" className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                                <DollarSign className="h-3.5 w-3.5 text-[#0fedbe]" />
                                จำนวนเงินลงทุน
                              </label>
                              <Input
                                id="community-investment-amount"
                                type="number"
                                min={1}
                                step="1"
                                inputMode="decimal"
                                value={investmentAmount}
                                onChange={(event) => setInvestmentAmount(event.target.value)}
                                disabled={isPreparingPreview || isCreatingPortfolio}
                                className="h-11 rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-gray-500"
                              />
                            </div>

                            <div>
                              <label htmlFor="community-monthly-dca" className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                                <PiggyBank className="h-3.5 w-3.5 text-[#7db8ff]" />
                                DCA รายเดือน
                              </label>
                              <Input
                                id="community-monthly-dca"
                                type="number"
                                min={0}
                                step="1"
                                inputMode="decimal"
                                value={monthlyDca}
                                onChange={(event) => setMonthlyDca(event.target.value)}
                                disabled={isPreparingPreview || isCreatingPortfolio}
                                className="h-11 rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-gray-500"
                              />
                            </div>
                          </div>

                          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
                            <div className="flex items-center justify-between gap-3">
                              <span>การตั้งค่าจำลองผลลัพธ์</span>
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
                                ระยะเวลา {Math.min(20, Math.max(1, Number(selectedPortfolio.lookbackYears || 10)))} ปี
                              </span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-gray-400">
                              ระบบจะใช้จำนวนเงินลงทุนของคุณเพื่อคำนวณสัดส่วนพอร์ตและตัวอย่างผลทดสอบย้อนหลัง จากนั้นจะใช้แผน DCA ของคุณเมื่อเริ่ม Monte Carlo หลังบันทึกพอร์ต
                            </p>
                          </div>

                          {previewError ? (
                            <div className="rounded-[22px] border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
                              {previewError}
                            </div>
                          ) : null}

                          <Button
                            type="button"
                            onClick={handlePreparePreview}
                            disabled={isPreparingPreview || isCreatingPortfolio}
                            className="mt-1 h-11 w-full rounded-2xl bg-gradient-to-r from-[#0fedbe] via-[#7db8ff] to-[#5862ff] text-[#030712] shadow-[0_0_28px_rgba(15,237,190,0.24)] hover:scale-[1.01]"
                          >
                            {isPreparingPreview ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                กำลังเตรียมพอร์ตสุดท้าย...
                              </>
                            ) : (
                              'ไปยังการตรวจสอบพอร์ตสุดท้าย'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-5 space-y-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Sharpe Ratio</p>
                              <p className="mt-2 text-2xl font-semibold text-[#b9d8ff]">
                                {previewData?.portfolio?.sharpeRatio?.toFixed(2) ?? selectedPortfolio.sharpeRatio.toFixed(2)}
                              </p>
                            </div>
                            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Backtest Return</p>
                              <p className="mt-2 text-2xl font-semibold text-emerald-300">
                                {typeof previewData?.backtestAndMetrics?.realizedMetrics?.realizedAnnualReturnPct === 'number'
                                  ? `${previewData.backtestAndMetrics.realizedMetrics.realizedAnnualReturnPct.toFixed(1)}%`
                                  : 'ไม่มีข้อมูล'}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-white">ตรวจสอบพอร์ตสุดท้าย</p>
                              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
                                <TrendingUp className="h-3.5 w-3.5 text-[#0fedbe]" />
                                พร้อมบันทึก
                              </span>
                            </div>
                            <dl className="mt-4 space-y-3 text-sm text-gray-300">
                              <div className="flex items-center justify-between gap-3">
                                <dt className="text-gray-500">ชื่อพอร์ต</dt>
                                <dd>{portfolioName}</dd>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <dt className="text-gray-500">เงินลงทุนเริ่มต้น</dt>
                                <dd>{formatCurrency(Number(investmentAmount))}</dd>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <dt className="text-gray-500">DCA รายเดือน</dt>
                                <dd>{formatCurrency(Number(monthlyDca))}</dd>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <dt className="text-gray-500">ผลตอบแทนคาดหวังต่อปี</dt>
                                <dd className="text-emerald-300">
                                  {previewData?.portfolio ? formatPercent(previewData.portfolio.expectedReturn) : 'ไม่มีข้อมูล'}
                                </dd>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <dt className="text-gray-500">ความผันผวนคาดหวัง</dt>
                                <dd className="text-rose-300">
                                  {previewData?.portfolio ? formatPercent(previewData.portfolio.volatility) : 'ไม่มีข้อมูล'}
                                </dd>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <dt className="text-gray-500">Max Drawdown ย้อนหลัง</dt>
                                <dd>
                                  {typeof previewData?.backtestAndMetrics?.realizedMetrics?.historicalMaxDrawdownPct === 'number'
                                    ? `${previewData.backtestAndMetrics.realizedMetrics.historicalMaxDrawdownPct.toFixed(1)}%`
                                    : 'ไม่มีข้อมูล'}
                                </dd>
                              </div>
                            </dl>
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setDetailStep(1)}
                              disabled={isCreatingPortfolio}
                              className="h-11 flex-1 rounded-2xl border-white/10 bg-black/20 text-white hover:bg-white/8"
                            >
                              กลับไปตั้งค่า
                            </Button>
                            <Button
                              type="button"
                              onClick={handleCreatePortfolio}
                              disabled={isCreatingPortfolio}
                              className="h-11 flex-1 rounded-2xl bg-gradient-to-r from-[#0fedbe] via-[#7db8ff] to-[#5862ff] text-[#030712] shadow-[0_0_28px_rgba(15,237,190,0.24)] hover:scale-[1.01]"
                            >
                              {isCreatingPortfolio ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  กำลังบันทึกพอร์ต...
                                </>
                              ) : (
                                'บันทึกพอร์ตไปยังพื้นที่ทำงานของฉัน'
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-[28px] border border-[#7db8ff]/20 bg-[#7db8ff]/8 p-5">
                      <p className="text-sm font-medium text-white">สรุปความหมาย</p>
                      <p className="mt-3 text-sm leading-6 text-gray-300">
                        พอร์ตชุมชนนี้ผ่านการปรับแต่งและจัดอันดับมาแล้ว คุณสามารถใช้เป็นแนวทางเปรียบเทียบสำหรับสร้างพอร์ตของตัวเอง หรือใช้ต่อยอดกับการปรับพอร์ตด้วย AI ในพื้นที่ทำงานส่วนตัว
                      </p>
                      <Button
                        type="button"
                        onClick={() => setSelectedPortfolio(null)}
                        className="mt-5 h-11 w-full rounded-2xl bg-gradient-to-r from-[#5862ff] to-[#0fedbe] text-[#030712] shadow-[0_0_28px_rgba(88,98,255,0.28)] hover:scale-[1.01]"
                      >
                        กลับไปหน้าค้นหาพอร์ต
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}