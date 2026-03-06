import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Truck, LogOut, LayoutDashboard, Package, MapPin, DollarSign } from 'lucide-react';

export default async function AggregatorLayout({ children }: { children: React.ReactNode }) {
    // Auth guard — only authenticated users can access
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/aggregator/login');

    return (
        <div className="min-h-screen bg-recco-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-recco-green-800 text-white flex flex-col">
                <div className="p-6 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xl font-bold">
                        <Truck size={28} className="text-white" />
                        <span>Aggregator</span>
                    </div>
                    <span className="text-xs text-white/60 uppercase tracking-widest bg-white/10 px-2 py-1 rounded w-fit mt-2">Waste Collector</span>
                </div>

                <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
                    <Link href="/aggregator/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors">
                        <LayoutDashboard size={20} />
                        Dashboard
                    </Link>
                    <Link href="/aggregator/collections" className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 font-medium hover:bg-white/10 hover:text-white transition-colors">
                        <Package size={20} />
                        My Collections
                    </Link>
                    <Link href="/aggregator/routes" className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 font-medium hover:bg-white/10 hover:text-white transition-colors">
                        <MapPin size={20} />
                        Pickup Routes
                    </Link>
                    <Link href="/aggregator/earnings" className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 font-medium hover:bg-white/10 hover:text-white transition-colors">
                        <DollarSign size={20} />
                        Earnings
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
