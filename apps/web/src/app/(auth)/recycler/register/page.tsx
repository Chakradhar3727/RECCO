"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OtpPinInput } from "@/components/shared/otp-pin-input";
import {
    recyclerRegisterSendOtp,
    verifyRecyclerRegistrationOtp,
    recyclerRegisterStep2,
    recyclerRegisterStep3,
    recyclerRegisterStep5,
    recyclerRegisterStep6,
} from "../login/actions";

// ─── CPCB/SPCB/EPR Regex Validators (Patch 11) ──────────────────────
const CPCB_REGEX = /^[A-Z]{2,5}-\d{2,6}(-\d{2,6})?$/i;
const SPCB_REGEX = /^[A-Z]{2,8}\/\d{2,8}(\/\d{2,4})?$/i;
const EPR_REGEX = /^EPR-[A-Z0-9]{2,10}(-[A-Z0-9]+)?$/i;

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_LABELS = [
    "Account",
    "Regulatory",
    "Facility",
    "Documents",
    "Bank Details",
    "Review & Submit",
];

// ─── Step Indicator ──────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center justify-center gap-1 mb-8">
            {Array.from({ length: total }, (_, i) => (
                <React.Fragment key={i}>
                    <div className={`flex flex-col items-center`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i + 1 < current ? "bg-recco-teal-600 text-white" :
                            i + 1 === current ? "bg-recco-teal-700 text-white ring-4 ring-recco-teal-100" :
                                "bg-recco-gray-200 text-recco-gray-500"
                            }`}>
                            {i + 1 < current ? "✓" : i + 1}
                        </div>
                        <span className={`text-[10px] mt-1 ${i + 1 === current ? "text-recco-teal-700 font-semibold" : "text-recco-gray-400"}`}>
                            {STEP_LABELS[i]}
                        </span>
                    </div>
                    {i < total - 1 && (
                        <div className={`w-6 h-0.5 mt-[-12px] ${i + 1 < current ? "bg-recco-teal-500" : "bg-recco-gray-200"}`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

// ─── Regex Warning Component (Patch 11) ──────────────────────────────
function FormatWarning({ value, regex, label }: { value: string; regex: RegExp; label: string }) {
    if (!value || value.length < 3) return null;
    const isValid = regex.test(value);
    if (isValid) return null;
    return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mt-1 flex items-start gap-2">
            <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-xs text-yellow-700">
                <strong>{label}</strong> format may be incorrect. Expected format examples are shown in the placeholder. This is a warning only — you may proceed.
            </p>
        </div>
    );
}

export default function RecyclerRegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [showOtp, setShowOtp] = useState(false);

    // Step 1
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Step 2 — Regulatory
    const [cpcbNumber, setCpcbNumber] = useState("");
    const [spcbNumber, setSpcbNumber] = useState("");
    const [eprNumber, setEprNumber] = useState("");

    // Step 3 — Facility
    const [facilityName, setFacilityName] = useState("");
    const [facilityAddress, setFacilityAddress] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [capacityKg, setCapacityKg] = useState("");

    // Step 5 — Bank Details
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [ifscCode, setIfscCode] = useState("");
    const [accountHolder, setAccountHolder] = useState("");
    const [upiId, setUpiId] = useState("");

    // ─── Step 1: Account Creation (OTP-Only) ────────────────────────────
    const handleStep1Submit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        setError(null);
        setLoading(true);
        const result = await recyclerRegisterSendOtp(email);
        setLoading(false);
        if (result.success) {
            setShowOtp(true);
        } else {
            setError(result.error || "Registration failed.");
        }
    }, [email, password, confirmPassword]);

    const handleOtpComplete = useCallback(async (otp: string) => {
        setError(null);
        setLoading(true);
        const result = await verifyRecyclerRegistrationOtp(email, otp, password);
        setLoading(false);
        if (result.success) {
            if (result.userId) setUserId(result.userId);
            setShowOtp(false);
            setStep(2);
        } else {
            setError(result.error || "Invalid OTP.");
        }
    }, [email, password]);

    // ─── Step 2: Regulatory ──────────────────────────────────────────
    const handleStep2Submit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) { setError("Session expired. Please start over."); return; }
        setError(null);
        setLoading(true);
        const result = await recyclerRegisterStep2(userId, {
            cpcb_number: cpcbNumber || undefined,
            spcb_number: spcbNumber || undefined,
            epr_number: eprNumber || undefined,
            cpcb_format_warning: cpcbNumber ? !CPCB_REGEX.test(cpcbNumber) : false,
        });
        setLoading(false);
        if (result.success) setStep(3);
        else setError(result.error || "Failed to save.");
    }, [userId, cpcbNumber, spcbNumber, eprNumber]);

    // ─── Step 3: Facility ────────────────────────────────────────────
    const handleStep3Submit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        setError(null);
        setLoading(true);
        const result = await recyclerRegisterStep3(userId, {
            facility_name: facilityName,
            address: facilityAddress,
            latitude: parseFloat(latitude) || 0,
            longitude: parseFloat(longitude) || 0,
            processing_capacity_kg: parseFloat(capacityKg) || 0,
        });
        setLoading(false);
        if (result.success) setStep(4);
        else setError(result.error || "Failed to save.");
    }, [userId, facilityName, facilityAddress, latitude, longitude, capacityKg]);

    // ─── Step 4: Documents (placeholder upload) ──────────────────────
    const handleStep4Next = useCallback(() => {
        setStep(5);
    }, []);

    // ─── Step 5: Bank Details ────────────────────────────────────────
    const handleStep5Submit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        setError(null);
        setLoading(true);
        const result = await recyclerRegisterStep5(userId, {
            bank_name: bankName,
            account_number: accountNumber,
            ifsc_code: ifscCode,
            account_holder_name: accountHolder,
            upi_id: upiId || undefined,
        });
        setLoading(false);
        if (result.success) setStep(6);
        else setError(result.error || "Failed to save.");
    }, [userId, bankName, accountNumber, ifscCode, accountHolder, upiId]);

    // ─── Step 6: Review & Submit ─────────────────────────────────────
    const handleFinalSubmit = useCallback(async () => {
        if (!userId) return;
        setError(null);
        setLoading(true);
        const result = await recyclerRegisterStep6(userId);
        setLoading(false);
        if (result.success) {
            router.push("/recycler/login?registered=true");
        } else {
            setError(result.error || "Submission failed.");
        }
    }, [userId, router]);

    // ─── Get current GPS location ────────────────────────────────────
    const handleGetLocation = useCallback(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLatitude(pos.coords.latitude.toFixed(6));
                    setLongitude(pos.coords.longitude.toFixed(6));
                },
                () => setError("Could not get GPS location. Please enter manually.")
            );
        }
    }, []);

    // ─── Attempt to set userId from Supabase session on step 2+ ─────
    useEffect(() => {
        if (step >= 2 && !userId) {
            // Try to extract user ID from cookie/session
            import("@/lib/supabase/client").then(({ createClient }) => {
                const supabase = createClient();
                supabase.auth.getUser().then(({ data }) => {
                    if (data.user) setUserId(data.user.id);
                });
            });
        }
    }, [step, userId]);

    // ─── Shared Input Styles ─────────────────────────────────────────
    const inputCls = "w-full px-4 py-3 border-2 border-recco-gray-200 rounded-xl text-recco-gray-900 placeholder-recco-gray-400 focus:outline-none focus:border-recco-teal-500 focus:ring-2 focus:ring-recco-teal-100 transition-all disabled:opacity-50";
    const labelCls = "block text-sm font-medium text-recco-gray-700 mb-1.5";
    const btnPrimary = "w-full py-3 px-4 bg-recco-teal-700 text-white font-semibold rounded-xl hover:bg-recco-teal-800 focus:outline-none focus:ring-2 focus:ring-recco-teal-500 focus:ring-offset-2 transition-all disabled:opacity-50";
    const btnSecondary = "w-full py-3 text-recco-gray-600 font-medium rounded-xl border-2 border-recco-gray-200 hover:bg-recco-gray-50 transition-all";
    const btnSkip = "w-full py-2.5 text-recco-teal-700 font-medium rounded-xl border-2 border-dashed border-recco-teal-300 hover:bg-recco-teal-50 transition-all text-sm";

    // Skip all remaining steps and submit directly
    const handleSkipToSubmit = useCallback(async () => {
        if (!userId) return;
        setError(null);
        setLoading(true);
        const result = await recyclerRegisterStep6(userId);
        setLoading(false);
        if (result.success) router.push("/recycler/login?registered=true");
        else setError(result.error || "Submission failed.");
    }, [userId, router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-recco-gray-50 via-white to-recco-teal-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-recco-teal-700 flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-recco-gray-900">Register Your Facility</h1>
                    <p className="text-recco-gray-500 mt-1">Certified Recycler Registration</p>
                </div>

                <StepIndicator current={step} total={6} />

                <div className="bg-white rounded-2xl shadow-xl border border-recco-gray-200 p-8">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">{error}</div>
                    )}

                    {/* ═══ STEP 1: Account ═══ */}
                    {step === 1 && !showOtp && (
                        <form onSubmit={handleStep1Submit} className="space-y-4">
                            <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">Create Account</h2>
                            <div>
                                <label htmlFor="rec-reg-email" className={labelCls}>Email</label>
                                <input id="rec-reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="facility@recycler.com" required autoFocus disabled={loading} className={inputCls} />
                            </div>
                            <div>
                                <label htmlFor="rec-reg-pass" className={labelCls}>Password</label>
                                <div className="relative">
                                    <input id="rec-reg-pass" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" required disabled={loading} className={inputCls} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-recco-gray-400 hover:text-recco-gray-600">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} /></svg>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="rec-reg-confirm" className={labelCls}>Confirm Password</label>
                                <input id="rec-reg-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required disabled={loading} className={inputCls} />
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
                                <p className="text-sm text-recco-gray-500">Enter the 8-digit code sent to <strong>{email}</strong></p>
                            </div>
                            <OtpPinInput length={8} onComplete={handleOtpComplete} error={error || undefined} disabled={loading} label="Verification Code" isOtp />
                            <button onClick={() => setShowOtp(false)} className={btnSecondary}>Back</button>
                        </div>
                    )}

                    {/* ═══ STEP 2: Regulatory ═══ */}
                    {step === 2 && (
                        <form onSubmit={handleStep2Submit} className="space-y-4">
                            <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">Regulatory Identity</h2>
                            <p className="text-sm text-recco-gray-500 mb-3">Enter your registration numbers. Format warnings are advisory only.</p>
                            <div>
                                <label className={labelCls}>CPCB Registration Number</label>
                                <input type="text" value={cpcbNumber} onChange={(e) => setCpcbNumber(e.target.value)} placeholder="e.g. HW-12345, WM-789" disabled={loading} className={inputCls} />
                                <FormatWarning value={cpcbNumber} regex={CPCB_REGEX} label="CPCB Number" />
                            </div>
                            <div>
                                <label className={labelCls}>SPCB Consent Number</label>
                                <input type="text" value={spcbNumber} onChange={(e) => setSpcbNumber(e.target.value)} placeholder="e.g. MPCB/RO/1234/2024" disabled={loading} className={inputCls} />
                                <FormatWarning value={spcbNumber} regex={SPCB_REGEX} label="SPCB Number" />
                            </div>
                            <div>
                                <label className={labelCls}>EPR Registration Number</label>
                                <input type="text" value={eprNumber} onChange={(e) => setEprNumber(e.target.value)} placeholder="e.g. EPR-R1234-XYZ" disabled={loading} className={inputCls} />
                                <FormatWarning value={eprNumber} regex={EPR_REGEX} label="EPR Number" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setStep(1)} className={btnSecondary}>Back</button>
                                <button type="submit" disabled={loading} className={btnPrimary}>
                                    {loading ? "Saving..." : "Next: Facility Details"}
                                </button>
                            </div>
                            <button type="button" onClick={handleSkipToSubmit} disabled={loading} className={btnSkip}>
                                ⏭ Skip all & Complete Registration
                            </button>
                        </form>
                    )}

                    {/* ═══ STEP 3: Facility Details ═══ */}
                    {step === 3 && (
                        <form onSubmit={handleStep3Submit} className="space-y-4">
                            <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">Facility Details</h2>
                            <div>
                                <label className={labelCls}>Facility Name</label>
                                <input type="text" value={facilityName} onChange={(e) => setFacilityName(e.target.value)} placeholder="Green Recycling Pvt Ltd" required disabled={loading} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Facility Address</label>
                                <textarea value={facilityAddress} onChange={(e) => setFacilityAddress(e.target.value)} placeholder="Full address with pin code" required disabled={loading} rows={2} className={inputCls + " resize-none"} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Latitude</label>
                                    <input type="text" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="19.0760" required disabled={loading} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Longitude</label>
                                    <input type="text" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="72.8777" required disabled={loading} className={inputCls} />
                                </div>
                            </div>
                            <button type="button" onClick={handleGetLocation} className="text-sm text-recco-teal-700 hover:text-recco-teal-800 font-medium flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                Use my current location
                            </button>
                            <div>
                                <label className={labelCls}>Processing Capacity (kg/month)</label>
                                <input type="number" value={capacityKg} onChange={(e) => setCapacityKg(e.target.value)} placeholder="50000" required disabled={loading} className={inputCls} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setStep(2)} className={btnSecondary}>Back</button>
                                <button type="submit" disabled={loading || !facilityName || !facilityAddress} className={btnPrimary}>
                                    {loading ? "Saving..." : "Next: Documents"}
                                </button>
                            </div>
                            <button type="button" onClick={handleSkipToSubmit} disabled={loading} className={btnSkip}>
                                ⏭ Skip all & Complete Registration
                            </button>
                        </form>
                    )}

                    {/* ═══ STEP 4: Documents ═══ */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">Upload Documents</h2>
                            <p className="text-sm text-recco-gray-500">Upload your CPCB/SPCB certificates and other required documents.</p>
                            <div className="border-2 border-dashed border-recco-gray-300 rounded-xl p-8 text-center">
                                <svg className="w-12 h-12 mx-auto text-recco-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-sm text-recco-gray-600 font-medium">Drag & drop files or click to browse</p>
                                <p className="text-xs text-recco-gray-400 mt-1">PDF, JPG, PNG up to 10 MB each</p>
                                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" id="doc-upload" />
                                <label htmlFor="doc-upload" className="mt-3 inline-block px-4 py-2 bg-recco-gray-100 text-recco-gray-700 text-sm font-medium rounded-lg cursor-pointer hover:bg-recco-gray-200 transition-colors">
                                    Select Files
                                </label>
                            </div>
                            <p className="text-xs text-recco-gray-400 text-center">Document upload will be processed after registration. You can skip for now.</p>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setStep(3)} className={btnSecondary}>Back</button>
                                <button type="button" onClick={handleStep4Next} className={btnPrimary}>
                                    Next: Bank Details
                                </button>
                            </div>
                            <button type="button" onClick={handleSkipToSubmit} disabled={loading} className={btnSkip}>
                                ⏭ Skip all & Complete Registration
                            </button>
                        </div>
                    )}

                    {/* ═══ STEP 5: Bank Details ═══ */}
                    {step === 5 && (
                        <form onSubmit={handleStep5Submit} className="space-y-4">
                            <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">Bank & Payment Details</h2>
                            <p className="text-sm text-recco-gray-500 mb-2">Your bank details are encrypted using AES-256-GCM before storage.</p>
                            <div className="bg-recco-teal-50 border border-recco-teal-100 rounded-lg p-2 flex items-center gap-2 mb-3">
                                <svg className="w-4 h-4 text-recco-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                <span className="text-xs text-recco-teal-700 font-medium">End-to-end encrypted — we never store plaintext bank details</span>
                            </div>
                            <div>
                                <label className={labelCls}>Bank Name</label>
                                <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="State Bank of India" required disabled={loading} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Account Holder Name</label>
                                <input type="text" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="As per bank records" required disabled={loading} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Account Number</label>
                                <input type="text" inputMode="numeric" pattern="[0-9]*" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account number" required disabled={loading} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>IFSC Code</label>
                                <input type="text" value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} placeholder="e.g. SBIN0001234" required disabled={loading} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>UPI ID (Optional)</label>
                                <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@upi" disabled={loading} className={inputCls} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setStep(4)} className={btnSecondary}>Back</button>
                                <button type="submit" disabled={loading || !bankName || !accountNumber || !ifscCode} className={btnPrimary}>
                                    {loading ? "Encrypting & Saving..." : "Next: Review"}
                                </button>
                            </div>
                            <button type="button" onClick={handleSkipToSubmit} disabled={loading} className={btnSkip}>
                                ⏭ Skip all & Complete Registration
                            </button>
                        </form>
                    )}

                    {/* ═══ STEP 6: Review & Submit ═══ */}
                    {step === 6 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-recco-gray-800 mb-1">Review & Submit</h2>
                            <p className="text-sm text-recco-gray-500">Please review your details before submitting for admin approval.</p>

                            <div className="divide-y divide-recco-gray-100">
                                <div className="py-3">
                                    <p className="text-xs font-semibold text-recco-gray-400 uppercase tracking-wider">Account</p>
                                    <p className="text-sm text-recco-gray-800 mt-0.5">{email}</p>
                                </div>
                                <div className="py-3">
                                    <p className="text-xs font-semibold text-recco-gray-400 uppercase tracking-wider">Regulatory IDs</p>
                                    {cpcbNumber && <p className="text-sm text-recco-gray-800 mt-0.5">CPCB: {cpcbNumber}</p>}
                                    {spcbNumber && <p className="text-sm text-recco-gray-800">SPCB: {spcbNumber}</p>}
                                    {eprNumber && <p className="text-sm text-recco-gray-800">EPR: {eprNumber}</p>}
                                    {!cpcbNumber && !spcbNumber && !eprNumber && <p className="text-sm text-recco-gray-400">None provided</p>}
                                </div>
                                <div className="py-3">
                                    <p className="text-xs font-semibold text-recco-gray-400 uppercase tracking-wider">Facility</p>
                                    <p className="text-sm text-recco-gray-800 mt-0.5">{facilityName}</p>
                                    <p className="text-sm text-recco-gray-600">{facilityAddress}</p>
                                    {latitude && longitude && <p className="text-xs text-recco-gray-400">GPS: {latitude}, {longitude}</p>}
                                    {capacityKg && <p className="text-xs text-recco-gray-400">Capacity: {parseInt(capacityKg).toLocaleString()} kg/month</p>}
                                </div>
                                <div className="py-3">
                                    <p className="text-xs font-semibold text-recco-gray-400 uppercase tracking-wider">Bank Details</p>
                                    <p className="text-sm text-recco-gray-800 mt-0.5">{bankName} • ••••{accountNumber.slice(-4)}</p>
                                    <p className="text-xs text-recco-gray-400">IFSC: {ifscCode}</p>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                                <strong>Note:</strong> Your registration will be reviewed by an admin. You{"'"}ll be notified once approved.
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setStep(5)} className={btnSecondary}>Back</button>
                                <button onClick={handleFinalSubmit} disabled={loading} className={btnPrimary}>
                                    {loading ? "Submitting..." : "Submit for Approval"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-6 space-x-3">
                    <span className="text-sm text-recco-gray-500">Already registered?</span>
                    <a href="/recycler/login" className="text-sm text-recco-teal-700 hover:text-recco-teal-800 font-medium">Sign In</a>
                    <span className="text-sm text-recco-gray-400">·</span>
                    <a href="/" className="text-sm text-recco-gray-500 hover:text-recco-teal-700">Back to portals</a>
                </div>
            </div>
        </div>
    );
}
