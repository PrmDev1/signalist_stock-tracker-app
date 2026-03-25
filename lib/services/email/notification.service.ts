import { transporter } from '@/lib/nodemailer';
import { buildAlertTriggeredTemplate } from '@/lib/services/email/templates/alertTriggered';

interface PriceAlertTriggeredEmailInput {
  to: string;
  ticker: string;
  company: string;
  alertType: 'ABOVE' | 'BELOW';
  triggerPrice: number;
  currentPrice: number;
}

const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stock-market-dev.vercel.app';

export class EmailNotificationService {
  static async sendPriceAlertTriggeredEmail({
    to,
    ticker,
    company,
    alertType,
    triggerPrice,
    currentPrice,
  }: PriceAlertTriggeredEmailInput) {
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    });

    const html = buildAlertTriggeredTemplate({
      ticker,
      company,
      alertType,
      triggerPrice,
      currentPrice,
      timestamp,
      dashboardUrl: DASHBOARD_URL,
    });

    await transporter.sendMail({
      from: '"Signalist Alerts" <signalist@jsmastery.pro>',
      to,
      subject: `Alert Triggered for ${ticker}`,
      text: `${ticker} has crossed your ${alertType === 'ABOVE' ? 'upper' : 'lower'} threshold. Trigger ${triggerPrice.toFixed(2)}, current ${currentPrice.toFixed(2)}.`,
      html,
    });
  }
}
