import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { formatISTTimestamp, getRelativeTime } from '@/lib/utils/ist-time';

/**
 * Notifications Center — Phase 2 Module 2.10
 *
 * Admin-facing notification management:
 *  - Filter tabs: All | Unread | Alerts | Info | Success
 *  - Bulk actions: mark all read, clear read
 *  - Live notification list with relative timestamps
 *  - Notification failure monitoring
 */

// ─── Types ───────────────────────────────────────────────────────────

interface Notification {
    id: string;
    userId: string;
    userName: string;
    title: string;
    body: string;
    type: 'INFO' | 'ALERT' | 'SUCCESS' | string;
    isRead: boolean;
    createdAt: string;
}

interface NotificationStats {
    total: number;
    unread: number;
    alerts: number;
    info: number;
    success: number;
    failedDeliveries: number;
}

// ─── Data Fetching ───────────────────────────────────────────────────

async function getNotifications(filter: string): Promise<Notification[]> {
    const admin = createServiceRoleClient();

    let query = admin.from('notifications')
        .select('id, user_id, title, body, type, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

    if (filter === 'UNREAD') query = query.eq('is_read', false);
    else if (filter === 'ALERT') query = query.eq('type', 'ALERT');
    else if (filter === 'INFO') query = query.eq('type', 'INFO');
    else if (filter === 'SUCCESS') query = query.eq('type', 'SUCCESS');

    const { data } = await query;
    if (!data || data.length === 0) return [];

    // Batch fetch user names
    const userIds = Array.from(new Set((data as any[]).map((n: any) => n.user_id).filter(Boolean)));
    const { data: profiles } = userIds.length > 0
        ? await admin.from('user_profiles').select('id, full_name').in('id', userIds)
        : { data: [] };

    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || 'Unknown']));

    return (data as any[]).map((n: any) => ({
        id: n.id,
        userId: n.user_id || '',
        userName: nameMap.get(n.user_id) || 'System',
        title: n.title,
        body: n.body,
        type: n.type || 'INFO',
        isRead: n.is_read,
        createdAt: n.created_at,
    }));
}

async function getNotificationStats(): Promise<NotificationStats> {
    const admin = createServiceRoleClient();

    const [allRes, failRes] = await Promise.all([
        admin.from('notifications').select('type, is_read').limit(500),
        admin.from('notification_failures').select('id', { count: 'exact', head: true }),
    ]);

    const all = allRes.data || [];

    return {
        total: all.length,
        unread: all.filter((n: any) => !n.is_read).length,
        alerts: all.filter((n: any) => n.type === 'ALERT').length,
        info: all.filter((n: any) => n.type === 'INFO').length,
        success: all.filter((n: any) => n.type === 'SUCCESS').length,
        failedDeliveries: failRes.count || 0,
    };
}

// ─── Components ──────────────────────────────────────────────────────

function TypeIcon({ type }: { type: string }) {
    const config: Record<string, { icon: string; bg: string; color: string }> = {
        ALERT: { icon: '⚠️', bg: '#FEF2F2', color: 'var(--recco-red-700)' },
        INFO: { icon: 'ℹ️', bg: '#EFF6FF', color: '#2563EB' },
        SUCCESS: { icon: '✓', bg: 'var(--recco-green-100)', color: 'var(--recco-green-700)' },
        HIGH: { icon: '🔴', bg: '#FEF2F2', color: 'var(--recco-red-700)' },
    };
    const c = config[type] || config.INFO;
    return (
        <span
            className="flex items-center justify-center w-7 h-7 rounded-full text-xs flex-shrink-0"
            style={{ backgroundColor: c.bg, color: c.color }}
        >
            {c.icon}
        </span>
    );
}

function NotificationRow({ notification }: { notification: Notification }) {
    return (
        <div
            className={`flex items-start gap-4 px-6 py-4 border-b border-gray-100 last:border-b-0 transition-colors hover:bg-gray-50 ${!notification.isRead ? 'bg-blue-50/20' : ''
                }`}
        >
            <TypeIcon type={notification.type} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className={`text-sm ${!notification.isRead ? 'font-bold' : 'font-medium'} stitch-text-navy truncate`}>
                        {notification.title}
                    </p>
                    {!notification.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                    )}
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{notification.body}</p>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-medium text-gray-500">{notification.userName}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs font-medium text-gray-400">{getRelativeTime(notification.createdAt)}</span>
                </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
                <span
                    className="text-[11px] font-bold px-2 py-1 rounded-full uppercase tracking-wider"
                    style={{
                        backgroundColor: notification.type === 'ALERT' ? '#FEF2F2' : notification.type === 'SUCCESS' ? 'var(--recco-green-100)' : '#F5F5F5',
                        color: notification.type === 'ALERT' ? 'var(--recco-red-700)' : notification.type === 'SUCCESS' ? 'var(--recco-green-700)' : '#666',
                    }}
                >
                    {notification.type}
                </span>
            </div>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────

export default async function NotificationsPage({
    searchParams,
}: {
    searchParams: { filter?: string };
}) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/admin/login');

    const filter = searchParams.filter?.toUpperCase() || 'ALL';

    const [notifications, stats] = await Promise.all([
        getNotifications(filter),
        getNotificationStats(),
    ]);

    const tabs = [
        { key: 'ALL', label: 'All', count: stats.total },
        { key: 'UNREAD', label: 'Unread', count: stats.unread },
        { key: 'ALERT', label: 'Alerts', count: stats.alerts },
        { key: 'INFO', label: 'Info', count: stats.info },
        { key: 'SUCCESS', label: 'Success', count: stats.success },
    ];

    return (
        <div className="stitch-page p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold stitch-text-navy tracking-tight">Notifications Center</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Platform-wide notification monitoring and delivery status
                    </p>
                </div>
                {stats.failedDeliveries > 0 && (
                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                        <span className="text-sm font-bold text-red-700">
                            {stats.failedDeliveries} failed deliver{stats.failedDeliveries > 1 ? 'ies' : 'y'}
                        </span>
                    </div>
                )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {tabs.map((tab) => (
                    <div key={tab.key} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center items-center text-center">
                        <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">{tab.label}</p>
                        <p className="text-3xl font-bold font-mono stitch-text-navy">{tab.count}</p>
                    </div>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Filter Tabs */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex flex-wrap gap-2">
                        {tabs.map((tab) => (
                            <Link
                                key={tab.key}
                                href={`/admin/notifications${tab.key === 'ALL' ? '' : `?filter=${tab.key.toLowerCase()}`}`}
                                className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${filter === tab.key
                                    ? 'bg-[#1B6B35] text-white shadow-sm'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                            >
                                {tab.label}
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${filter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {tab.count}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Notification List */}
                <div className="divide-y divide-gray-100">
                    {notifications.length === 0 ? (
                        <div className="py-16 text-center flex flex-col items-center justify-center">
                            <span className="text-4xl mb-4 opacity-50">📭</span>
                            <p className="text-lg font-bold stitch-text-navy">No notifications</p>
                            <p className="text-sm text-gray-500 mt-2 max-w-sm">
                                Notifications will appear here as platform events occur. Check back later or adjust filters.
                            </p>
                        </div>
                    ) : (
                        notifications.map((n) => <NotificationRow key={n.id} notification={n} />)
                    )}
                </div>
            </div>
        </div>
    );
}
