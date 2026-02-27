"use client";

import { useState } from "react";
import Link from "next/link";
import { Recycle, Eye, EyeOff, Loader2 } from "lucide-react";

export default function RecyclerLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setTimeout(() => {
            setError("Authentication not yet configured. Coming in Phase 1.");
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <div className="inline-flex p-4 rounded-2xl bg-recco-teal-700 text-white shadow-lg">
                    <Recycle size={32} />
                </div>
                <h1 className="text-2xl font-bold text-recco-navy-900">Recycler Login</h1>
                <p className="text-recco-navy-900/60 text-sm">Processing Facility - Manage intake & issue certificates</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="recycler-email" className="block text-sm font-medium text-recco-navy-900 mb-1">Email Address</label>
                    <input id="recycler-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-recco-gray-50 bg-white focus:border-recco-green-700 focus:ring-0 outline-none transition-colors text-recco-navy-900" placeholder="you@company.com" required />
                </div>

                <div>
                    <label htmlFor="recycler-password" className="block text-sm font-medium text-recco-navy-900 mb-1">Password</label>
                    <div className="relative">
                        <input id="recycler-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-recco-gray-50 bg-white focus:border-recco-green-700 focus:ring-0 outline-none transition-colors text-recco-navy-900 pr-12" placeholder="" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-recco-navy-900/40 hover:text-recco-navy-900 transition-colors">
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                {error && <div className="p-3 rounded-xl bg-recco-red-700/10 text-recco-red-700 text-sm">{error}</div>}

                <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-xl bg-recco-green-700 text-white font-semibold hover:bg-recco-green-700/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {loading && <Loader2 size={18} className="animate-spin" />}
                    {loading ? "Signing in..." : "Sign In as Recycler"}
                </button>
            </form>

            <p className="text-center text-sm text-recco-navy-900/50">
                Don&apos;t have an account?{" "}
                <Link href="/auth/recycler/register" className="text-recco-green-700 font-medium hover:underline">Register</Link>
                {" "}&middot;{" "}
                <Link href="/" className="text-recco-navy-900/50 hover:underline">Back to portals</Link>
            </p>
        </div>
    );
}
