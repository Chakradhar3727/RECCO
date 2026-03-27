export function generateSuccessPickupTemplate(data: {
  batchLabel: string;
}) {
  const timestamp = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST';
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Pickup Confirmed</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f0fdf4; color: #0f172a; margin: 0; padding: 0; display: flex; justify-content: center; min-height: 100vh; }
        .container { background-color: white; width: 100%; max-width: 480px; padding: 32px 24px; box-sizing: border-box; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center; display: flex; flex-direction: column; justify-content: center; }
        .icon { width: 80px; height: 80px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; color: #16a34a; }
        h1 { font-size: 28px; font-weight: 800; color: #166534; margin: 0 0 12px; }
        p { font-size: 16px; color: #475569; line-height: 1.5; margin: 0 0 32px; font-weight: 500; }
        .details { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left; }
        .row { display: flex; justify-content: space-between; margin-bottom: 12px; align-items: center; }
        .row:last-child { margin-bottom: 0; }
        .label { font-size: 13px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
        .value { font-size: 15px; font-weight: 700; color: #0f172a; }
        .batch-id { font-family: monospace; color: #166534; }
        .footer-note { font-size: 14px; color: #64748b; margin-top: auto; padding-top: 32px; border-top: 1px dashed #cbd5e1; }
        .green-text { color: #16a34a; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>
        
        <h1>Pickup Confirmed</h1>
        <p>The Recycler has been notified that the batch is now in transit.</p>
        
        <div class="details">
            <div class="row">
                <span class="label">Time</span>
                <span class="value">${timestamp}</span>
            </div>
            <div class="row">
                <span class="label">Date</span>
                <span class="value">${date}</span>
            </div>
            <div class="row">
                <span class="label">Reference</span>
                <span class="value batch-id">${data.batchLabel}</span>
            </div>
        </div>
        
        <div class="footer-note">
            <span class="green-text">✓ Secure Handoff Complete</span><br>
            You may close this window.
        </div>
    </div>
</body>
</html>`;
}
