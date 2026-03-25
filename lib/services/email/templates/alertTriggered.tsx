interface AlertTriggeredTemplateInput {
  ticker: string;
  company: string;
  alertType: 'ABOVE' | 'BELOW';
  triggerPrice: number;
  currentPrice: number;
  timestamp: string;
  dashboardUrl: string;
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);

export const buildAlertTriggeredTemplate = ({
  ticker,
  company,
  alertType,
  triggerPrice,
  currentPrice,
  timestamp,
  dashboardUrl,
}: AlertTriggeredTemplateInput) => {
  const isAbove = alertType === 'ABOVE';
  const heroTitle = isAbove ? 'Price Above Reached' : 'Price Below Hit';
  const heroColor = isAbove ? '#16965f' : '#df3650';
  const currentColor = isAbove ? '#0FEDBE' : '#FF495B';
  const conditionText = isAbove
    ? `Price has crossed above ${formatPrice(triggerPrice)}`
    : `Price has crossed below ${formatPrice(triggerPrice)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no" />
  <title>Alert Triggered for ${ticker}</title>
</head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#050505;">
    <tr>
      <td align="center" style="padding:30px 14px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px;background:#141414;border:1px solid #30333A;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:30px;">
              <img src="https://ik.imagekit.io/a6fkjou7d/logo.png?updatedAt=1756378431634" alt="Signalist" width="144" style="display:block;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:0 30px 20px 30px;">
              <div style="border-radius:14px;background:${heroColor};padding:24px 16px;text-align:center;">
                <p style="margin:0;color:#ffffff;font-size:42px;line-height:1;">${isAbove ? '📈' : '📉'}</p>
                <h1 style="margin:12px 0 8px 0;color:#ffffff;font-size:34px;line-height:1.2;font-weight:700;">${heroTitle}</h1>
                <p style="margin:0;color:#ffffff;opacity:0.9;font-size:16px;">${timestamp}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 30px 26px 30px;">
              <div style="border-radius:14px;background:#212328;padding:24px;text-align:center;">
                <h2 style="margin:0;color:#ffffff;font-size:42px;line-height:1.1;font-weight:700;">${ticker}</h2>
                <p style="margin:8px 0 20px 0;color:#CCDADC;font-size:22px;font-weight:600;">${company}</p>
                <p style="margin:0;color:#CCDADC;font-size:18px;">Current Price:</p>
                <p style="margin:8px 0 0 0;color:${currentColor};font-size:46px;line-height:1.1;font-weight:700;">${formatPrice(currentPrice)}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 30px 22px 30px;">
              <div style="border-radius:14px;background:#212328;padding:22px;">
                <h3 style="margin:0 0 14px 0;color:#ffffff;font-size:24px;">Alert Details:</h3>
                <p style="margin:0 0 10px 0;color:#CCDADC;font-size:24px;line-height:1.35;">${conditionText}</p>
                <p style="margin:0 0 10px 0;color:#CCDADC;font-size:24px;line-height:1.35;">Trigger Price: <strong style="color:#ffffff;">${formatPrice(triggerPrice)}</strong></p>
                <p style="margin:0;color:#CCDADC;font-size:24px;line-height:1.35;">Current Price: <strong style="color:#ffffff;">${formatPrice(currentPrice)}</strong></p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 30px 22px 30px;">
              <a href="${dashboardUrl}" style="display:block;text-align:center;text-decoration:none;background:#FDD458;color:#000000;border-radius:12px;padding:16px 20px;font-size:20px;font-weight:700;">View Dashboard</a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 30px 30px 30px;text-align:center;">
              <p style="margin:0;color:#9095A1;font-size:13px;line-height:1.4;">You are receiving this email because you created a price alert in Signalist.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
