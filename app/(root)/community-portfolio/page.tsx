import type { Metadata } from 'next';
import CommunityPortfolioPage from '@/components/portfolio/community/CommunityPortfolioPage';

export const metadata: Metadata = {
  title: 'พอร์ตชุมชน | Stocks Portfolio',
  description: 'สำรวจพอร์ตจากชุมชนที่จัดอันดับตามผลตอบแทน ความผันผวน และ Sharpe Ratio',
};

export default function CommunityPortfolioRoutePage() {
  return <CommunityPortfolioPage />;
}