import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

const SESSION_TIMEOUT_SECONDS = 900; // 15 minutes

export async function GET() {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ secondsRemaining: 0 }, { status: 401 });
        }

        const adminClient = createServiceRoleClient();
        const { data: session } = await adminClient
            .from('admin_sessions')
            .select('last_active_at')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!session) {
            return NextResponse.json({ secondsRemaining: 0 });
        }

        const lastActive = new Date(session.last_active_at).getTime();
        const elapsed = Math.floor((Date.now() - lastActive) / 1000);
        const remaining = Math.max(0, SESSION_TIMEOUT_SECONDS - elapsed);

        return NextResponse.json({ secondsRemaining: remaining });
    } catch {
        return NextResponse.json({ secondsRemaining: 0 }, { status: 500 });
    }
}
