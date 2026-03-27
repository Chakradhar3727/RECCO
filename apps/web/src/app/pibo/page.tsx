import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * PIBO root page — redirects authenticated users to dashboard,
 * unauthenticated users to the login page.
 */
export default async function PiboPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        redirect('/pibo/dashboard');
    } else {
        redirect('/login');
    }
}
