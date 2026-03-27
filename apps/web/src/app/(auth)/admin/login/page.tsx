"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OtpPinInput } from "@/components/shared/otp-pin-input";
import {
    validateAdminEmail,
    verifyAdminPassword,
} from "./actions";

// ─── Types ──────────────────────────────────────────────────────────

type LoginStep = "email" | "password" | "otp" | "lockout";

// ─── Lockout Countdown Component ────────────────────────────────────

function LockoutScreen({ minutes }: { minutes: number }) {
    const [remaining, setRemaining] = React.useState(minutes * 60);

    React.useEffect(() => {
        const timer = setInterval(() => {
            setRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    window.location.reload();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;

    return (
        <div className="flex flex-col items-center gap-6 py-8">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            </div>
            <h2 className="text-xl font-bold text-red-700">Account Locked</h2>
            <p className="text-recco-gray-600 text-center max-w-sm">
                Too many failed login attempts. Your account has been temporarily locked for security.
            </p>
            <div className="text-3xl font-mono font-bold text-red-600 tabular-nums">
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </div>
            <p className="text-sm text-recco-gray-500">Time until unlock</p>
        </div>
    );
}

// ─── Main Admin Login Component ─────────────────────────────────────

export default function AdminLoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<LoginStep>("email");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [lockoutMinutes, setLockoutMinutes] = useState(0);

    // ── Step 1: Email Validation ────────────────────────────────────
    const handleEmailSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            setError(null);
            setLoading(true);

            const result = await validateAdminEmail(email);
            setLoading(false);

            if (result.success) {
                setStep("password");
            } else if (result.step === "lockout") {
                setLockoutMinutes(result.lockoutMinutes || 60);
                setStep("lockout");
            } else {
                setError(result.error || "Invalid email");
            }
        },
        [email]
    );

    // ── Step 2: Password Verification ───────────────────────────────
    const handlePasswordSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            setError(null);
            setLoading(true);

            const result = await verifyAdminPassword(email, password);
            setLoading(false);

            if (result.success) {
                setStep("otp");
            } else if (result.step === "lockout") {
                setLockoutMinutes(result.lockoutMinutes || 60);
                setStep("lockout");
            } else {
                setError(result.error || "Invalid password");
            }
        },
        [email, password]
    );

    // ── Step 3: OTP Verification (via local API route to bypass ISP block) ──
    const handleOtpComplete = useCallback(
        async (otp: string) => {
            setError(null);
            setLoading(true);

            try {
                const res = await fetch("/api/admin/verify-otp", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, otp }),
                });

                const data = await res.json();

                if (!res.ok || !data.success) {
                    setLoading(false);
                    setError(data.error || "Invalid or expired OTP. Please try again.");
                    return;
                }

                // Auth cookies are set via Set-Cookie headers from the API response.
                // Hard redirect so the browser sends them with the next request.
                window.location.href = "/admin/dashboard";
            } catch (err: any) {
                setLoading(false);
                setError("Network error. Please try again.");
            }
        },
        [email]
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-recco-gray-50 via-white to-recco-green-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-recco-navy-900 flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-recco-gray-900">RECCO Admin</h1>
                    <p className="text-recco-gray-500 mt-1">Platform Governance & Control</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-recco-gray-200 p-8">
                    {/* Lockout Screen */}
                    {step === "lockout" && <LockoutScreen minutes={lockoutMinutes} />}

                    {/* Step 1: Email */}
                    {step === "email" && (
                        <form onSubmit={handleEmailSubmit} className="space-y-5">
                            <div>
                                <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">
                                    Step 1 of 3
                                </h2>
                                <p className="text-sm text-recco-gray-500">
                                    Enter your admin email address
                                </p>
                            </div>
                            <div>
                                <label htmlFor="admin-email" className="block text-sm font-medium text-recco-gray-700 mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    id="admin-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@recco.in"
                                    required
                                    autoFocus
                                    disabled={loading}
                                    className="w-full px-4 py-3 border-2 border-recco-gray-200 rounded-xl text-recco-gray-900 placeholder-recco-gray-400 focus:outline-none focus:border-recco-green-500 focus:ring-2 focus:ring-recco-green-100 transition-all disabled:opacity-50"
                                />
                            </div>
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="w-full py-3 px-4 bg-recco-navy-900 text-white font-semibold rounded-xl hover:bg-recco-navy-800 focus:outline-none focus:ring-2 focus:ring-recco-navy-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Checking..." : "Continue"}
                            </button>
                        </form>
                    )}

                    {/* Step 2: Password */}
                    {step === "password" && (
                        <form onSubmit={handlePasswordSubmit} className="space-y-5">
                            <div>
                                <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">
                                    Step 2 of 3
                                </h2>
                                <p className="text-sm text-recco-gray-500">
                                    Enter your password for <strong>{email}</strong>
                                </p>
                            </div>
                            <div>
                                <label htmlFor="admin-password" className="block text-sm font-medium text-recco-gray-700 mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="admin-password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        required
                                        autoFocus
                                        disabled={loading}
                                        className="w-full px-4 py-3 pr-12 border-2 border-recco-gray-200 rounded-xl text-recco-gray-900 placeholder-recco-gray-400 focus:outline-none focus:border-recco-green-500 focus:ring-2 focus:ring-recco-green-100 transition-all disabled:opacity-50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-recco-gray-400 hover:text-recco-gray-600"
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setStep("email"); setError(null); setPassword(""); }}
                                    className="px-4 py-3 text-recco-gray-600 font-medium rounded-xl border-2 border-recco-gray-200 hover:bg-recco-gray-50 transition-all"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !password}
                                    className="flex-1 py-3 px-4 bg-recco-navy-900 text-white font-semibold rounded-xl hover:bg-recco-navy-800 focus:outline-none focus:ring-2 focus:ring-recco-navy-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? "Verifying..." : "Continue"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Step 3: OTP */}
                    {step === "otp" && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">
                                    Step 3 of 3
                                </h2>
                                <p className="text-sm text-recco-gray-500">
                                    Enter the 6-digit code sent to <strong>{email}</strong>
                                </p>
                            </div>
                            <OtpPinInput
                                length={6}
                                onComplete={handleOtpComplete}
                                error={error || undefined}
                                disabled={loading}
                                label="Verification Code"
                                isOtp={true}
                            />
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setStep("password"); setError(null); }}
                                    className="px-4 py-3 text-recco-gray-600 font-medium rounded-xl border-2 border-recco-gray-200 hover:bg-recco-gray-50 transition-all"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        // Resend OTP
                                        verifyAdminPassword(email, password);
                                    }}
                                    disabled={loading}
                                    className="flex-1 py-3 px-4 text-recco-green-700 font-medium rounded-xl border-2 border-recco-green-200 hover:bg-recco-green-50 transition-all disabled:opacity-50"
                                >
                                    Resend Code
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-6">
                    <a href="/" className="text-sm text-recco-gray-500 hover:text-recco-green-700 transition-colors">
                        ← Back to portals
                    </a>
                </div>
            </div>
        </div>
    );
}
