export interface FilteredStock {
  symbol: string;
  name: string;
  sector: string;
  marketCap: number;
  tag?: string;
  latestPrice?: number;
  dayChangePercent?: number;
}

export const FILTERED_STOCKS_STORAGE_KEY = 'portfolioFilteredStocks';

function normalizeFilteredStock(stock: FilteredStock): FilteredStock {
  return {
    symbol: stock.symbol.trim().toUpperCase(),
    name: stock.name.trim(),
    sector: stock.sector.trim(),
    marketCap: stock.marketCap,
    tag: typeof stock.tag === 'string' && stock.tag.trim().length > 0 ? stock.tag.trim().toLowerCase() : undefined,
    latestPrice: stock.latestPrice,
    dayChangePercent: stock.dayChangePercent,
  };
}

function dedupeFilteredStocks(stocks: FilteredStock[]): FilteredStock[] {
  const map = new Map<string, FilteredStock>();

  for (const stock of stocks) {
    const normalized = normalizeFilteredStock(stock);
    if (!normalized.symbol) continue;
    if (!map.has(normalized.symbol)) {
      map.set(normalized.symbol, normalized);
    }
  }

  return Array.from(map.values());
}

export function setFilteredStocksInSession(stocks: FilteredStock[]): void {
  if (typeof window === 'undefined') return;
  const uniqueStocks = dedupeFilteredStocks(stocks);
  sessionStorage.setItem(FILTERED_STOCKS_STORAGE_KEY, JSON.stringify(uniqueStocks));
}

export function getFilteredStocksFromSession(): FilteredStock[] {
  if (typeof window === 'undefined') return [];

  const raw = sessionStorage.getItem(FILTERED_STOCKS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as FilteredStock[];
    if (!Array.isArray(parsed)) return [];

    const validStocks = parsed.filter((stock) => {
      return (
        typeof stock?.symbol === 'string' &&
        stock.symbol.length > 0 &&
        typeof stock?.name === 'string' &&
        typeof stock?.sector === 'string' &&
        typeof stock?.marketCap === 'number' &&
        (typeof stock?.tag === 'undefined' || typeof stock?.tag === 'string')
      );
    });

    return dedupeFilteredStocks(validStocks);
  } catch {
    return [];
  }
}
