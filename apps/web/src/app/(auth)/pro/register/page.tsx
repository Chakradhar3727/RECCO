"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OtpPinInput } from "@/components/shared/otp-pin-input";
import {
    proRegisterSendOtp,
    verifyProRegistrationOtp,
    proRegisterStep2,
    proRegisterStep4,
    proRegisterSubmit,
} from "../login/actions";

type Step = 1 | 2 | 3 | 4 | 5;
const STEP_LABELS = ["Account", "CPCB & Org", "Documents", "Bank Details", "Review"];

function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center justify-center gap-1 mb-8">
            {Array.from({ length: total }, (_, i) => (
                <React.Fragment key={i}>
                    <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i + 1 < current ? "bg-purple-600 text-white" :
                            i + 1 === current ? "bg-purple-700 text-white ring-4 ring-purple-100" :
                                "bg-recco-gray-200 text-recco-gray-500"
                            }`}>
                            {i + 1 < current ? "✓" : i + 1}
                        </div>
                        <span className={`text-[10px] mt-1 ${i + 1 === current ? "text-purple-700 font-semibold" : "text-recco-gray-400"}`}>
                            {STEP_LABELS[i]}
                        </span>
                    </div>
                    {i < total - 1 && (
                        <div className={`w-8 h-0.5 mt-[-12px] ${i + 1 < current ? "bg-purple-500" : "bg-recco-gray-200"}`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

const STATES = [
    "AN", "AP", "AR", "AS", "BR", "CH", "CT", "DD", "DL", "GA", "GJ", "HP", "HR",
    "JH", "JK", "KA", "KL", "LA", "LD", "MH", "ML", "MN", "MP", "MZ", "NL", "OR",
    "PB", "PY", "RJ", "SK", "TN", "TS", "TR", "UK", "UP", "WB",
];

export default function ProRegisterPage() {
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
    const [orgName, setOrgName] = useState("");
    const [cpcbRegNumber, setCpcbRegNumber] = useState("");
    const [stateCode, setStateCode] = useState("");

    // Step 4 — Bank
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [ifscCode, setIfscCode] = useState("");
    const [accountHolder, setAccountHolder] = useState("");
    const [upiId, setUpiId] = useState("");
    const [phone, setPhone] = useState("");
    const [contactAddress, setContactAddress] = useState("");

    const inputCls = "w-full px-4 py-3 border-2 border-recco-gray-200 rounded-xl text-recco-gray-900 placeholder-recco-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all disabled:opacity-50";
    const labelCls = "block text-sm font-medium text-recco-gray-700 mb-1.5";
    const btnPrimary = "w-full py-3 px-4 bg-purple-700 text-white font-semibold rounded-xl hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50";
    const btnSecondary = "w-full py-3 text-recco-gray-600 font-medium rounded-xl border-2 border-recco-gray-200 hover:bg-recco-gray-50 transition-all";
    const btnSkip = "w-full py-2.5 text-purple-700 font-medium rounded-xl border-2 border-dashed border-purple-300 hover:bg-purple-50 transition-all text-sm";

    // Skip all remaining steps and submit directly
    const handleSkipToSubmit = useCallback(async () => {
        if (!userId) return;
        setError(null);
        setLoading(true);
        const result = await proRegisterSubmit(userId);
        setLoading(false);
        if (result.success) router.push("/pro/login?registered=true");
        else setError(result.error || "Submission failed.");
    }, [userId, router]);

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

    const handleStep1Submit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) { setError("Passwords do not match."); return; }
        if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
        setError(null); setLoading(true);
        const result = await proRegisterSendOtp(email);
        setLoading(false);
        if (result.success) setShowOtp(true);
        else setError(result.error || "Registration failed.");
    }, [email, password, confirmPassword]);

    const handleOtpComplete = useCallback(async (otp: string) => {
        setError(null); setLoading(true);
        const result = await verifyProRegistrationOtp(email, otp, password);
        setLoading(false);
        if (result.success) {
            if (result.userId) setUserId(result.userId);
            setShowOtp(false);
            setStep(2);
        }
        else setError(result.error || "Invalid OTP.");
    }, [email, password]);

    const handleStep2Submit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) { setError("Session expired."); return; }
        setError(null); setLoading(true);
        const result = await proRegisterStep2(userId, cpcbRegNumber, stateCode, orgName);
        setLoading(false);
        if (result.success) {
            if (result.userId) setGeneratedId(result.userId);
            setStep(3);
        } else setError(result.error || "Failed to save.");
    }, [userId, orgName, cpcbRegNumber, stateCode]);

    const handleStep4Submit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        setError(null); setLoading(true);
        const result = await proRegisterStep4(userId, {
            bank_name: bankName,
            account_number: accountNumber,
            ifsc_code: ifscCode,
            account_holder_name: accountHolder,
            upi_id: upiId || undefined,
        }, { phone, address: contactAddress });
        setLoading(false);
        if (result.success) setStep(5);
        else setError(result.error || "Failed to save.");
    }, [userId, bankName, accountNumber, ifscCode, accountHolder, upiId, phone, contactAddress]);

    const handleFinalSubmit = useCallback(async () => {
        if (!userId) return;
        setError(null); setLoading(true);
        const result = await proRegisterSubmit(userId);
        setLoading(false);
        if (result.success) router.push("/pro/login?registered=true");
        else setError(result.error || "Submission failed.");
    }, [userId, router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-recco-gray-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-700 flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-recco-gray-900">PRO Registration</h1>
                    <p className="text-recco-gray-500 mt-1">Producer Responsibility Organisation</p>
                </div>

                <StepIndicator current={step} total={5} />

                <div className="bg-white rounded-2xl shadow-xl border border-recco-gray-200 p-8">
                    {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">{error}</div>}

                    {/* STEP 1: Account */}
                    {step === 1 && !showOtp && (
                        <form onSubmit={handleStep1Submit} className="space-y-4">
                            <h2 className="text-lg font-semibold text-recco-gray-800">Create Account</h2>
                            <div>
                                <label className={labelCls}>Email</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@pro-org.com" required autoFocus disabled={loading} className={inputCls} />
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
                                <p className="text-sm text-recco-gray-500">Enter the 8-digit code sent to <strong>{email}</strong></p>
                            </div>
                            <OtpPinInput length={8} onComplete={handleOtpComplete} error={error || undefined} disabled={loading} label="Verification Code" isOtp />
                            <button onClick={() => setShowOtp(false)} className={btnSecondary}>Back</button>
                        </div>
                    )}

                    {/* STEP 2: CPCB & Organisation */}
                    {step === 2 && (
                        <form onSubmit={handleStep2Submit} className="space-y-4">
                            <h2 className="text-lg font-semibold text-recco-gray-800">CPCB Certificate & Organisation</h2>
                            <div>
                                <label className={labelCls}>Organisation Name</label>
                                <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="PRO Organisation Pvt Ltd" required disabled={loading} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>CPCB PRO Registration Number</label>
                                <input type="text" value={cpcbRegNumber} onChange={(e) => setCpcbRegNumber(e.target.value)} placeholder="e.g. PRO/2024/WPM/12345" required disabled={loading} className={inputCls} />
                                <p className="text-xs text-recco-gray-400 mt-1">Your PRO User ID will be generated from this number (last 6 characters)</p>
                            </div>
                            <div>
                                <label className={labelCls}>State Code</label>
                                <select value={stateCode} onChange={(e) => setStateCode(e.target.value)} required disabled={loading} className={inputCls}>
                                    <option value="">Select state...</option>
                                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setStep(1)} className={btnSecondary}>Back</button>
                                <button type="submit" disabled={loading || !orgName || !cpcbRegNumber || !stateCode} className={btnPrimary}>
                                    {loading ? "Saving..." : "Next: Documents"}
                                </button>
                            </div>
                            <button type="button" onClick={handleSkipToSubmit} disabled={loading} className={btnSkip}>
                                ⏭ Skip all & Complete Registration
                            </button>
                        </form>
                    )}

                    {/* STEP 3: Documents */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-recco-gray-800">Supporting Documents</h2>
                            {generatedId && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700">
                                    <strong>Your PRO User ID:</strong> {generatedId}
                                </div>
                            )}
                            {["CPCB PRO Certificate", "Company Registration", "Board Resolution Letter"].map((doc, i) => (
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
                            <p className="text-xs text-recco-gray-400 text-center">Documents can be uploaded later. You may skip for now.</p>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setStep(2)} className={btnSecondary}>Back</button>
                                <button type="button" onClick={() => setStep(4)} className={btnPrimary}>Next: Bank Details</button>
                            </div>
                            <button type="button" onClick={handleSkipToSubmit} disabled={loading} className={btnSkip}>
                                ⏭ Skip all & Complete Registration
                            </button>
                        </div>
                    )}

                    {/* STEP 4: Bank & Contact */}
                    {step === 4 && (
                        <form onSubmit={handleStep4Submit} className="space-y-4">
                            <h2 className="text-lg font-semibold text-recco-gray-800">Bank & Contact Details</h2>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 flex items-center gap-2 mb-2">
                                <svg className="w-4 h-4 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                <span className="text-xs text-purple-700 font-medium">End-to-end encrypted — AES-256-GCM</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className={labelCls}>Bank Name</label>
                                    <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="HDFC Bank" required disabled={loading} className={inputCls} />
                                </div>
                                <div className="col-span-2">
                                    <label className={labelCls}>Account Holder</label>
                                    <input type="text" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="As per bank records" required disabled={loading} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Account Number</label>
                                    <input type="text" inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account no." required disabled={loading} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>IFSC Code</label>
                                    <input type="text" value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} placeholder="HDFC0001234" required disabled={loading} className={inputCls} />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>UPI ID (Optional)</label>
                                <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@upi" disabled={loading} className={inputCls} />
                            </div>
                            <hr className="my-2 border-recco-gray-200" />
                            <div>
                                <label className={labelCls}>Contact Phone</label>
                                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" required disabled={loading} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Contact Address</label>
                                <textarea value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} placeholder="Office address" required disabled={loading} rows={2} className={inputCls + " resize-none"} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setStep(3)} className={btnSecondary}>Back</button>
                                <button type="submit" disabled={loading || !bankName || !accountNumber || !ifscCode} className={btnPrimary}>
                                    {loading ? "Encrypting & Saving..." : "Next: Review"}
                                </button>
                            </div>
                            <button type="button" onClick={handleSkipToSubmit} disabled={loading} className={btnSkip}>
                                ⏭ Skip all & Complete Registration
                            </button>
                        </form>
                    )}

                    {/* STEP 5: Review */}
                    {step === 5 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-recco-gray-800">Review & Submit</h2>
                            <div className="divide-y divide-recco-gray-100">
                                <div className="py-3">
                                    <p className="text-xs font-semibold text-recco-gray-400 uppercase tracking-wider">Account</p>
                                    <p className="text-sm text-recco-gray-800 mt-0.5">{email}</p>
                                </div>
                                <div className="py-3">
                                    <p className="text-xs font-semibold text-recco-gray-400 uppercase tracking-wider">Organisation</p>
                                    <p className="text-sm text-recco-gray-800 mt-0.5">{orgName}</p>
                                    <p className="text-sm text-recco-gray-600">CPCB: {cpcbRegNumber} • State: {stateCode}</p>
                                    {generatedId && <p className="text-xs text-purple-600 font-mono">ID: {generatedId}</p>}
                                </div>
                                <div className="py-3">
                                    <p className="text-xs font-semibold text-recco-gray-400 uppercase tracking-wider">Bank</p>
                                    <p className="text-sm text-recco-gray-800 mt-0.5">{bankName} • ••••{accountNumber.slice(-4)}</p>
                                </div>
                                <div className="py-3">
                                    <p className="text-xs font-semibold text-recco-gray-400 uppercase tracking-wider">Contact</p>
                                    <p className="text-sm text-recco-gray-800 mt-0.5">{phone}</p>
                                    <p className="text-sm text-recco-gray-600">{contactAddress}</p>
                                </div>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                                <strong>Note:</strong> Your registration will be reviewed by an admin. You{"'"}ll be notified once approved.
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setStep(4)} className={btnSecondary}>Back</button>
                                <button onClick={handleFinalSubmit} disabled={loading} className={btnPrimary}>
                                    {loading ? "Submitting..." : "Submit for Approval"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-center mt-6 space-x-3">
                    <span className="text-sm text-recco-gray-500">Already registered?</span>
                    <a href="/pro/login" className="text-sm text-purple-700 hover:text-purple-800 font-medium">Sign In</a>
                    <span className="text-sm text-recco-gray-400">·</span>
                    <a href="/" className="text-sm text-recco-gray-500 hover:text-purple-700">Back to portals</a>
                </div>
            </div>
        </div>
    );
}
