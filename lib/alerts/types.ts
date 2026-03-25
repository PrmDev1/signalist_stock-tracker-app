export type AlertType = 'ABOVE' | 'BELOW';

export interface PriceAlertDto {
  id: string;
  userId: string;
  ticker: string;
  company?: string;
  alertType: AlertType;
  triggerPrice: number;
  currentPriceAtSet: number;
  lastEvaluatedPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  triggeredAt: string | null;
}
