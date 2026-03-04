import React from 'react';

export default function ProDashboardPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-recco-navy-900 mb-6">PRO Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-purple-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-recco-navy-900 mb-2">Total Clients</h3>
                    <p className="text-4xl font-bold text-purple-700">24</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-purple-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-recco-navy-900 mb-2">Pooled Targets (tons)</h3>
                    <p className="text-4xl font-bold text-recco-navy-800">12,500</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-purple-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-recco-navy-900 mb-2">Overall Compliance</h3>
                    <p className="text-2xl font-bold text-recco-green-600">82% On Track</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-recco-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-recco-navy-900 mb-4">Client Compliance Overview</h2>
                <div className="text-recco-slate-600">
                    Client states will be displayed here...
                </div>
            </div>
        </div>
    );
}
