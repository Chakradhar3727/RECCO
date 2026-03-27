"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OtpPinInput } from "@/components/shared/otp-pin-input";
import {
    piboRegisterSendOtp,
    verifyPiboRegistrationOtp,
    piboRegisterStep2,
    piboRegisterSubmit,
} from "../login/actions";

type Step = 1 | 2 | 3 | 4 | 5;
type PiboType = "producer" | "importer" | "brand_owner";

const STEP_LABELS = ["Account", "Company & Type", "GST & Docs", "Review", "Submit"];

const PIBO_TYPE_INFO: Record<PiboType, { label: string; icon: string; docs: string[] }> = {
    producer: {
        label: "Producer",
        icon: "🏭",
        docs: ["GST Registration Certificate", "IEC (Import Export Code) — if applicable", "Board Resolution Letter"],
    },
    importer: {
        label: "Importer",
        icon: "📦",
        docs: ["GST Registration Certificate", "IEC (Import Export Code)", "Customs License", "Import Documentation"],
    },
    brand_owner: {
        label: "Brand Owner",
        icon: "🏷️",
        docs: ["GST Registration Certificate", "Brand Registration Certificate", "Trademark Certificate"],
    },
};

function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center justify-center gap-1 mb-8">
            {Array.from({ length: total }, (_, i) => (
                <React.Fragment key={i}>
                    <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i + 1 < current ? "bg-recco-amber-600 text-white" :
                            i + 1 === current ? "bg-recco-amber-700 text-white ring-4 ring-recco-amber-100" :
                                "bg-recco-gray-200 text-recco-gray-500"
                            }`}>
                            {i + 1 < current ? "✓" : i + 1}
                        </div>
                        <span className={`text-[10px] mt-1 ${i + 1 === current ? "text-recco-amber-700 font-semibold" : "text-recco-gray-400"}`}>
                            {STEP_LABELS[i]}
                        </span>
                    </div>
                    {i < total - 1 && (
                        <div className={`w-8 h-0.5 mt-[-12px] ${i + 1 < current ? "bg-recco-amber-500" : "bg-recco-gray-200"}`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

export default function PiboRegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [showOtp, setShowOtp] = useState(false);
    const [generatedId, setGeneratedId] = useState<string | null>(null);

    // Step 1
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Step 2
    const [companyName, setCompanyName] = useState("");
    const [piboType, setPiboType] = useState<PiboType | null>(null);

    // Step 3
    const [gstNumber, setGstNumber] = useState("");

    const inputCls = "w-full px-4 py-3 border-2 border-recco-gray-200 rounded-xl text-recco-gray-900 placeholder-recco-gray-400 focus:outline-none focus:border-recco-amber-500 focus:ring-2 focus:ring-recco-amber-100 transition-all disabled:opacity-50";
    const labelCls = "block text-sm font-medium text-recco-gray-700 mb-1.5";
    const btnPrimary = "w-full py-3 px-4 bg-recco-amber-700 text-white font-semibold rounded-xl hover:bg-recco-amber-800 focus:outline-none focus:ring-2 focus:ring-recco-amber-500 focus:ring-offset-2 transition-all disabled:opacity-50";
    const btnSecondary = "w-full py-3 text-recco-gray-600 font-medium rounded-xl border-2 border-recco-gray-200 hover:bg-recco-gray-50 transition-all";
    const btnSkip = "w-full py-2.5 text-recco-amber-700 font-medium rounded-xl border-2 border-dashed border-recco-amber-300 hover:bg-recco-amber-50 transition-all text-sm";

    // Get userId from session
    useEffect(() => {
        if (step >= 2 && !userId) {
            import("@/lib/supabase/client").then(({ createClient }) => {
                const supabase = createClient();
                supabase.auth.getUser().then(({ data }) => {
                    if (data.user) setUserId(data.user.id);
                });
            });
        }
    }, [step, userId]);

    // Step 1 handlers — OTP-only registration
    const handleStep1Submit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) { setError("Passwords do not match."); return; }
        if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
        setError(null);
        setLoading(true);
        const result = await piboRegisterSendOtp(email);
        setLoading(false);
        if (result.success) setShowOtp(true);
        else setError(result.error || "Registration failed.");
    }, [email, password, confirmPassword]);

    const handleOtpComplete = useCallback(async (otp: string) => {
        setError(null);
        setLoading(true);
        const result = await verifyPiboRegistrationOtp(email, otp, password);
        setLoading(false);
        if (result.success) {
            if (result.userId) setUserId(result.userId);
            setShowOtp(false);
            setStep(2);
        }
        else setError(result.error || "Invalid OTP.");
    }, [email, password]);

    // Step 2: Company + Type
    const handleStep2Submit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || !piboType) { setError("Please select a PIBO type."); return; }
        setError(null);
        setLoading(true);
        const result = await piboRegisterStep2(userId, companyName, piboType);
        setLoading(false);
        if (result.success) {
            if (result.userId) setGeneratedId(result.userId);
            setStep(3);
        } else setError(result.error || "Failed to save.");
    }, [userId, companyName, piboType]);

    // Step 3: GST + Docs (proceed to review)
    const handleStep3Next = useCallback(() => {
        setStep(4);
    }, []);

    // Step 5: Submit
    const handleFinalSubmit = useCallback(async () => {
        if (!userId) return;
        setError(null);
        setLoading(true);
        const result = await piboRegisterSubmit(userId);
        setLoading(false);
        if (result.success) router.push("/pibo/login?registered=true");
        else setError(result.error || "Submission failed.");
    }, [userId, router]);

    // Skip all remaining steps and submit directly
    const handleSkipToSubmit = useCallback(async () => {
        if (!userId) return;
        setError(null);
        setLoading(true);
        const result = await piboRegisterSubmit(userId);
        setLoading(false);
        if (result.success) router.push("/pibo/login?registered=true");
        else setError(result.error || "Submission failed.");
    }, [userId, router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-recco-gray-50 via-white to-recco-amber-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-recco-amber-700 flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-recco-gray-900">PIBO Registration</h1>
                    <p className="text-recco-gray-500 mt-1">Producer / Importer / Brand Owner</p>
                </div>

                <StepIndicator current={step} total={5} />

                <div className="bg-white rounded-2xl shadow-xl border border-recco-gray-200 p-8">
                    {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">{error}</div>}

                    {/* STEP 1: Account */}
                    {step === 1 && !showOtp && (
                        <form onSubmit={handleStep1Submit} className="space-y-4">
                            <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">Create Account</h2>
                            <div>
                                <label className={labelCls}>Email</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@brand.com" required autoFocus disabled={loading} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Password</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" required disabled={loading} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Confirm Password</label>
                                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required disabled={loading} className={inputCls} />
                            </div>
                            <button type="submit" disabled={loading || !email || !password} className={btnPrimary}>
                                {loading ? "Creating Account..." : "Create Account & Get OTP"}
                            </button>
                        </form>
                    )}
                    {step === 1 && showOtp && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">Verify Email</h2>
                                <p className="text-sm text-recco-gray-500">Enter the 6-digit code sent to <strong>{email}</strong></p>
                            </div>
                            <OtpPinInput length={6} onComplete={handleOtpComplete} error={error || undefined} disabled={loading} label="Verification Code" isOtp />
                            <button onClick={() => setShowOtp(false)} className={btnSecondary}>Back</button>
                        </div>
                    )}

                    {/* STEP 2: Company & Type */}
                    {step === 2 && (
                        <form onSubmit={handleStep2Submit} className="space-y-4">
                            <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">Company & Entity Type</h2>
                            <div>
                                <label className={labelCls}>Company Name</label>
                                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your company or brand name" required disabled={loading} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>PIBO Type</label>
                                <div className="grid grid-cols-1 gap-2 mt-2">
                                    {(Object.keys(PIBO_TYPE_INFO) as PiboType[]).map((type) => (
                                        <button key={type} type="button" onClick={() => setPiboType(type)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${piboType === type
                                                ? "border-recco-amber-500 bg-recco-amber-50 ring-2 ring-recco-amber-100"
                                                : "border-recco-gray-200 hover:border-recco-amber-500"
                                                }`}>
                                            <span className="text-2xl">{PIBO_TYPE_INFO[type].icon}</span>
                                            <div>
                                                <p className="text-sm font-semibold text-recco-gray-800">{PIBO_TYPE_INFO[type].label}</p>
                                                <p className="text-xs text-recco-gray-500">{PIBO_TYPE_INFO[type].docs.length} documents required</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setStep(1)} className={btnSecondary}>Back</button>
                                <button type="submit" disabled={loading || !companyName || !piboType} className={btnPrimary}>
                                    {loading ? "Saving..." : "Next: Documents"}
                                </button>
                            </div>
                            <button type="button" onClick={handleSkipToSubmit} disabled={loading} className={btnSkip}>
                                ⏭ Skip all & Complete Registration
                            </button>
                        </form>
                    )}

                    {/* STEP 3: GST & Documents */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">GST & Documents</h2>
                            {generatedId && (
                                <div className="bg-recco-amber-50 border border-recco-amber-100 rounded-lg p-3 text-sm text-recco-amber-700">
                                    <strong>Your PIBO User ID:</strong> {generatedId}
                                </div>
                            )}
                            <div>
                                <label className={labelCls}>GST Number</label>
                                <input type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value.toUpperCase())} placeholder="e.g. 27AADCB2230M1Z3" disabled={loading} className={inputCls} />
                            </div>
                            {piboType && (
                                <div>
                                    <label className={labelCls}>Required Documents ({PIBO_TYPE_INFO[piboType].label})</label>
                                    <div className="space-y-2 mt-2">
                                        {PIBO_TYPE_INFO[piboType].docs.map((doc, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-recco-gray-200">
                                                <svg className="w-5 h-5 text-recco-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                                <div className="flex-1">
                                                    <p className="text-sm text-recco-gray-700 font-medium">{doc}</p>
                                                    <p className="text-xs text-recco-gray-400">PDF, JPG, PNG up to 10 MB</p>
                                                </div>
                                                <label className="px-3 py-1.5 bg-recco-gray-100 text-recco-gray-600 text-xs font-medium rounded-lg cursor-pointer hover:bg-recco-gray-200 transition-colors">
                                                    Upload
                                                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-recco-gray-400 mt-2 text-center">Documents can be uploaded later. You may skip for now.</p>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setStep(2)} className={btnSecondary}>Back</button>
                                <button type="button" onClick={handleStep3Next} className={btnPrimary}>Next: Review</button>
                            </div>
                            <button type="button" onClick={handleSkipToSubmit} disabled={loading} className={btnSkip}>
                                ⏭ Skip all & Complete Registration
                            </button>
                        </div>
                    )}

                    {/* STEP 4: Review */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">Review Details</h2>
                            <div className="divide-y divide-recco-gray-100">
                                <div className="py-3">
                                    <p className="text-xs font-semibold text-recco-gray-400 uppercase tracking-wider">Account</p>
                                    <p className="text-sm text-recco-gray-800 mt-0.5">{email}</p>
                                </div>
                                <div className="py-3">
                                    <p className="text-xs font-semibold text-recco-gray-400 uppercase tracking-wider">Company</p>
                                    <p className="text-sm text-recco-gray-800 mt-0.5">{companyName}</p>
                                    <p className="text-sm text-recco-gray-600">Type: {piboType && PIBO_TYPE_INFO[piboType].label}</p>
                                    {generatedId && <p className="text-xs text-recco-amber-600 font-mono">ID: {generatedId}</p>}
                                </div>
                                {gstNumber && (
                                    <div className="py-3">
                                        <p className="text-xs font-semibold text-recco-gray-400 uppercase tracking-wider">GST</p>
                                        <p className="text-sm text-recco-gray-800 mt-0.5 font-mono">{gstNumber}</p>
                                    </div>
                                )}
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                                <strong>Note:</strong> Your registration will be reviewed by an admin. You{"'"}ll be notified once approved.
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setStep(3)} className={btnSecondary}>Back</button>
                                <button onClick={handleFinalSubmit} disabled={loading} className={btnPrimary}>
                                    {loading ? "Submitting..." : "Submit for Approval"}
                                </button>
                            </div>
                            <button type="button" onClick={handleSkipToSubmit} disabled={loading} className={btnSkip}>
                                ⏭ Skip Review & Complete Registration
                            </button>
                        </div>
                    )}
                </div>

                <div className="text-center mt-6 space-x-3">
                    <span className="text-sm text-recco-gray-500">Already registered?</span>
                    <a href="/pibo/login" className="text-sm text-recco-amber-700 hover:text-recco-amber-800 font-medium">Sign In</a>
                    <span className="text-sm text-recco-gray-400">·</span>
                    <a href="/" className="text-sm text-recco-gray-500 hover:text-recco-amber-700">Back to portals</a>
                </div>
            </div>
        </div>
    );
}
