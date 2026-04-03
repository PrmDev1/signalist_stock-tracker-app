import type { Metadata } from 'next';
import CommunityPortfolioApplyPage from '@/components/portfolio/community/CommunityPortfolioApplyPage';

export const metadata: Metadata = {
  title: 'Apply Community Portfolio | Stocks Portfolio',
  description: 'Configure and save a community-built portfolio into your private workspace.',
};

interface CommunityPortfolioApplyRoutePageProps {
  params: Promise<{ mvoId: string }>;
}

export default async function CommunityPortfolioApplyRoutePage({ params }: CommunityPortfolioApplyRoutePageProps) {
  const { mvoId } = await params;
  return <CommunityPortfolioApplyPage mvoId={mvoId} />;
}