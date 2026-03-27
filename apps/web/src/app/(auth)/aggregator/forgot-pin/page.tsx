"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OtpPinInput } from "@/components/shared/otp-pin-input";
import {
    sendAggregatorOtp,
    resetAggregatorPin,
} from "../login/actions";

type ForgotStep = "email" | "otp" | "newpin" | "success";

export default function AggregatorForgotPinPage() {
    const router = useRouter();
    const [step, setStep] = useState<ForgotStep>("email");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPin, setNewPin] = useState("");

    const inputCls = "w-full px-4 py-3 border-2 border-recco-gray-200 rounded-xl text-recco-gray-900 placeholder-recco-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all disabled:opacity-50";
    const labelCls = "block text-sm font-medium text-recco-gray-700 mb-1.5";
    const btnPrimary = "w-full py-3 px-4 bg-amber-700 text-white font-semibold rounded-xl hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all disabled:opacity-50";

    // Step 1: Send OTP to email
    const handleSendOtp = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const result = await sendAggregatorOtp(email);
        setLoading(false);
        if (result.success) setStep("otp");
        else setError(result.error || "Failed to send OTP.");
    }, [email]);

    // Step 2: Verify OTP
    const handleOtpComplete = useCallback(async (code: string) => {
        setOtp(code);
        setStep("newpin");
    }, []);

    // Step 3: Set new PIN
    const handleNewPinComplete = useCallback(async (pin: string) => {
        setNewPin(pin);
        setError(null);
        setLoading(true);
        const result = await resetAggregatorPin(email, otp || pin.slice(0, 0), pin);
        setLoading(false);
        if (result.success) setStep("success");
        else setError(result.error || "PIN reset failed.");
    }, [email, otp]);

    // Fix: We need the OTP stored properly
    const handleSetNewPin = useCallback(async (pin: string) => {
        setError(null);
        setLoading(true);
        const result = await resetAggregatorPin(email, otp, pin);
        setLoading(false);
        if (result.success) setStep("success");
        else setError(result.error || "PIN reset failed.");
    }, [email, otp]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-recco-gray-50 via-white to-amber-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-700 flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-recco-gray-900">Reset Your PIN</h1>
                    <p className="text-recco-gray-500 mt-1">Aggregator Portal</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-recco-gray-200 p-8">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">{error}</div>
                    )}

                    {/* Email Step */}
                    {step === "email" && (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div>
                                <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">Enter Your Email</h2>
                                <p className="text-sm text-recco-gray-500">We{"'"}ll send you a verification code to reset your PIN.</p>
                            </div>
                            <div>
                                <label htmlFor="forgot-email" className={labelCls}>Registered Email</label>
                                <input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus disabled={loading} className={inputCls} />
                            </div>
                            <button type="submit" disabled={loading || !email} className={btnPrimary}>
                                {loading ? "Sending OTP..." : "Send Verification Code"}
                            </button>
                        </form>
                    )}

                    {/* OTP Step */}
                    {step === "otp" && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">Verify Identity</h2>
                                <p className="text-sm text-recco-gray-500">Enter the 6-digit code sent to <strong>{email}</strong></p>
                            </div>
                            <OtpPinInput
                                length={6}
                                onComplete={(code) => {
                                    setOtp(code);
                                    setStep("newpin");
                                }}
                                error={error || undefined}
                                disabled={loading}
                                label="Verification Code"
                                isOtp
                            />
                            <button onClick={() => setStep("email")} className="w-full py-3 text-recco-gray-600 font-medium rounded-xl border-2 border-recco-gray-200 hover:bg-recco-gray-50 transition-all">
                                Back
                            </button>
                        </div>
                    )}

                    {/* New PIN Step */}
                    {step === "newpin" && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">Set New PIN</h2>
                                <p className="text-sm text-recco-gray-500">Choose a new 4-digit PIN for your account.</p>
                            </div>
                            <OtpPinInput
                                length={4}
                                onComplete={handleSetNewPin}
                                error={error || undefined}
                                disabled={loading}
                                label="New 4-Digit PIN"
                            />
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700">
                                <strong>Security note:</strong> All existing sessions will be signed out when your PIN is reset.
                            </div>
                        </div>
                    )}

                    {/* Success */}
                    {step === "success" && (
                        <div className="text-center space-y-4 py-4">
                            <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-semibold text-recco-gray-800">PIN Reset Successful!</h2>
                            <p className="text-sm text-recco-gray-500">Your new PIN has been set. All previous sessions have been signed out.</p>
                            <button onClick={() => router.push("/aggregator/login")} className={btnPrimary}>
                                Go to Login
                            </button>
                        </div>
                    )}
                </div>

                <div className="text-center mt-6">
                    <a href="/aggregator/login" className="text-sm text-amber-700 hover:text-amber-800 font-medium">
                        ← Back to Login
                    </a>
                </div>
            </div>
        </div>
    );
}
