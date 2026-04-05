import SinglePortfolioDashboard from '@/components/dashboard/SinglePortfolioDashboard';
import type { DashboardHistoryPoint, DashboardPortfolioOption, SelectedDashboardPortfolio } from '@/components/dashboard/single-portfolio-types';
import { getSavedPortfolioById, getSavedPortfolios } from '@/lib/actions/cloudflare.actions';
import { getPortfolioTickers } from '@/lib/actions/portfolio.actions';

interface TickerSnapshot {
    ticker: string;
    companyName: string;
    latestPrice?: number;
    yesterdayPrice?: number;
}

interface DashboardPageProps {
    searchParams?: Promise<{
        portfolioId?: string;
    }>;
}

function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
}

function getTotalInvestment(
    initialCapital: number | undefined,
    allocations: Record<string, { weight: number; allocatedAmount: number }> | undefined
): number {
    if (Number.isFinite(initialCapital) && Number(initialCapital) > 0) {
        return Number(initialCapital);
    }

    return Object.values(allocations || {}).reduce((sum, entry) => sum + Number(entry?.allocatedAmount || 0), 0);
}

function getHoldingCurrentValue(allocatedAmount: number, latestPrice?: number, yesterdayPrice?: number): number {
    if (Number.isFinite(latestPrice) && Number.isFinite(yesterdayPrice) && Number(yesterdayPrice) > 0) {
        return allocatedAmount * (Number(latestPrice) / Number(yesterdayPrice));
    }

    return allocatedAmount;
}

function truncateToTwo(value: number): number {
    return Math.trunc(value * 100) / 100;
}

function toTimestamp(value: string): number | null {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
}

function buildInvestmentHistory(
    portfolio: NonNullable<Awaited<ReturnType<typeof getSavedPortfolioById>>['portfolio']>,
    totalInvestment: number,
    currentValue: number
): DashboardHistoryPoint[] {
    const dates = portfolio.backtestAndMetrics?.timeSeries?.dates ?? [];
    const values = portfolio.backtestAndMetrics?.timeSeries?.portfolioValue ?? [];
    const maxLength = Math.min(dates.length, values.length);

    if (maxLength === 0) {
        const fallbackTimestamp = toTimestamp(portfolio.updatedAt) ?? Date.now();
        return [{
            timestamp: fallbackTimestamp,
            portfolioValue: currentValue,
            investedCapital: totalInvestment,
        }];
    }

    const stride = Math.max(1, Math.floor(maxLength / 64));
    const sampled: DashboardHistoryPoint[] = [];

    for (let index = 0; index < maxLength; index += stride) {
        const timestamp = toTimestamp(dates[index] ?? '');
        if (timestamp === null) {
            continue;
        }

        sampled.push({
            timestamp,
            portfolioValue: roundCurrency(Number(values[index] ?? 0)),
            investedCapital: totalInvestment,
        });
    }

    const lastTimestamp = toTimestamp(dates[maxLength - 1] ?? '');
    if (lastTimestamp !== null && sampled[sampled.length - 1]?.timestamp !== lastTimestamp) {
        sampled.push({
            timestamp: lastTimestamp,
            portfolioValue: roundCurrency(Number(values[maxLength - 1] ?? currentValue)),
            investedCapital: totalInvestment,
        });
    }

    const updatedTimestamp = toTimestamp(portfolio.updatedAt);
    if (updatedTimestamp !== null && sampled[sampled.length - 1]?.timestamp !== updatedTimestamp) {
        sampled.push({
            timestamp: updatedTimestamp,
            portfolioValue: currentValue,
            investedCapital: totalInvestment,
        });
    }

    return sampled;
}

function getYearAgoValue(history: DashboardHistoryPoint[], latestTimestamp: number): number | null {
    if (history.length === 0) {
        return null;
    }

    const targetDate = new Date(latestTimestamp);
    targetDate.setFullYear(targetDate.getFullYear() - 1);
    const targetTimestamp = targetDate.getTime();

    let candidate: DashboardHistoryPoint | null = null;
    for (const point of history) {
        if (point.timestamp <= targetTimestamp) {
            candidate = point;
        } else {
            break;
        }
    }

    return candidate?.portfolioValue ?? history[0]?.portfolioValue ?? null;
}

async function getTickerSnapshots(tickers: string[]): Promise<Map<string, TickerSnapshot>> {
    const pairs = await Promise.all(
        tickers.map(async (ticker) => {
            const response = await getPortfolioTickers(1, 10, { search: ticker });
            const exact = (response.tickers || []).find(
                (item) => String(item.ticker || '').trim().toUpperCase() === ticker
            );

            return [
                ticker,
                {
                    ticker,
                    companyName: exact?.companyName || ticker,
                    latestPrice: Number.isFinite(Number(exact?.latestPrice)) ? Number(exact?.latestPrice) : undefined,
                    yesterdayPrice: Number.isFinite(Number(exact?.yesterdayPrice)) ? Number(exact?.yesterdayPrice) : undefined,
                } satisfies TickerSnapshot,
            ] as const;
        })
    );

    return new Map(pairs);
}

async function getSelectedDashboardPortfolio(portfolioId: string): Promise<SelectedDashboardPortfolio | null> {
    const response = await getSavedPortfolioById(portfolioId);
    if (!response.success || !response.portfolio) {
        return null;
    }

    const portfolio = response.portfolio;
    const palette = ['#6c4cff', '#9b83ff', '#ddd8ff', '#5ea6ff', '#35d27d', '#ffbf66', '#ff7a59', '#7db8ff'];
    const allocationEntries = Object.entries(portfolio.allocations || {});
    const normalizedTickers = allocationEntries.map(([ticker]) => String(ticker).trim().toUpperCase());
    const tickerSnapshots = await getTickerSnapshots(normalizedTickers);

    const holdings = allocationEntries
        .map(([ticker, allocation]) => {
            const normalizedTicker = String(ticker).trim().toUpperCase();
            const snapshot = tickerSnapshots.get(normalizedTicker);
            const allocatedAmount = Number(allocation?.allocatedAmount || 0);

            return {
                ticker: normalizedTicker,
                weightPercent: truncateToTwo(Number(allocation?.weight || 0) * 100),
                allocatedAmount,
                currentValue: roundCurrency(
                    getHoldingCurrentValue(allocatedAmount, snapshot?.latestPrice, snapshot?.yesterdayPrice)
                ),
            };
        })
        .sort((left, right) => right.weightPercent - left.weightPercent);

    const totalInvestment = roundCurrency(getTotalInvestment(portfolio.initialCapital, portfolio.allocations));
    const currentValue = roundCurrency(holdings.reduce((sum, holding) => sum + holding.currentValue, 0));
    const profitLoss = roundCurrency(currentValue - totalInvestment);
    const profitLossPercent = totalInvestment > 0 ? (profitLoss / totalInvestment) * 100 : 0;
    const initialCapital = Number(portfolio.initialCapital || 0) > 0
        ? Number(portfolio.initialCapital)
        : Number(totalInvestment || 100000);
    const investmentHistory = buildInvestmentHistory(portfolio, totalInvestment, currentValue);
    const latestTimestamp = investmentHistory[investmentHistory.length - 1]?.timestamp ?? (toTimestamp(portfolio.updatedAt) ?? Date.now());
    const yearAgoValue = getYearAgoValue(investmentHistory, latestTimestamp);
    const assetYearChange = yearAgoValue !== null
        ? roundCurrency(currentValue - yearAgoValue)
        : profitLoss;
    const assetYearChangePercent = yearAgoValue && yearAgoValue > 0
        ? (assetYearChange / yearAgoValue) * 100
        : profitLossPercent;
    const totalCurrentHoldingValue = Math.max(1, currentValue);

    return {
        id: portfolio.id,
        name: portfolio.name,
        riskLevel: portfolio.riskLevel,
        updatedAt: portfolio.updatedAt,
        tickersCount: portfolio.tickers.length,
        currentValue,
        totalInvestment,
        profitLoss,
        profitLossPercent,
        expectedReturnPercent: truncateToTwo(portfolio.expectedReturn * 100),
        volatilityPercent: truncateToTwo(portfolio.volatility * 100),
        mvoId: portfolio.mvoId,
        initialCapital,
        monthlyDca: Math.max(0, Number(portfolio.monthlyDca || 0)),
        investmentHorizon: Math.min(20, Math.max(1, Number(portfolio.targetYears || 10))),
        assetYearChange,
        assetYearChangePercent,
        investedBreakdown: holdings.slice(0, 8).map((holding, index) => ({
            label: holding.ticker,
            percent: truncateToTwo((holding.currentValue / totalCurrentHoldingValue) * 100),
            amount: holding.currentValue,
            color: palette[index % palette.length],
        })),
        investmentHistory,
    } satisfies SelectedDashboardPortfolio;
}

async function getDashboardPortfolioOptions(): Promise<DashboardPortfolioOption[]> {
    const saved = await getSavedPortfolios();
    if (!saved.success || !saved.portfolios || saved.portfolios.length === 0) {
        return [];
    }

    return saved.portfolios.map((portfolio) => ({
        id: portfolio.id,
        name: portfolio.name,
        riskLevel: portfolio.riskLevel,
        tickersCount: portfolio.tickers.length,
        updatedAt: portfolio.updatedAt,
    }));
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const portfolios = await getDashboardPortfolioOptions();
    const selectedPortfolioId = portfolios.some((portfolio) => portfolio.id === resolvedSearchParams?.portfolioId)
        ? resolvedSearchParams?.portfolioId
        : undefined;
    const selectedPortfolio = selectedPortfolioId
        ? await getSelectedDashboardPortfolio(selectedPortfolioId)
        : null;

    return (
        <SinglePortfolioDashboard
            portfolios={portfolios}
            selectedPortfolioId={selectedPortfolioId}
            selectedPortfolio={selectedPortfolio}
        />
    );
}
