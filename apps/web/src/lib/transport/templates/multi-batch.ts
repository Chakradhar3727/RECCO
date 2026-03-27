export interface MultiBatchItem {
  id: string;
  label: string;
  sourceAggregatorName: string;
  weight: number;
  timeSincePickupText: string;
  materialType: string;
}

export function generateMultiBatchDeliveryTemplate(data: {
  facilityId: string;
  facilityName: string;
  batches: MultiBatchItem[];
}) {
  const totalItems = data.batches.length;
  
  const batchCardsHtml = data.batches.map((batch, index) => {
    return `
      <div class="batch-card">
        <div class="batch-header">
           <div class="batch-ident">
              <span class="batch-number">${batch.label}</span>
              <span class="material-badge">${batch.materialType}</span>
           </div>
           <input type="checkbox" name="selected_batches" value="${batch.id}" class="batch-checkbox" checked id="checkbox-${index}">
        </div>
        <label for="checkbox-${index}" class="batch-details">
           <div class="detail-row">
             <span class="text-secondary">From:</span>
             <span class="text-primary font-medium">${batch.sourceAggregatorName}</span>
           </div>
           <div class="detail-row">
             <span class="text-secondary">Est. Weight:</span>
             <span class="font-mono text-blue">${batch.weight} kg</span>
           </div>
           <div class="detail-row">
             <span class="text-secondary">Transit Time:</span>
             <span class="text-primary">${batch.timeSincePickupText}</span>
           </div>
        </label>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Multi-Batch Delivery</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0; min-height: 100vh; display: flex; flex-direction: column; align-items: center; }
        .container { background-color: white; width: 100%; max-width: 480px; padding: 24px; box-sizing: border-box; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; flex-grow: 1; }
        .header { margin-bottom: 20px; text-align: center; }
        .facility-name { font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .facility-value { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px; }
        .instruction { font-size: 14px; color: #475569; margin-top: 8px; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; display: inline-block; }
        
        .batch-list { flex-grow: 1; overflow-y: auto; margin-bottom: 24px; }
        .batch-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 12px; background: #ffffff; transition: border-color 0.2s; }
        .batch-card:has(input:checked) { border-color: #0284c7; background: #f0f9ff; }
        
        .batch-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #e2e8f0; }
        .batch-ident { display: flex; align-items: center; gap: 8px; }
        .batch-number { font-family: monospace; font-size: 15px; font-weight: 700; color: #0f172a; }
        .material-badge { font-size: 11px; padding: 2px 6px; background: #e2e8f0; color: #475569; border-radius: 4px; font-weight: 600; text-transform: uppercase; }
        
        .batch-checkbox { width: 22px; height: 22px; accent-color: #0284c7; cursor: pointer; }
        
        .batch-details { display: flex; flex-direction: column; gap: 6px; cursor: pointer; }
        .detail-row { display: flex; justify-content: space-between; font-size: 13px; }
        
        .text-secondary { color: #64748b; }
        .text-primary { color: #1e293b; }
        .text-blue { color: #0284c7; font-weight: 600; }
        .font-medium { font-weight: 600; }
        .font-mono { font-family: monospace; }
        
        .footer { padding-top: 16px; border-top: 1px solid #e2e8f0; background: white; margin-top: auto; }
        .summary { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 14px; font-weight: 600; color: #0f172a; }
        
        .btn { display: block; width: 100%; background-color: #1B6B35; color: white; border: none; padding: 16px; height: 56px; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; text-align: center; transition: background-color 0.2s; }
        .btn:hover { background-color: #14532a; }
        .btn:disabled { background-color: #94a3b8; cursor: not-allowed; }
        
        /* Loading Overlay */
        #loading-overlay { display: none; position: fixed; inset: 0; background: rgba(255,255,255,0.9); z-index: 50; flex-direction: column; align-items: center; justify-content: center; }
        .spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #1B6B35; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="facility-name">Delivering To</div>
            <div class="facility-value">${data.facilityName}</div>
            <div class="instruction">${totalItems} batches en route to this facility</div>
        </div>

        <form id="multi-delivery-form" method="POST" action="/delivery/${data.facilityId}">
            <div class="batch-list">
                ${batchCardsHtml}
            </div>
            
            <input type="hidden" name="scanLat" id="scanLat" value="">
            <input type="hidden" name="scanLng" id="scanLng" value="">
            <input type="hidden" name="deviceFingerprint" id="deviceFingerprint" value="">
            <input type="hidden" name="isMultiBatch" value="true">
            
            <div class="footer">
                <div class="summary">
                    <span id="selected-count">Selected: ${totalItems} batches</span>
                    <span id="total-weight">Total: <span id="weight-val">--</span> kg</span>
                </div>
                <button type="submit" class="btn" id="submit-btn">
                    ✓ CONFIRM DELIVERY FOR SELECTED
                </button>
            </div>
        </form>
    </div>

    <div id="loading-overlay">
        <div class="spinner"></div>
        <div style="color:#0f172a; font-weight:600;" id="loading-text">Getting GPS location...</div>
    </div>

    <script>
        const batches = ${JSON.stringify(data.batches.map(b => ({ id: b.id, weight: b.weight })))};
        
        function updateSummary() {
            const checkboxes = document.querySelectorAll('.batch-checkbox:checked');
            let totalWeight = 0;
            
            checkboxes.forEach(cb => {
                const batch = batches.find(b => b.id === cb.value);
                if (batch) totalWeight += batch.weight;
            });
            
            document.getElementById('selected-count').innerText = \`Selected: \${checkboxes.length} batches\`;
            document.getElementById('weight-val').innerText = totalWeight.toFixed(1);
            
            document.getElementById('submit-btn').disabled = checkboxes.length === 0;
        }
        
        document.querySelectorAll('.batch-checkbox').forEach(cb => {
            cb.addEventListener('change', updateSummary);
        });
        
        // Initial run
        updateSummary();

        function generateFingerprint() {
            try {
                return btoa([navigator.userAgent, screen.width + 'x' + screen.height].join('|'));
            } catch (e) { return btoa('fallback'); }
        }
        document.getElementById('deviceFingerprint').value = generateFingerprint();
        
        const form = document.getElementById('multi-delivery-form');
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
