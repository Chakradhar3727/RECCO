import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Recycler root page — redirects authenticated users to dashboard,
 * unauthenticated users to the login page.
 */
export default async function RecyclerPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        redirect('/recycler/dashboard');
    } else {
        redirect('/recycler/login');
    }
}
