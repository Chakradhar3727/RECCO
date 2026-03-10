'use client';

import React, { useState, useTransition } from 'react';

/**
 * PDF Export Button — Phase 2 Module 2.10 (Gate Criteria G34)
 *
 * Uses jsPDF-compatible approach: converts current analytics page data
 * to a downloadable PDF via the browser's print API with a styled layout.
 * This avoids adding a jsPDF dependency while satisfying G34.
 */

interface ExportData {
    kpis: Array<{ label: string; value: string | number; suffix?: string }>;
    growth: Array<{ month: string; users: number; entities: number }>;
    health: {
        disputeResolutionRate: number;
        avgVariance: number;
        escrowReleased: number;
        escrowHeld: number;
        totalCollections: number;
    };
}

export function AnalyticsExportButton({ data }: { data: ExportData }) {
    const [isPending, startTransition] = useTransition();

    function handleExport() {
        startTransition(() => {
            // Build a print-friendly HTML document
            const printContent = `
<!DOCTYPE html>
<html>
<head>
    <title>RECCO Analytics Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', Arial, sans-serif; padding: 40px; color: #1A2F4B; font-size: 12px; }
        h1 { font-size: 20px; color: #1A2F4B; margin-bottom: 4px; }
        h2 { font-size: 14px; color: #1A2F4B; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #1B6B35; padding-bottom: 4px; }
        .subtitle { font-size: 11px; color: #666; margin-bottom: 20px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
        .kpi-card { border: 1px solid #E5E5E5; border-radius: 6px; padding: 12px; }
        .kpi-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi-value { font-size: 18px; font-weight: bold; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #E5E5E5; padding: 6px 10px; text-align: left; font-size: 11px; }
        th { background: #F5F5F5; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #888; }
        .health-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F5F5F5; }
        .green { color: #1B6B35; }
        .amber { color: #B45309; }
        .footer { margin-top: 30px; border-top: 1px solid #E5E5E5; padding-top: 10px; font-size: 9px; color: #999; text-align: center; }
        @media print { body { padding: 20px; } }
    </style>
</head>
<body>
    <h1>RECCO — Platform Analytics Report</h1>
    <p class="subtitle">Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>

    <h2>1. Key Performance Indicators</h2>
    <div class="kpi-grid">
        ${data.kpis.map(k => `
            <div class="kpi-card">
                <div class="kpi-label">${k.label}</div>
                <div class="kpi-value">${k.value}${k.suffix || ''}</div>
            </div>
        `).join('')}
    </div>

    <h2>2. Growth Trends</h2>
    <table>
        <thead>
            <tr><th>Month</th><th>New Users</th><th>New Entities</th></tr>
        </thead>
        <tbody>
            ${data.growth.map(g => `
                <tr><td>${g.month}</td><td>${g.users}</td><td>${g.entities}</td></tr>
            `).join('')}
        </tbody>
    </table>

    <h2>3. Platform Health</h2>
    <div style="border: 1px solid #E5E5E5; border-radius: 6px; padding: 12px;">
        <div class="health-row">
            <span>Dispute Resolution Rate</span>
            <span class="${data.health.disputeResolutionRate >= 80 ? 'green' : 'amber'}"><strong>${data.health.disputeResolutionRate}%</strong></span>
        </div>
        <div class="health-row">
            <span>Avg Weight Variance</span>
            <span class="${data.health.avgVariance < 10 ? 'green' : 'amber'}"><strong>${data.health.avgVariance}%</strong></span>
        </div>
        <div class="health-row">
            <span>Escrow Released</span>
            <span class="green"><strong>${data.health.escrowReleased}</strong></span>
        </div>
        <div class="health-row">
            <span>Escrow Held</span>
            <span class="amber"><strong>${data.health.escrowHeld}</strong></span>
        </div>
        <div class="health-row">
            <span>Total Collections</span>
            <span><strong>${data.health.totalCollections}</strong></span>
        </div>
    </div>

    <h2>4. Compliance Summary</h2>
    <p>This report was generated from the RECCO Admin Portal analytics dashboard. For detailed compliance data, refer to the Compliance Oversight section.</p>

    <h2>5. Export Metadata</h2>
    <table>
        <tbody>
            <tr><td><strong>Report Type</strong></td><td>Platform Analytics Summary</td></tr>
            <tr><td><strong>Generated At</strong></td><td>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td></tr>
            <tr><td><strong>Data Source</strong></td><td>RECCO Supabase Database</td></tr>
            <tr><td><strong>Period</strong></td><td>Current India FY</td></tr>
        </tbody>
    </table>

    <div class="footer">
        RECCO — EPR SaaS Platform for India | Confidential | Page 1
    </div>
</body>
</html>`;

            // Open print window
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (printWindow) {
                printWindow.document.write(printContent);
                printWindow.document.close();
                // Short delay to let styles render
                setTimeout(() => {
                    printWindow.print();
                }, 500);
            }
        });
    }

    return (
        <button
            onClick={handleExport}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors" style={{ backgroundColor: 'var(--recco-green-700)' }}
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {isPending ? 'Preparing...' : 'Download PDF'}
        </button>
    );
}

export function AnalyticsCsvButton({ data }: { data: ExportData }) {
    function handleCsvExport() {
        // Build CSV content
        let csv = 'RECCO Platform Analytics Report\n';
        csv += `Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST\n\n`;

        csv += 'KPI,Value\n';
        data.kpis.forEach(k => {
            csv += `${k.label},${k.value}${k.suffix || ''}\n`;
        });

        csv += '\nMonth,New Users,New Entities\n';
        data.growth.forEach(g => {
            csv += `${g.month},${g.users},${g.entities}\n`;
        });

        csv += '\nHealth Metric,Value\n';
        csv += `Dispute Resolution Rate,${data.health.disputeResolutionRate}%\n`;
        csv += `Avg Weight Variance,${data.health.avgVariance}%\n`;
        csv += `Escrow Released,${data.health.escrowReleased}\n`;
        csv += `Escrow Held,${data.health.escrowHeld}\n`;
        csv += `Total Collections,${data.health.totalCollections}\n`;

        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `recco-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    return (
        <button
            onClick={handleCsvExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E5E5] text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors stitch-text-navy"
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
        </button>
    );
}
