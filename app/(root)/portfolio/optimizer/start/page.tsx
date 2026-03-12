import type { Metadata } from 'next';
import PortfolioOptimizer from '@/components/portfolio/PortfolioOptimizer';

export const metadata: Metadata = {
  title: 'Portfolio Optimization Results | Stocks Portfolio',
  description: 'AI portfolio optimization results',
};

export default function PortfolioOptimizerResultPage() {
  return <PortfolioOptimizer mode="results" />;
}
