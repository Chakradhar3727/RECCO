export function generateDeliveryTemplate(data: {
  facilityId: string;
  facilityName: string;
  batchId: string;
  batchLabel: string;
  sourceAggregatorName: string;
  totalWeight: number;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Confirm Delivery</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0; display: flex; justify-content: center; min-height: 100vh; }
        .container { background-color: white; width: 100%; max-width: 480px; padding: 24px; box-sizing: border-box; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; }
        .header { text-align: center; margin-bottom: 24px; }
        .logo { font-size: 24px; font-weight: 900; color: #0284c7; margin-bottom: 8px; letter-spacing: -0.5px; }
        .title { font-size: 20px; font-weight: 700; color: #1e293b; margin: 0; }
        .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
        
        .facility-card { background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center; }
        .facility-name { font-size: 18px; font-weight: 700; color: #0369a1; }
        
        .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 12px; align-items: center; }
        .row:last-child { margin-bottom: 0; }
        .label { font-size: 13px; color: #64748b; font-weight: 500; }
        .value { font-size: 15px; font-weight: 600; color: #0f172a; }
        .batch-id { font-family: monospace; background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 14px; }
        
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 8px; }
        
        .btn { display: block; width: 100%; background-color: #0284c7; color: white; border: none; padding: 16px; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer; text-align: center; text-decoration: none; transition: background-color 0.2s; margin-top: auto; }
        .btn:hover { background-color: #0369a1; }
        .btn:active { background-color: #075985; }
        
        .disclaimer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 16px; }
        
        /* Loading Overlay */
        #loading-overlay { display: none; position: fixed; inset: 0; background: rgba(255,255,255,0.9); z-index: 50; flex-direction: column; align-items: center; justify-content: center; }
        .spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #0284c7; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">RECCO</div>
            <h1 class="title">Confirm Delivery</h1>
            <p class="subtitle">You are handing off a RECCO batch</p>
        </div>

        <div class="facility-card">
            <div class="label" style="margin-bottom: 4px;">Delivering To</div>
            <div class="facility-name">${data.facilityName}</div>
        </div>

        <div class="card">
            <div class="row">
                <span class="label">Batch Number</span>
                <span class="value batch-id">${data.batchLabel}</span>
            </div>
            <div class="row">
                <span class="label">Total Weight</span>
                <span class="value" style="color: #0284c7;">${data.totalWeight} kg</span>
            </div>
            <div class="row">
                <span class="label">From Aggregator</span>
                <span class="value">${data.sourceAggregatorName}</span>
            </div>
        </div>

        <form id="delivery-form" method="POST" action="/delivery/${data.facilityId}">
            <input type="hidden" name="batchId" value="${data.batchId}">
            <input type="hidden" name="scanLat" id="scanLat" value="">
            <input type="hidden" name="scanLng" id="scanLng" value="">
            <input type="hidden" name="deviceFingerprint" id="deviceFingerprint" value="">
            
            <button type="submit" class="btn" id="submit-btn">
                HANDOVER TO FACILITY
            </button>
        </form>
        
        <p class="disclaimer">By confirming this delivery, you verify that the materials have been dropped off at the recycler facility.</p>
    </div>

    <div id="loading-overlay">
        <div class="spinner"></div>
        <div style="color:#0f172a; font-weight:600;" id="loading-text">Getting GPS location...</div>
    </div>

    <script>
        function generateFingerprint() {
            try {
                return btoa([
                    navigator.userAgent, 
                    screen.width + 'x' + screen.height, 
                    Intl.DateTimeFormat().resolvedOptions().timeZone, 
                    navigator.language
                ].join('|'));
            } catch (e) {
                return btoa('fallback-fingerprint');
            }
        }
        
        document.getElementById('deviceFingerprint').value = generateFingerprint();
        
        const form = document.getElementById('delivery-form');
        const overlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            overlay.style.display = 'flex';
            
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        document.getElementById('scanLat').value = position.coords.latitude;
                        document.getElementById('scanLng').value = position.coords.longitude;
                        loadingText.innerText = "Securing transaction...";
                        form.submit();
                    },
                    (error) => {
                        loadingText.innerText = "Proceeding without GPS...";
                        form.submit();
                    },
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
            } else {
                form.submit();
            }
        });
    </script>
</body>
</html>`;
}
