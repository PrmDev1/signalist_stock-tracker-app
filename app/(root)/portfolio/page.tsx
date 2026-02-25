
import PortfolioPageContent from '@/components/portfolio/PortfolioPageContent';
import PortfolioOptimizer from '@/components/portfolio/PortfolioOptimizer';

export default function PortfolioPage() {
  return (
    <div className="space-y-12">
      <PortfolioPageContent />
      
      {/* Portfolio Optimizer Section */}
      <div id="optimizer" className="mt-12 pt-8 border-t border-neutral-700">
        <PortfolioOptimizer />
      </div>
    </div>
  );
}
