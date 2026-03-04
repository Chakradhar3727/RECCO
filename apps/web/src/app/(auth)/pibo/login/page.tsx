"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { piboLogin } from "./actions";

export default function PiboLoginPage() {
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
        const result = await piboLogin(email, password);
        if (result.success) {
            router.push("/pibo/dashboard");
        } else {
            setError(result.error || "Login failed");
        }
        setLoading(false);
    }, [email, password, router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-recco-gray-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-700 flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-recco-gray-900">PIBO Login</h1>
                    <p className="text-recco-gray-500 mt-1">Producer / Importer / Brand Owner Portal</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-recco-gray-200 p-8">
                    <form onSubmit={handleLoginSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="pibo-email" className="block text-sm font-medium text-recco-gray-700 mb-1.5">Email</label>
                            <input id="pibo-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@brand.com" required autoFocus disabled={loading} className="w-full px-4 py-3 border-2 border-recco-gray-200 rounded-xl text-recco-gray-900 placeholder-recco-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50" />
                        </div>
                        <div>
                            <label htmlFor="pibo-password" className="block text-sm font-medium text-recco-gray-700 mb-1.5">Password</label>
                            <div className="relative">
                                <input id="pibo-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required disabled={loading} className="w-full px-4 py-3 pr-12 border-2 border-recco-gray-200 rounded-xl text-recco-gray-900 placeholder-recco-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-recco-gray-400 hover:text-recco-gray-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} /></svg>
                                </button>
                            </div>
                        </div>
                        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
                        <button type="submit" disabled={loading || !email || !password} className="w-full py-3 px-4 bg-blue-700 text-white font-semibold rounded-xl hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50">
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-6 space-x-3">
                    <span className="text-sm text-recco-gray-500">New to RECCO?</span>
                    <a href="/pibo/register" className="text-sm text-blue-700 hover:text-blue-800 font-medium">Register</a>
                    <span className="text-sm text-recco-gray-400">·</span>
                    <a href="/" className="text-sm text-recco-gray-500 hover:text-blue-700">Back to portals</a>
                </div>
            </div>
        </div>
    );
}
