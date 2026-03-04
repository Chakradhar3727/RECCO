"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OtpPinInput } from "@/components/shared/otp-pin-input";
import {
    sendAggregatorOtp,
    verifyAggregatorOtp,
    completeAggregatorRegistration,
} from "../login/actions";

type Step = "email" | "otp" | "details" | "success";

export default function AggregatorRegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [generatedUserId, setGeneratedUserId] = useState("");

    // ── Step 1: Email → Send OTP ────────────────────────────────────
    const handleEmailSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            const result = await sendAggregatorOtp(email);
            setLoading(false);
            if (result.success) setStep("otp");
            else setError(result.error || "Failed to send OTP");
        },
        [email]
    );

    // ── Step 2: Verify OTP ──────────────────────────────────────────
    const handleOtpComplete = useCallback(
        async (otp: string) => {
            setError(null);
            setLoading(true);
            const result = await verifyAggregatorOtp(email, otp);
            setLoading(false);
            if (result.success) setStep("details");
            else setError(result.error || "Invalid OTP");
        },
        [email]
    );

    // ── Step 3: Name + PIN → Complete Registration ──────────────────
    const handlePinComplete = useCallback(
        async (pin: string) => {
            if (!name.trim()) { setError("Please enter your name."); return; }
            setError(null);
            setLoading(true);
            const result = await completeAggregatorRegistration(email, name, pin);
            setLoading(false);
            if (result.success) {
                setGeneratedUserId(result.userId || "");
                setStep("success");
            } else {
                setError(result.error || "Registration failed");
            }
        },
        [email, name]
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-recco-gray-50 via-white to-recco-green-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-recco-green-700 flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-recco-gray-900">Aggregator Registration</h1>
                    <p className="text-recco-gray-500 mt-1">Create your waste collector account</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-recco-gray-200 p-8">
                    {/* Progress indicator */}
                    {step !== "success" && (
                        <div className="flex mb-6 gap-1">
                            {["email", "otp", "details"].map((s, i) => (
                                <div
                                    key={s}
                                    className={`h-1.5 flex-1 rounded-full transition-all ${["email", "otp", "details"].indexOf(step) >= i
                                        ? "bg-recco-green-500"
                                        : "bg-recco-gray-200"
                                        }`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Step 1: Email */}
                    {step === "email" && (
                        <form onSubmit={handleEmailSubmit} className="space-y-5">
                            <div>
                                <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">Step 1 of 3</h2>
                                <p className="text-sm text-recco-gray-500">Enter your email to receive a verification code</p>
                            </div>
                            <div>
                                <label htmlFor="reg-email" className="block text-sm font-medium text-recco-gray-700 mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    id="reg-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    required
                                    autoFocus
                                    disabled={loading}
                                    className="w-full px-4 py-3 border-2 border-recco-gray-200 rounded-xl text-recco-gray-900 placeholder-recco-gray-400 focus:outline-none focus:border-recco-green-500 focus:ring-2 focus:ring-recco-green-100 transition-all disabled:opacity-50"
                                />
                            </div>
                            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="w-full py-3 px-4 bg-recco-green-700 text-white font-semibold rounded-xl hover:bg-recco-green-800 focus:outline-none focus:ring-2 focus:ring-recco-green-500 focus:ring-offset-2 transition-all disabled:opacity-50"
                            >
                                {loading ? "Sending OTP..." : "Send Verification Code"}
                            </button>
                        </form>
                    )}

                    {/* Step 2: OTP */}
                    {step === "otp" && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">Step 2 of 3</h2>
                                <p className="text-sm text-recco-gray-500">Enter the 8-digit code sent to <strong>{email}</strong></p>
                            </div>
                            <OtpPinInput
                                length={8}
                                onComplete={handleOtpComplete}
                                error={error || undefined}
                                disabled={loading}
                                label="Verification Code"
                                isOtp={true}
                            />
                            <button
                                onClick={() => { setStep("email"); setError(null); }}
                                className="w-full py-3 text-recco-gray-600 font-medium rounded-xl border-2 border-recco-gray-200 hover:bg-recco-gray-50 transition-all"
                            >
                                Back
                            </button>
                        </div>
                    )}

                    {/* Step 3: Name + PIN */}
                    {step === "details" && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">Step 3 of 3</h2>
                                <p className="text-sm text-recco-gray-500">Set your name and 4-digit PIN</p>
                            </div>
                            <div>
                                <label htmlFor="reg-name" className="block text-sm font-medium text-recco-gray-700 mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    id="reg-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your full name"
                                    required
                                    autoFocus
                                    disabled={loading}
                                    className="w-full px-4 py-3 border-2 border-recco-gray-200 rounded-xl text-recco-gray-900 placeholder-recco-gray-400 focus:outline-none focus:border-recco-green-500 focus:ring-2 focus:ring-recco-green-100 transition-all disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-recco-gray-700 mb-3">
                                    Create 4-digit PIN
                                </label>
                                <OtpPinInput
                                    length={4}
                                    onComplete={handlePinComplete}
                                    error={error || undefined}
                                    disabled={loading || !name.trim()}
                                    isOtp={false}
                                    label=""
                                />
                            </div>
                            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
                        </div>
                    )}

                    {/* Success */}
                    {step === "success" && (
                        <div className="flex flex-col items-center gap-5 py-6">
                            <div className="w-20 h-20 rounded-full bg-recco-green-100 flex items-center justify-center">
                                <svg className="w-10 h-10 text-recco-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-recco-green-700">Registration Complete!</h2>
                            <div className="bg-recco-green-50 border border-recco-green-200 rounded-xl p-4 text-center w-full">
                                <p className="text-sm text-recco-gray-600 mb-1">Your User ID</p>
                                <p className="text-2xl font-mono font-bold text-recco-green-700">{generatedUserId}</p>
                                <p className="text-xs text-recco-gray-500 mt-2">Save this ID — you&apos;ll use it to log in</p>
                            </div>
                            <button
                                onClick={() => router.push("/aggregator/dashboard")}
                                className="w-full py-3 px-4 bg-recco-green-700 text-white font-semibold rounded-xl hover:bg-recco-green-800 transition-all"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-6 space-x-3">
                    <span className="text-sm text-recco-gray-500">Already have an account?</span>
                    <a href="/aggregator/login" className="text-sm text-recco-green-700 hover:text-recco-green-800 font-medium">
                        Log in
                    </a>
                    <span className="text-sm text-recco-gray-400">·</span>
                    <a href="/" className="text-sm text-recco-gray-500 hover:text-recco-green-700">Back to portals</a>
                </div>
            </div>
        </div>
    );
}
