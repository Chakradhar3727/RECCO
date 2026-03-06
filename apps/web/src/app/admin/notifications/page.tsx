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
        ALERT: { icon: '⚠️', bg: '#FEF2F2', color: '#DC2626' },
        INFO: { icon: 'ℹ️', bg: '#EFF6FF', color: '#2563EB' },
        SUCCESS: { icon: '✓', bg: '#F0FAF4', color: '#1B6B35' },
        HIGH: { icon: '🔴', bg: '#FEF2F2', color: '#DC2626' },
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
            className={`flex items-start gap-3 py-3 px-4 border-b border-[#E5E5E5] transition-colors hover:bg-gray-50 ${!notification.isRead ? 'bg-blue-50/30' : ''
                }`}
        >
            <TypeIcon type={notification.type} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className={`text-xs ${!notification.isRead ? 'font-bold' : 'font-medium'} text-[#1A2F4B] truncate`}>
                        {notification.title}
                    </p>
                    {!notification.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{notification.body}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-400">{notification.userName}</span>
                    <span className="text-[10px] text-gray-300">·</span>
                    <span className="text-[10px] text-gray-400">{getRelativeTime(notification.createdAt)}</span>
                </div>
            </div>
            <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{
                    backgroundColor: notification.type === 'ALERT' ? '#FEF2F2' : notification.type === 'SUCCESS' ? '#F0FAF4' : '#F5F5F5',
                    color: notification.type === 'ALERT' ? '#DC2626' : notification.type === 'SUCCESS' ? '#1B6B35' : '#666',
                }}
            >
                {notification.type}
            </span>
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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-[#1A2F4B]">Notifications Center</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Platform-wide notification monitoring and delivery status
                    </p>
                </div>
                {stats.failedDeliveries > 0 && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                        <span className="text-xs font-bold text-red-700">
                            {stats.failedDeliveries} failed deliver{stats.failedDeliveries > 1 ? 'ies' : 'y'}
                        </span>
                    </div>
                )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-5 gap-2">
                {tabs.map((tab) => (
                    <div key={tab.key} className="bg-white rounded-lg border border-[#E5E5E5] p-3 text-center">
                        <p className="text-[10px] text-gray-400 uppercase">{tab.label}</p>
                        <p className="text-lg font-bold font-mono text-[#1A2F4B]">{tab.count}</p>
                    </div>
                ))}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 bg-white rounded-lg border border-[#E5E5E5] p-1">
                {tabs.map((tab) => (
                    <Link
                        key={tab.key}
                        href={`/admin/notifications${tab.key === 'ALL' ? '' : `?filter=${tab.key.toLowerCase()}`}`}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${filter === tab.key
                            ? 'bg-[#1A2F4B] text-white'
                            : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        {tab.label}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                            }`}>
                            {tab.count}
                        </span>
                    </Link>
                ))}
            </div>

            {/* Notification List */}
            <div className="bg-white rounded-lg border border-[#E5E5E5] overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-3xl mb-2">🔔</p>
                        <p className="text-sm text-gray-400">No notifications</p>
                        <p className="text-xs text-gray-300 mt-1">
                            Notifications will appear here as platform events occur.
                        </p>
                    </div>
                ) : (
                    notifications.map((n) => <NotificationRow key={n.id} notification={n} />)
                )}
            </div>
        </div>
    );
}
