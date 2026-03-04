"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { proLogin } from "./actions";

export default function ProLoginPage() {
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
        const result = await proLogin(email, password);
        if (result.success) {
            router.push("/pro/dashboard");
        } else {
            setError(result.error || "Login failed");
        }
        setLoading(false);
    }, [email, password, router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-recco-gray-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-700 flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-recco-gray-900">PRO Login</h1>
                    <p className="text-recco-gray-500 mt-1">Producer Responsibility Organisation Portal</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-recco-gray-200 p-8">
                    <form onSubmit={handleLoginSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="pro-email" className="block text-sm font-medium text-recco-gray-700 mb-1.5">Email</label>
                            <input id="pro-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@pro-org.com" required autoFocus disabled={loading} className="w-full px-4 py-3 border-2 border-recco-gray-200 rounded-xl text-recco-gray-900 placeholder-recco-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all disabled:opacity-50" />
                        </div>
                        <div>
                            <label htmlFor="pro-password" className="block text-sm font-medium text-recco-gray-700 mb-1.5">Password</label>
                            <div className="relative">
                                <input id="pro-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required disabled={loading} className="w-full px-4 py-3 pr-12 border-2 border-recco-gray-200 rounded-xl text-recco-gray-900 placeholder-recco-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all disabled:opacity-50" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-recco-gray-400 hover:text-recco-gray-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} /></svg>
                                </button>
                            </div>
                        </div>
                        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
                        <button type="submit" disabled={loading || !email || !password} className="w-full py-3 px-4 bg-purple-700 text-white font-semibold rounded-xl hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50">
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-6 space-x-3">
                    <span className="text-sm text-recco-gray-500">New PRO?</span>
                    <a href="/pro/register" className="text-sm text-purple-700 hover:text-purple-800 font-medium">Register</a>
                    <span className="text-sm text-recco-gray-400">·</span>
                    <a href="/" className="text-sm text-recco-gray-500 hover:text-purple-700">Back to portals</a>
                </div>
            </div>
        </div>
    );
}
