import { NextResponse } from 'next/server';
import { getSavedPortfolios } from '@/lib/actions/cloudflare.actions';

export async function GET() {
  const response = await getSavedPortfolios();

  if (!response.success || !response.portfolios) {
    return NextResponse.json(
      { error: response.error || 'Failed to load saved portfolios' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    portfolios: response.portfolios.map((portfolio) => ({
      id: portfolio.id,
      name: portfolio.name,
      tickersCount: portfolio.tickers.length,
      riskLevel: portfolio.riskLevel,
      updatedAt: portfolio.updatedAt,
    })),
  });
}