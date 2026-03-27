export function generateDeliveryWithoutPickupTemplate() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Invalid Delivery</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #fef2f2; color: #0f172a; margin: 0; padding: 0; display: flex; justify-content: center; min-height: 100vh; }
        .container { background-color: white; width: 100%; max-width: 480px; padding: 32px 24px; box-sizing: border-box; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center; }
        .icon { width: 64px; height: 64px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; color: #dc2626; }
        h1 { font-size: 24px; font-weight: 800; color: #991b1b; margin: 0 0 12px; }
        p { font-size: 15px; color: #64748b; line-height: 1.5; margin: 0 0 24px; }
        .alert-box { background: #fff5f5; border: 1px solid #fca5a5; padding: 12px; border-radius: 8px; font-size: 14px; color: #991b1b; font-weight: 500; }
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
        <h1>Action Blocked</h1>
        <p>This batch's delivery cannot be confirmed because it has no prior <b>Pickup Confirmation</b>.</p>
        <div class="alert-box">
            A pickup must be recorded at the Aggregator godown before delivery. Contact an admin.
        </div>
    </div>
</body>
</html>`;
}
