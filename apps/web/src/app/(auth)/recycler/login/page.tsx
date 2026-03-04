"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { recyclerLogin } from "./actions";

export default function RecyclerLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLoginSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const result = await recyclerLogin(email, password);
        if (result.success) {
            router.push("/recycler/dashboard");
        } else {
            setError(result.error || "Login failed");
        }
        setLoading(false);
    }, [email, password, router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-recco-gray-50 via-white to-emerald-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-700 flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-recco-gray-900">Recycler Login</h1>
                    <p className="text-recco-gray-500 mt-1">Certified Recycling Facility Portal</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-recco-gray-200 p-8">
                    <form onSubmit={handleLoginSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="rec-email" className="block text-sm font-medium text-recco-gray-700 mb-1.5">Email</label>
                            <input id="rec-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="facility@recycler.com" required autoFocus disabled={loading} className="w-full px-4 py-3 border-2 border-recco-gray-200 rounded-xl text-recco-gray-900 placeholder-recco-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:opacity-50" />
                        </div>
                        <div>
                            <label htmlFor="rec-password" className="block text-sm font-medium text-recco-gray-700 mb-1.5">Password</label>
                            <div className="relative">
                                <input id="rec-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required disabled={loading} className="w-full px-4 py-3 pr-12 border-2 border-recco-gray-200 rounded-xl text-recco-gray-900 placeholder-recco-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:opacity-50" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-recco-gray-400 hover:text-recco-gray-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} /></svg>
                                </button>
                            </div>
                        </div>
                        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
                        <button type="submit" disabled={loading || !email || !password} className="w-full py-3 px-4 bg-emerald-700 text-white font-semibold rounded-xl hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all disabled:opacity-50">
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-6 space-x-3">
                    <span className="text-sm text-recco-gray-500">New facility?</span>
                    <a href="/recycler/register" className="text-sm text-emerald-700 hover:text-emerald-800 font-medium">Register</a>
                    <span className="text-sm text-recco-gray-400">·</span>
                    <a href="/" className="text-sm text-recco-gray-500 hover:text-emerald-700">Back to portals</a>
                </div>
            </div>
        </div>
    );
}
