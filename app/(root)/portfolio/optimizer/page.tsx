import type { Metadata } from 'next';
import PortfolioOptimizer from '@/components/portfolio/PortfolioOptimizer';

export const metadata: Metadata = {
  title: 'Portfolio Optimizer | Stocks Portfolio',
  description: 'Optimize your filtered stock selection with AI allocation models',
};

export default function PortfolioOptimizerPage() {
  return <PortfolioOptimizer mode="settings" />;
}
