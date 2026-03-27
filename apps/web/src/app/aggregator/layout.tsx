import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Package, Layers, Clock, LogOut } from 'lucide-react';
import Link from 'next/link';

export default async function AggregatorLayout({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/aggregator/login');

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

    const { data: aggregator } = await supabase
        .from('aggregators')
        .select('name')
        .eq('id', user.id)
        .single();

    const displayName = profile?.full_name || aggregator?.name || 'User';

    const { data: aggregatorProfile } = await supabase
        .from('aggregator_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

    const hasProfile = !!aggregatorProfile;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Desktop Sidebar (Hidden on Mobile) */}
            <aside className="hidden md:flex flex-col w-64 bg-emerald-900 text-white min-h-screen fixed left-0 top-0 border-r border-white/10 z-50">
                <div className="p-6 border-b border-white/10">
                    <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2">
                        <Package size={28} />
                        RECCO
                    </h2>
                </div>

                {hasProfile ? (
                    <nav className="flex-1 px-4 space-y-2 mt-6">
                        <Link href="/aggregator/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-emerald-800 transition-colors">
                            <Package size={20} />
                            <span className="font-medium">Dashboard</span>
                        </Link>
                        <Link href="/aggregator/collections" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-emerald-800 transition-colors text-emerald-100/70">
                            <Package size={20} />
                            <span className="font-medium">Collections</span>
                        </Link>
                        <Link href="/aggregator/batches" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-emerald-800 transition-colors text-emerald-100/70">
                            <Layers size={20} />
                            <span className="font-medium">Batches</span>
                        </Link>
                        <Link href="/aggregator/payments" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-emerald-800 transition-colors text-emerald-100/70">
                            <Clock size={20} />
                            <span className="font-medium">Payments</span>
                        </Link>
                    </nav>
                ) : (
                    <div className="flex-1 px-6 mt-6">
                        <div className="bg-emerald-800/50 rounded-lg p-4 text-emerald-100 text-sm border border-emerald-700">
                            Profile setup required. Menus will appear once your profile is active.
                        </div>
                    </div>
                )}

                <div className="p-4 border-t border-emerald-800 mt-auto">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-800 rounded-full flex items-center justify-center text-sm font-bold border border-emerald-700">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold truncate pr-2">{displayName}</p>
                                <p className="text-xs text-emerald-300 truncate">{user.email}</p>
                            </div>
                        </div>
                    </div>
                    <form action="/api/auth/signout" method="POST">
                        <button type="submit" className="flex items-center gap-3 w-full px-4 py-2 mt-2 rounded-lg text-red-300 font-medium hover:bg-emerald-800/50 transition-colors">
                            <LogOut size={18} />
                            <span className="text-sm">Sign Out</span>
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-64 relative min-h-screen bg-gray-50 pb-20 md:pb-0">
                {children}
            </main>
        </div>
    );
}
