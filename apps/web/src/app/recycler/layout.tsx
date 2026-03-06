import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Recycle, LogOut, LayoutDashboard, Truck, FileBadge, Settings } from 'lucide-react';

export default async function RecyclerLayout({ children }: { children: React.ReactNode }) {
    // Auth guard — only authenticated users can access
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/recycler/login');

    return (
        <div className="min-h-screen bg-recco-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-recco-teal-700 text-white flex flex-col">
                <div className="p-6 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xl font-bold">
                        <Recycle size={28} className="text-white" />
                        <span>Recycler</span>
                    </div>
                    <span className="text-xs text-white/60 uppercase tracking-widest bg-white/10 px-2 py-1 rounded w-fit mt-2">Processing Facility</span>
                </div>

                <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
                    <Link href="/recycler/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors">
                        <LayoutDashboard size={20} />
                        Dashboard
                    </Link>
                    <Link href="/recycler/batches" className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 font-medium hover:bg-white/10 hover:text-white transition-colors">
                        <Truck size={20} />
                        Material Intake
                    </Link>
                    <Link href="/recycler/marketplace" className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 font-medium hover:bg-white/10 hover:text-white transition-colors">
                        <FileBadge size={20} />
                        EPR Certificates
                    </Link>
                    <Link href="/recycler/facility-qr" className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 font-medium hover:bg-white/10 hover:text-white transition-colors">
                        <Settings size={20} />
                        Facility Settings
                    </Link>
                </nav>

                <div className="p-4 border-t border-white/10">
                    <form action="/api/auth/signout" method="POST">
                        <button type="submit" className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-300 font-medium hover:bg-white/10 transition-colors">
                            <LogOut size={20} />
                            Sign Out
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
