import React from 'react';

export default function PiboDashboardPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-recco-navy-900 mb-6">PIBO Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-recco-amber-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-recco-navy-900 mb-2">Target Fulfilled</h3>
                    <p className="text-4xl font-bold text-recco-amber-700">78%</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-recco-amber-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-recco-navy-900 mb-2">Total Credits (tons)</h3>
                    <p className="text-4xl font-bold text-recco-navy-800">1,250</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-recco-amber-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-recco-navy-900 mb-2">Compliance Status</h3>
                    <p className="text-2xl font-bold text-recco-green-600">On Track</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-recco-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-recco-navy-900 mb-4">Recent Certificates Purchased</h2>
                <div className="text-recco-slate-600">
                    Certificate logs will be displayed here...
                </div>
            </div>
        </div>
    );
}
