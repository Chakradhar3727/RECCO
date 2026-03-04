import React from 'react';

export default function RecyclerDashboardPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-recco-navy-900 mb-6">Recycler Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-recco-teal-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-recco-navy-900 mb-2">Processed (tons)</h3>
                    <p className="text-4xl font-bold text-recco-teal-700">452.8</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-recco-teal-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-recco-navy-900 mb-2">Pending Intake</h3>
                    <p className="text-4xl font-bold text-recco-amber-600">5 trips</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-recco-teal-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-recco-navy-900 mb-2">Certificates Issued</h3>
                    <p className="text-4xl font-bold text-recco-navy-800">142</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-recco-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-recco-navy-900 mb-4">Recent Intakes</h2>
                <div className="text-recco-slate-600">
                    Intake logs will be displayed here...
                </div>
            </div>
        </div>
    );
}
