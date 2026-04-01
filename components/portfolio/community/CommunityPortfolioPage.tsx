'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Activity, ArrowLeft, ArrowRight, BarChart3, Bot, Shield, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import CommunityPortfolioCard from './CommunityPortfolioCard';
import PortfolioFilters from './PortfolioFilters';
import type {
  CommunityAllocationEntry,
  CommunityPortfolioData,
  CommunityPortfolioFilterDraft,
  CommunityPortfolioQuery,
  CommunityPortfolioResponse,
} from './types';
import { normalizeCommunityAllocations } from './types';

const PAGE_SIZE = 12;

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
  if (!Number.isFinite(value)) return 'N/A';

  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number(value));
}

function formatModel(value: string): string {
  return value.toLowerCase() === 'semi' ? 'Semi-Variance' : value.toUpperCase();
}

function formatCreatedDate(value?: string | null): string {
  if (!value) return 'N/A';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';

  return new Intl.DateTimeFormat('en-US', {
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
      Refreshing ranked community portfolios...
    </div>
  );
}

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
                : 'Unable to load community portfolios.';
          throw new Error(nextError || 'Unable to load community portfolios.');
        }

        const nextItems = isCommunityPortfolioResponse(payload) ? payload.data : [];
        setItems(nextItems);
        setTotalCount(
          isCommunityPortfolioResponse(payload) && typeof payload.total === 'number' ? payload.total : null
        );
      } catch (fetchError) {
        if (controller.signal.aborted) return;

        const nextMessage = fetchError instanceof Error ? fetchError.message : 'Unable to load community portfolios.';
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

    if (appliedQuery.riskLevel) parts.push(appliedQuery.riskLevel);
    if (appliedQuery.modelName) parts.push(formatModel(appliedQuery.modelName));
    if (typeof appliedQuery.isDiversified === 'boolean') {
      parts.push(appliedQuery.isDiversified ? 'Diversified' : 'Concentrated');
    }

    return parts.length > 0 ? parts : ['All community portfolios'];
  }, [appliedQuery]);

  const selectedTopAllocations: CommunityAllocationEntry[] = selectedPortfolio
    ? normalizeCommunityAllocations(selectedPortfolio.allocations).slice(0, 8)
    : [];

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

  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(125,184,255,0.24),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,237,190,0.16),transparent_24%),linear-gradient(135deg,#0b0f19_0%,#0f1628_48%,#070b14_100%)] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-8">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(88,98,255,0.1),transparent_32%,rgba(15,237,190,0.08))]" />

        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7db8ff]/25 bg-[#7db8ff]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b9d8ff]">
              <Sparkles className="h-3.5 w-3.5" />
              Community Portfolio
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Discover community-built portfolios tuned for real-world market conditions.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-400">
              Explore beginner-friendly portfolio blueprints, filter them by return and volatility, and inspect the
              strongest risk-adjusted ideas before you commit capital.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[420px]">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Universe</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                <Bot className="h-5 w-5 text-[#7db8ff]" />
                Ranked presets
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Filters</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                <Shield className="h-5 w-5 text-[#0fedbe]" />
                Apply-only
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Sorting</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                <BarChart3 className="h-5 w-5 text-[#fdd458]" />
                Sharpe-first
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
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Active discovery state</p>
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
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Page status</p>
              <p className="mt-2 text-lg font-semibold text-white">
                Page {page}
                {totalPages > 0 ? ` of ${totalPages}` : ''} ·{' '}
                {loading
                  ? 'Loading'
                  : totalCount !== null
                    ? `${totalCount} portfolios`
                    : `${items.length} shown`}
              </p>
            </div>
          </div>

          {isRefreshing ? <InlineRefreshState /> : null}

          {error && items.length > 0 ? (
            <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100 shadow-[0_0_32px_rgba(245,158,11,0.08)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold">Showing cached on-screen results</h2>
                  <p className="mt-1 text-sm text-amber-100/80">{error}</p>
                </div>
                <Button
                  type="button"
                  onClick={handleApply}
                  className="rounded-2xl bg-white/10 text-white hover:bg-white/15"
                >
                  Try again
                </Button>
              </div>
            </div>
          ) : null}

          {error && items.length === 0 ? (
            <div className="rounded-[28px] border border-rose-400/20 bg-rose-400/10 p-6 text-rose-100 shadow-[0_0_40px_rgba(244,63,94,0.08)]">
              <h2 className="text-lg font-semibold">Unable to load community portfolios</h2>
              <p className="mt-2 text-sm text-rose-100/80">{error}</p>
              <Button
                type="button"
                onClick={handleApply}
                className="mt-4 rounded-2xl bg-white/10 text-white hover:bg-white/15"
              >
                Retry
              </Button>
            </div>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
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
              <h2 className="mt-5 text-2xl font-semibold text-white">No portfolios match this filter set</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-400">
                Expand the return or risk ranges, clear the model filter, or remove diversification constraints to
                surface more community strategies.
              </p>
            </div>
          ) : null}

          {!loading && !error && items.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {items.map((portfolio) => (
                <CommunityPortfolioCard
                  key={portfolio.mvoId}
                  portfolio={portfolio}
                  onViewDetails={setSelectedPortfolio}
                />
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="text-sm font-medium text-white">Pagination</p>
              <p className="mt-1 text-sm text-gray-400">
                {totalPages > 0
                  ? `Browse ${totalCount} community portfolios across ${totalPages} pages.`
                  : `Move through the ranked feed in fixed batches of ${PAGE_SIZE} portfolios. Next stays available while the current page is full.`}
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
                Previous
              </Button>
              <Button
                type="button"
                disabled={loading || !hasNextPage}
                onClick={() => handlePageChange(page + 1)}
                className="rounded-2xl bg-gradient-to-r from-[#5862ff] to-[#0fedbe] text-[#030712] shadow-[0_0_30px_rgba(88,98,255,0.28)] hover:scale-[1.01]"
              >
                Next
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
                  Community Portfolio Detail
                </div>
                <h2 className="mt-4 text-3xl font-semibold text-white">
                  {selectedPortfolio.mvoId.slice(0, 8).toUpperCase()} Strategy
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                  Inspect the ranking metrics, lookback configuration, and top allocations behind this community-built
                  portfolio blueprint before applying the idea in your own workflow.
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6 tv-scrollbar sm:p-8">
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Expected Return</p>
                        <p className="mt-2 text-2xl font-semibold text-emerald-300">
                          {formatPercent(selectedPortfolio.expectedReturn)}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Volatility</p>
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
                      <p className="text-sm font-medium text-white">Top allocation map</p>
                      <div className="mt-4 space-y-3">
                        {selectedTopAllocations.map(({ ticker, weight }) => (
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
                        <p className="text-sm font-medium text-white">Portfolio details</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                          {selectedTopAllocations.length} ranked holdings
                        </p>
                      </div>

                      <div className="mt-4 overflow-hidden rounded-[22px] border border-white/8 bg-black/20">
                        <table className="w-full text-sm">
                          <thead className="bg-white/5 text-left text-[11px] uppercase tracking-[0.18em] text-gray-500">
                            <tr>
                              <th className="px-4 py-3 font-medium">Ticker</th>
                              <th className="px-4 py-3 text-right font-medium">Weight</th>
                              <th className="px-4 py-3 text-right font-medium">Allocated</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTopAllocations.map(({ ticker, weight, allocatedAmount }) => (
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
                      <p className="text-sm font-medium text-white">Portfolio metadata</p>
                      <dl className="mt-4 space-y-3 text-sm text-gray-300">
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-gray-500">Model</dt>
                          <dd>{formatModel(selectedPortfolio.modelName)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-gray-500">Risk level</dt>
                          <dd className="capitalize">{selectedPortfolio.riskLv}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-gray-500">Lookback</dt>
                          <dd>{selectedPortfolio.lookbackYears} years</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-gray-500">Diversification</dt>
                          <dd>{selectedPortfolio.isDiversified ? 'Diversified' : 'Concentrated'}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-gray-500">Created</dt>
                          <dd>{formatCreatedDate(selectedPortfolio.createAt)}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="rounded-[28px] border border-[#7db8ff]/20 bg-[#7db8ff]/8 p-5">
                      <p className="text-sm font-medium text-white">What this means</p>
                      <p className="mt-3 text-sm leading-6 text-gray-300">
                        This community portfolio is already optimized and ranked. Use it as a benchmark for your own
                        portfolio construction or as inspiration for further AI optimization in your private workspace.
                      </p>
                      <Button
                        type="button"
                        onClick={() => setSelectedPortfolio(null)}
                        className="mt-5 h-11 w-full rounded-2xl bg-gradient-to-r from-[#5862ff] to-[#0fedbe] text-[#030712] shadow-[0_0_28px_rgba(88,98,255,0.28)] hover:scale-[1.01]"
                      >
                        Back to discovery grid
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