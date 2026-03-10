"use client";

import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';

export function GrowthChart({ data }: { data: { month: string; users: number; entities: number }[] }) {
    return (
        <div className="h-[280px] w-full mt-4" style={{ backgroundColor: 'var(--recco-bg)' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <RechartsTooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        cursor={{ fill: '#F1F5F9' }}
                    />
                    <Bar dataKey="users" name="Users" fill="var(--recco-navy-900)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="entities" name="Entities" fill="var(--recco-green-700)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function MaterialChart({ data }: { data: { type: string; weight: number; count: number }[] }) {
    return (
        <div className="h-[280px] w-full mt-4" style={{ backgroundColor: 'var(--recco-bg)' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <YAxis dataKey="type" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} width={80} />
                    <RechartsTooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        cursor={{ fill: '#F1F5F9' }}
                    />
                    <Bar dataKey="weight" name="Weight (kg)" fill="var(--recco-teal-700)" radius={[0, 4, 4, 0]} maxBarSize={30}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={'var(--recco-teal-700)'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function SLAChart({ data }: { data: { day: string; breachPercent: number }[] }) {
    return (
        <div className="h-[280px] w-full mt-4" style={{ backgroundColor: 'var(--recco-bg)' }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} domain={[0, 'dataMax + 2']} />
                    <RechartsTooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    />
                    <Line type="monotone" dataKey="breachPercent" name="Breach %" stroke="var(--recco-red-700)" strokeWidth={3} dot={{ r: 4, fill: "var(--recco-red-700)", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
