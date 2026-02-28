
import PortfolioPageContent from '@/components/portfolio/PortfolioPageContent';
import { getSavedPortfolios } from '@/lib/actions/cloudflare.actions';

export default async function PortfolioPage() {
  const response = await getSavedPortfolios();
  const portfolios = response.success && response.portfolios ? response.portfolios : [];

  return (
    <div className="space-y-12">
      <PortfolioPageContent portfolios={portfolios} />
    </div>
  );
}
