import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * PRO root page — redirects authenticated users to dashboard,
 * unauthenticated users to the login page.
 */
export default async function ProPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        redirect('/pro/dashboard');
    } else {
        redirect('/pro/login');
    }
}
