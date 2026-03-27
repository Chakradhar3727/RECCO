export function generatePickupTemplate(data: {
  batchId: string;
  batchLabel: string;
  aggregatorName: string;
  totalWeight: number;
  collectionCount: number;
  event: string;
  expires: string;
  sig: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>RECCO Transport Pickup</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0; display: flex; justify-content: center; min-height: 100vh; }
        .container { background-color: white; width: 100%; max-width: 480px; padding: 24px; box-sizing: border-box; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; }
        .header { text-align: center; margin-bottom: 24px; }
        .logo { font-size: 24px; font-weight: 900; color: #166534; margin-bottom: 8px; letter-spacing: -0.5px; }
        .title { font-size: 20px; font-weight: 700; color: #1e293b; margin: 0; }
        .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
        
        .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 12px; align-items: center; }
        .row:last-child { margin-bottom: 0; }
        .label { font-size: 13px; color: #64748b; font-weight: 500; }
        .value { font-size: 15px; font-weight: 600; color: #0f172a; }
        .batch-id { font-family: monospace; background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 14px; }
        
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 8px; }
        .form-input { width: 100%; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 16px; box-sizing: border-box; outline: none; transition: border-color 0.2s; }
        .form-input:focus { border-color: #166534; box-shadow: 0 0 0 3px rgba(22, 101, 52, 0.1); }
        
        .btn { display: block; width: 100%; background-color: #166534; color: white; border: none; padding: 16px; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer; text-align: center; text-decoration: none; transition: background-color 0.2s; margin-top: auto; }
        .btn:hover { background-color: #14532d; }
        .btn:active { background-color: #052e16; }
        
        .disclaimer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 16px; }
        
        /* Loading Overlay */
        #loading-overlay { display: none; position: fixed; inset: 0; background: rgba(255,255,255,0.9); z-index: 50; flex-direction: column; align-items: center; justify-content: center; }
        .spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #166534; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">RECCO</div>
            <h1 class="title">Confirm Pickup</h1>
            <p class="subtitle">You are receiving a verified RECCO batch</p>
        </div>

        <div class="card">
            <div class="row">
                <span class="label">Batch Number</span>
                <span class="value batch-id">${data.batchLabel}</span>
            </div>
            <div class="row">
                <span class="label">From Aggregator</span>
                <span class="value">${data.aggregatorName}</span>
            </div>
            <div class="row">
                <span class="label">Total Weight</span>
                <span class="value" style="color: #166534;">${data.totalWeight} kg</span>
            </div>
            <div class="row">
                <span class="label">Items</span>
                <span class="value">${data.collectionCount} Collections</span>
            </div>
        </div>

        <form id="pickup-form" method="POST" action="/transport/scan">
            <!-- Hidden Fields required for validation -->
            <input type="hidden" name="batch_id" value="${data.batchId}">
            <input type="hidden" name="event" value="${data.event}">
            <input type="hidden" name="expires" value="${data.expires}">
            <input type="hidden" name="sig" value="${data.sig}">
            
            <input type="hidden" name="scanLat" id="scanLat" value="">
            <input type="hidden" name="scanLng" id="scanLng" value="">
            <input type="hidden" name="deviceFingerprint" id="deviceFingerprint" value="">
            
            <div class="form-group">
                <label class="form-label">Carrier Name</label>
                <input type="text" name="carrierName" class="form-input" placeholder="Enter your full name" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Vehicle Registration Number</label>
                <input type="text" name="vehicleNumber" class="form-input" placeholder="e.g. MH 01 AB 1234" required>
            </div>

            <button type="submit" class="btn" id="submit-btn" style="margin-top: 16px;">
                CONFIRM PICKUP
            </button>
        </form>
        
        <p class="disclaimer">By confirming this pickup, you verify the materials have been loaded onto your vehicle.</p>
    </div>

    <!-- GPS & Device Fingerprint generation (Module 4.2 Requirement) -->
    <div id="loading-overlay">
        <div class="spinner"></div>
        <div style="color:#0f172a; font-weight:600;" id="loading-text">Getting GPS location...</div>
    </div>

    <script>
        // Module 4.2: Inline JS to record Device Fingerprint before POSTing
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
        
        const form = document.getElementById('pickup-form');
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
                        // We still submit even if GPS fails (fraud check will note missing GPS)
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
