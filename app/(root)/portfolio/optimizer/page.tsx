import type { Metadata } from 'next';
import PortfolioOptimizer from '@/components/portfolio/PortfolioOptimizer';

export const metadata: Metadata = {
  title: 'RoboAdvisor | Stocks Portfolio',
  description: 'Build a portfolio through a guided RoboAdvisor workflow with optimization and review steps',
};

export default function PortfolioOptimizerPage() {
  return <PortfolioOptimizer mode="settings" />;
}
