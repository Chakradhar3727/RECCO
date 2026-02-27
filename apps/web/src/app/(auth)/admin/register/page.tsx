"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";

export default function AdminRegisterPage() {
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setLoading(true);
        setError("");
        setTimeout(() => {
            setError("Registration not yet configured. Admin access is by invitation only.");
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <div className="inline-flex p-4 rounded-2xl bg-recco-navy-900 text-white shadow-lg">
                    <ShieldCheck size={32} />
                </div>
                <h1 className="text-2xl font-bold text-recco-navy-900">Admin Registration</h1>
                <p className="text-recco-navy-900/60 text-sm">Invitation-only access</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="admin-name" className="block text-sm font-medium text-recco-navy-900 mb-1">Full Name</label>
                    <input id="admin-name" type="text" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-recco-gray-50 bg-white focus:border-recco-navy-900 focus:ring-0 outline-none transition-colors text-recco-navy-900" placeholder="Full name" required />
                </div>
                <div>
                    <label htmlFor="admin-reg-email" className="block text-sm font-medium text-recco-navy-900 mb-1">Email Address</label>
                    <input id="admin-reg-email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-recco-gray-50 bg-white focus:border-recco-navy-900 focus:ring-0 outline-none transition-colors text-recco-navy-900" placeholder="admin@recco.in" required />
                </div>
                <div>
                    <label htmlFor="admin-reg-pass" className="block text-sm font-medium text-recco-navy-900 mb-1">Password</label>
                    <div className="relative">
                        <input id="admin-reg-pass" type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-recco-gray-50 bg-white focus:border-recco-navy-900 focus:ring-0 outline-none transition-colors text-recco-navy-900 pr-12" placeholder="••••••••" required minLength={8} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-recco-navy-900/40 hover:text-recco-navy-900 transition-colors">
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>
                <div>
                    <label htmlFor="admin-reg-confirm" className="block text-sm font-medium text-recco-navy-900 mb-1">Confirm Password</label>
                    <input id="admin-reg-confirm" type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-recco-gray-50 bg-white focus:border-recco-navy-900 focus:ring-0 outline-none transition-colors text-recco-navy-900" placeholder="••••••••" required minLength={8} />
                </div>

                {error && <div className="p-3 rounded-xl bg-recco-red-700/10 text-recco-red-700 text-sm">{error}</div>}

                <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-xl bg-recco-navy-900 text-white font-semibold hover:bg-recco-navy-900/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {loading && <Loader2 size={18} className="animate-spin" />}
                    {loading ? "Creating account..." : "Request Admin Access"}
                </button>
            </form>

            <p className="text-center text-sm text-recco-navy-900/50">
                Already have access?{" "}
                <Link href="/auth/admin/login" className="text-recco-green-700 font-medium hover:underline">Sign in</Link>
            </p>
        </div>
    );
}
