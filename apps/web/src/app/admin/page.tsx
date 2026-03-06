import { redirect } from 'next/navigation';

/**
 * Admin root page — redirects to the dashboard.
 */
export default function AdminRootPage() {
    redirect('/admin/dashboard');
}
