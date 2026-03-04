import React from 'react';
import Link from 'next/link';
import { Briefcase, LogOut, LayoutDashboard, Users, BarChart3, Settings } from 'lucide-react';

export default function ProLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-recco-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-purple-900 text-white flex flex-col">
                <div className="p-6 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xl font-bold">
                        <Briefcase size={28} className="text-white" />
                        <span>PRO</span>
                    </div>
                    <span className="text-xs text-white/60 uppercase tracking-widest bg-white/10 px-2 py-1 rounded w-fit mt-2">Compliance Manager</span>
                </div>

                <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
                    <Link href="/pro/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors">
                        <LayoutDashboard size={20} />
                        Dashboard
                    </Link>
                    <Link href="/pro/clients" className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 font-medium hover:bg-white/10 hover:text-white transition-colors">
                        <Users size={20} />
                        Client Management
                    </Link>
                    <Link href="/pro/reports" className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 font-medium hover:bg-white/10 hover:text-white transition-colors">
                        <BarChart3 size={20} />
                        Compliance Reports
                    </Link>
                    <Link href="/pro/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 font-medium hover:bg-white/10 hover:text-white transition-colors">
                        <Settings size={20} />
                        Settings
                    </Link>
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-300 font-medium hover:bg-white/10 transition-colors">
                        <LogOut size={20} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
