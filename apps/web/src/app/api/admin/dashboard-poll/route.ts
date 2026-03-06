import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    getDashboardMetrics,
    getSystemHealth,
    getTransportStats,
    getFinancialSnapshot,
} from '@/app/admin/dashboard/actions';

/**
 * Dashboard polling endpoint — called every 10 seconds by the client.
 * Returns all 4 data sections for the live dashboard.
 */
export async function GET() {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [metrics, health, transport, financials] = await Promise.all([
            getDashboardMetrics(),
            getSystemHealth(),
            getTransportStats(),
            getFinancialSnapshot(),
        ]);

        return NextResponse.json({ metrics, health, transport, financials });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }
}
