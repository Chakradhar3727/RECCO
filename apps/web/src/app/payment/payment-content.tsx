"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, CreditCard, ShieldCheck } from "lucide-react";

export default function PaymentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const amount = searchParams.get("amount") || "1000";
    const returnUrl = searchParams.get("returnUrl") || "/dashboard";

    const [status, setStatus] = useState<"idle" | "processing" | "success">("idle");

    const handlePayment = () => {
        setStatus("processing");
        setTimeout(() => {
            setStatus("success");
            setTimeout(() => {
                router.push(returnUrl);
            }, 2000);
        }, 2500);
    };

    return (
        <div className="min-h-screen bg-recco-gray-50 flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-recco-slate-200">
                <div className="bg-recco-navy-900 p-6 text-white text-center">
                    <ShieldCheck size={48} className="mx-auto text-recco-green-500 mb-4" />
                    <h1 className="text-2xl font-bold">Secure Checkout</h1>
                    <p className="text-white/70 text-sm mt-2">RECCO Prototype Payment Simulator</p>
                </div>

                <div className="p-8">
                    {status === "idle" && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <p className="text-recco-slate-600 mb-1">Total Amount Payable</p>
                                <p className="text-4xl font-bold text-recco-navy-900">₹{parseFloat(amount).toLocaleString()}</p>
                            </div>

                            <div className="bg-recco-gray-50 p-4 rounded-xl border border-recco-slate-200 flex items-center gap-4">
                                <div className="p-3 bg-white rounded-lg shadow-sm">
                                    <CreditCard className="text-recco-navy-900" size={24} />
                                </div>
                                <div>
                                    <p className="font-semibold text-recco-navy-900">Test Payment Method</p>
                                    <p className="text-sm text-recco-slate-600">Bypasses Razorpay for MVP</p>
                                </div>
                            </div>

                            <button
                                onClick={handlePayment}
                                className="w-full bg-recco-green-700 hover:bg-recco-green-800 text-white font-bold py-4 rounded-xl transition-colors text-lg"
                            >
                                Pay ₹{parseFloat(amount).toLocaleString()}
                            </button>
                        </div>
                    )}

                    {status === "processing" && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 size={48} className="text-recco-green-700 animate-spin" />
                            <p className="text-lg font-medium text-recco-navy-900">Processing Payment...</p>
                            <p className="text-sm text-recco-slate-600 text-center">
                                Please do not close this window or click back.
                            </p>
                        </div>
                    )}

                    {status === "success" && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <CheckCircle2 size={64} className="text-recco-green-600" />
                            <p className="text-2xl font-bold text-recco-navy-900">Payment Successful!</p>
                            <p className="text-sm text-recco-slate-600 text-center">
                                Redirecting you back to your portal...
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <p className="mt-8 text-recco-slate-500 text-sm text-center max-w-sm">
                Note: This is a simulated payment page for the RECCO MVP. No actual transactions are processed.
            </p>
        </div>
    );
}
