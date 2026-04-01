import type { Metadata } from 'next';
import CommunityPortfolioPage from '@/components/portfolio/community/CommunityPortfolioPage';

export const metadata: Metadata = {
  title: 'Community Portfolio | Stocks Portfolio',
  description: 'Explore community-built portfolio blueprints ranked by return, volatility, and Sharpe ratio.',
};

export default function CommunityPortfolioRoutePage() {
  return <CommunityPortfolioPage />;
}