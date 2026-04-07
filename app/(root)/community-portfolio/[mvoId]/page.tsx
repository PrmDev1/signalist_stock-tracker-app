import type { Metadata } from 'next';
import CommunityPortfolioApplyPage from '@/components/portfolio/community/CommunityPortfolioApplyPage';

export const metadata: Metadata = {
  title: 'ตั้งค่าพอร์ตชุมชน | Stocks Portfolio',
  description: 'กำหนดค่าและบันทึกพอร์ตจากชุมชนเข้าสู่พื้นที่ทำงานส่วนตัวของคุณ',
};

interface CommunityPortfolioApplyRoutePageProps {
  params: Promise<{ mvoId: string }>;
}

export default async function CommunityPortfolioApplyRoutePage({ params }: CommunityPortfolioApplyRoutePageProps) {
  const { mvoId } = await params;
  return <CommunityPortfolioApplyPage mvoId={mvoId} />;
}