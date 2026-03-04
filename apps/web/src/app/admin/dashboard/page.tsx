import React from 'react';

export default function AdminDashboardPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-recco-navy-900 mb-6">Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-recco-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-recco-navy-900 mb-2">Total Users</h3>
                    <p className="text-4xl font-bold text-recco-green-700">1,248</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-recco-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-recco-navy-900 mb-2">Total Recyclers</h3>
                    <p className="text-4xl font-bold text-recco-teal-700">56</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-recco-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-recco-navy-900 mb-2">Platform Revenue</h3>
                    <p className="text-4xl font-bold text-recco-amber-700">₹4.2M</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-recco-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-recco-navy-900 mb-4">Recent Platform Activity</h2>
                <div className="text-recco-slate-600">
                    Activity logs will be displayed here...
                </div>
            </div>
        </div>
    );
}
