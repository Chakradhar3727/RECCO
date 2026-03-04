import React from 'react';

export default function AggregatorDashboardPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-recco-navy-900 mb-6">Aggregator Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-recco-green-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-recco-navy-900 mb-2">Total Collected (kg)</h3>
                    <p className="text-4xl font-bold text-recco-green-700">12,450</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-recco-green-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-recco-navy-900 mb-2">Pending Pickups</h3>
                    <p className="text-4xl font-bold text-recco-amber-600">8</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-recco-green-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-recco-navy-900 mb-2">Wallet Balance</h3>
                    <p className="text-4xl font-bold text-recco-navy-800">₹45,200</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-recco-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-recco-navy-900 mb-4">Recent Collections</h2>
                <div className="text-recco-slate-600">
                    Collection logs will be displayed here...
                </div>
            </div>
        </div>
    );
}
