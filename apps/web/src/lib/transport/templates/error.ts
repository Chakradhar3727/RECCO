export function generateErrorTemplate(
  errorType: 'INVALID_QR' | 'QR_EXPIRED' | 'WRONG_SEQUENCE' | 'DELIVERY_WITHOUT_PICKUP' | 'ALREADY_SCANNED'
) {
  let title = 'Action Blocked';
  let message = '';
  let bgColor = '#FEF2F2';
  let iconBg = '#FEE2E2';
  let iconColor = '#DC2626';
  let titleColor = '#991B1B';

  switch (errorType) {
    case 'INVALID_QR':
      title = 'QR Code Invalid';
      message = 'This QR code is not recognized by the RECCO system or the signature is invalid.';
      break;
    case 'QR_EXPIRED':
      title = 'QR Code Expired';
      message = 'This transport QR code has expired. Please ask the sender to generate a new one.';
      bgColor = '#FFFBEB';
      iconBg = '#FEF3C7';
      iconColor = '#D97706';
      titleColor = '#92400E';
      break;
    case 'WRONG_SEQUENCE':
      title = 'Wrong Scan Order';
      message = 'This batch is not in the correct state for this scan action.';
      bgColor = '#FFFBEB';
      iconBg = '#FEF3C7';
      iconColor = '#D97706';
      titleColor = '#92400E';
      break;
    case 'DELIVERY_WITHOUT_PICKUP':
      title = 'Pickup Not Recorded';
      message = 'This batch cannot be delivered because it has no prior Pickup Confirmation. Contact an admin.';
      break;
    case 'ALREADY_SCANNED':
      title = 'Already Confirmed ✓';
      message = 'This batch transport event has already been successfully recorded. No further action needed.';
      bgColor = '#F0FDF4';
      iconBg = '#DCFCE7';
      iconColor = '#16A34A';
      titleColor = '#166534';
      break;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: ${bgColor}; color: #0f172a; margin: 0; padding: 0; display: flex; justify-content: center; min-height: 100vh; }
        .container { background-color: white; width: 100%; max-width: 480px; padding: 32px 24px; box-sizing: border-box; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center; display: flex; flex-direction: column; justify-content: center; }
        .icon { width: 64px; height: 64px; background: ${iconBg}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; color: ${iconColor}; }
        h1 { font-size: 24px; font-weight: 800; color: ${titleColor}; margin: 0 0 12px; }
        p { font-size: 15px; color: #64748b; line-height: 1.5; margin: 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">
            ${errorType === 'ALREADY_SCANNED' ? 
            `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>` : 
            `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>`}
        </div>
        <h1>${title}</h1>
        <p>${message}</p>
    </div>
</body>
</html>`;
}
