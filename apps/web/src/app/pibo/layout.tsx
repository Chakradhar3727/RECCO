import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Factory, LogOut, LayoutDashboard, Target, CheckCircle, FileText } from 'lucide-react';

export default async function PiboLayout({ children }: { children: React.ReactNode }) {
    // Auth guard — only authenticated users can access
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/pibo/login');

    return (
        <div className="min-h-screen bg-recco-gray-50 flex">
            {/* Sidebar — deep amber matching PIBO branding */}
            <aside className="w-64 bg-recco-amber-700 text-white flex flex-col">
                <div className="p-6 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xl font-bold">
                        <Factory size={28} className="text-white" />
                        <span>PIBO</span>
                    </div>
                    <span className="text-xs text-white/60 uppercase tracking-widest bg-white/10 px-2 py-1 rounded w-fit mt-2">Brand Owner</span>
                </div>

                <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
                    <Link href="/pibo/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors">
                        <LayoutDashboard size={20} />
                        Dashboard
                    </Link>
                    <Link href="/pibo/form1" className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 font-medium hover:bg-white/10 hover:text-white transition-colors">
                        <Target size={20} />
                        EPR Targets
                    </Link>
                    <Link href="/pibo/certificates" className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 font-medium hover:bg-white/10 hover:text-white transition-colors">
                        <CheckCircle size={20} />
                        My Certificates
                    </Link>
                    <Link href="/pibo/marketplace" className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 font-medium hover:bg-white/10 hover:text-white transition-colors">
                        <FileText size={20} />
                        Certificate Market
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
