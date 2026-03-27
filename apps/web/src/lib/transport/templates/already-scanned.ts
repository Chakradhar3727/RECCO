export function generateAlreadyScannedTemplate(data: {
  batchLabel: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Already Scanned</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #fffbeb; color: #0f172a; margin: 0; padding: 0; display: flex; justify-content: center; min-height: 100vh; }
        .container { background-color: white; width: 100%; max-width: 480px; padding: 32px 24px; box-sizing: border-box; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center; }
        .icon { width: 64px; height: 64px; background: #fef3c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; color: #d97706; }
        h1 { font-size: 24px; font-weight: 800; color: #92400e; margin: 0 0 12px; }
        p { font-size: 15px; color: #64748b; line-height: 1.5; margin: 0 0 24px; }
        .batch-id { font-family: monospace; background: #f8fafc; padding: 8px 12px; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block; color: #334155; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        </div>
        <h1>Already Scanned</h1>
        <p>This transport QR code has already been scanned and processed. No further action is required.</p>
        <div class="batch-id">${data.batchLabel}</div>
    </div>
</body>
</html>`;
}
