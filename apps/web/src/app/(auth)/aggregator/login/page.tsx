"use client";

import React, { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OtpPinInput } from "@/components/shared/otp-pin-input";
import { verifyAggregatorPin, sendAggregatorOtp } from "./actions";

type View = "login" | "forgot-pin" | "lockout";

function LockoutScreen({ minutes }: { minutes: number }) {
    const [remaining, setRemaining] = React.useState(minutes * 60);

    React.useEffect(() => {
        const timer = setInterval(() => {
            setRemaining((prev) => {
                if (prev <= 1) { clearInterval(timer); window.location.reload(); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;

    return (
        <div className="flex flex-col items-center gap-6 py-8">
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            </div>
            <h2 className="text-xl font-bold text-orange-700">PIN Locked</h2>
            <p className="text-recco-gray-600 text-center max-w-sm">
                Too many incorrect PIN attempts. Please wait before trying again.
            </p>
            <div className="text-3xl font-mono font-bold text-orange-600 tabular-nums">
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </div>
        </div>
    );
}

export default function AggregatorLoginPage() {
    const router = useRouter();
    const [view, setView] = useState<View>("login");
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [lockoutMinutes, setLockoutMinutes] = useState(0);

    const handlePinComplete = useCallback(
        async (pin: string) => {
            if (!email) { setError("Please enter your email or User ID first."); return; }
            setError(null);
            setLoading(true);

            const result = await verifyAggregatorPin(email, pin);
            setLoading(false);

            if (result.success) {
                router.push("/aggregator/dashboard");
            } else if (result.step === "lockout") {
                setLockoutMinutes(result.lockoutMinutes || 30);
                setView("lockout");
            } else {
                setError(result.error || "Invalid PIN");
            }
        },
        [email, router]
    );

    const handleForgotPin = useCallback(async () => {
        if (!email) { setError("Please enter your email first."); return; }
        setLoading(true);
        const result = await sendAggregatorOtp(email);
        setLoading(false);
        if (result.success) {
            router.push(`/aggregator/forgot-pin?email=${encodeURIComponent(email)}`);
        } else {
            setError(result.error || "Failed to send OTP");
        }
    }, [email, router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-recco-gray-50 via-white to-recco-green-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-recco-green-700 flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-recco-gray-900">Aggregator Login</h1>
                    <p className="text-recco-gray-500 mt-1">Waste Collector — Track collections & create batches</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-recco-gray-200 p-8">
                    {view === "lockout" && <LockoutScreen minutes={lockoutMinutes} />}

                    {view === "login" && (
                        <div className="space-y-5">
                            <div>
                                <label htmlFor="agg-email" className="block text-sm font-medium text-recco-gray-700 mb-1.5">
                                    Email or User ID
                                </label>
                                <input
                                    id="agg-email"
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="email@example.com or AGG-XXXXX-XXXXXX"
                                    autoFocus
                                    disabled={loading}
                                    className="w-full px-4 py-3 border-2 border-recco-gray-200 rounded-xl text-recco-gray-900 placeholder-recco-gray-400 focus:outline-none focus:border-recco-green-500 focus:ring-2 focus:ring-recco-green-100 transition-all disabled:opacity-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-recco-gray-700 mb-3">
                                    Enter 4-digit PIN
                                </label>
                                <OtpPinInput
                                    length={4}
                                    onComplete={handlePinComplete}
                                    error={error || undefined}
                                    disabled={loading || !email}
                                    isOtp={false}
                                />
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <button
                                    onClick={handleForgotPin}
                                    disabled={loading}
                                    className="text-sm text-recco-green-700 hover:text-recco-green-800 font-medium transition-colors"
                                >
                                    Forgot PIN?
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-6 space-x-3">
                    <span className="text-sm text-recco-gray-500">
                        Don&apos;t have an account?
                    </span>
                    <a href="/aggregator/register" className="text-sm text-recco-green-700 hover:text-recco-green-800 font-medium transition-colors">
                        Register
                    </a>
                    <span className="text-sm text-recco-gray-400">·</span>
                    <a href="/" className="text-sm text-recco-gray-500 hover:text-recco-green-700 transition-colors">
                        Back to portals
                    </a>
                </div>
            </div>
        </div>
    );
}
