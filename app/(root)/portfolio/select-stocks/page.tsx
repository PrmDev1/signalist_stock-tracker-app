import type { Metadata } from 'next';
import StockSelectorContent from '@/components/portfolio/StockSelectorContent';

export const metadata: Metadata = {
  title: 'Select Assets | Stocks Portfolio',
  description: 'Select stocks for your portfolio optimization',
};

export default function SelectStocksPage() {
  return <StockSelectorContent />;
}
