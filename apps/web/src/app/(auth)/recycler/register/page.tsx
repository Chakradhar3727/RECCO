"use client";

import { useState } from "react";
import Link from "next/link";
import { Recycle, Eye, EyeOff, Loader2 } from "lucide-react";

export default function RecyclerRegisterPage() {
    const [formData, setFormData] = useState({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) { setError("Passwords do not match"); return; }
        setLoading(true);
        setError("");
        setTimeout(() => { setError("Registration not yet configured. Coming in Phase 1."); setLoading(false); }, 1000);
    };

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <div className="inline-flex p-4 rounded-2xl bg-recco-teal-700 text-white shadow-lg">
                    <Recycle size={32} />
                </div>
                <h1 className="text-2xl font-bold text-recco-navy-900">Recycler Registration</h1>
                <p className="text-recco-navy-900/60 text-sm">Processing Facility - Manage intake & issue certificates</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="recycler-name" className="block text-sm font-medium text-recco-navy-900 mb-1">Full Name</label>
                    <input id="recycler-name" type="text" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-recco-gray-50 bg-white focus:border-recco-green-700 focus:ring-0 outline-none transition-colors text-recco-navy-900" placeholder="Full name" required />
                </div>
                <div>
                    <label htmlFor="recycler-reg-email" className="block text-sm font-medium text-recco-navy-900 mb-1">Email Address</label>
                    <input id="recycler-reg-email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-recco-gray-50 bg-white focus:border-recco-green-700 focus:ring-0 outline-none transition-colors text-recco-navy-900" placeholder="you@company.com" required />
                </div>
                <div>
                    <label htmlFor="recycler-phone" className="block text-sm font-medium text-recco-navy-900 mb-1">Phone Number</label>
                    <input id="recycler-phone" type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-recco-gray-50 bg-white focus:border-recco-green-700 focus:ring-0 outline-none transition-colors text-recco-navy-900" placeholder="+91 98765 43210" required />
                </div>
                <div>
                    <label htmlFor="recycler-reg-pass" className="block text-sm font-medium text-recco-navy-900 mb-1">Password</label>
                    <div className="relative">
                        <input id="recycler-reg-pass" type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-recco-gray-50 bg-white focus:border-recco-green-700 focus:ring-0 outline-none transition-colors text-recco-navy-900 pr-12" placeholder="" required minLength={8} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-recco-navy-900/40 hover:text-recco-navy-900 transition-colors">
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>
                <div>
                    <label htmlFor="recycler-reg-confirm" className="block text-sm font-medium text-recco-navy-900 mb-1">Confirm Password</label>
                    <input id="recycler-reg-confirm" type="password" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-recco-gray-50 bg-white focus:border-recco-green-700 focus:ring-0 outline-none transition-colors text-recco-navy-900" placeholder="" required minLength={8} />
                </div>

                {error && <div className="p-3 rounded-xl bg-recco-red-700/10 text-recco-red-700 text-sm">{error}</div>}

                <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-xl bg-recco-green-700 text-white font-semibold hover:bg-recco-green-700/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {loading && <Loader2 size={18} className="animate-spin" />}
                    {loading ? "Creating account..." : "Register as Recycler"}
                </button>
            </form>

            <p className="text-center text-sm text-recco-navy-900/50">
                Already have an account?{" "}
                <Link href="/auth/recycler/login" className="text-recco-green-700 font-medium hover:underline">Sign in</Link>
                {" "}&middot;{" "}
                <Link href="/" className="text-recco-navy-900/50 hover:underline">Back to portals</Link>
            </p>
        </div>
    );
}
