"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Notification {
    id: string;
    title: string;
    body: string;
    type: string | null;
    is_read: boolean | null;
    created_at: string | null;
}

export function useNotifications(userId?: string) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    // Fetch notifications
    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const fetchNotifications = async () => {
            const { data } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(50);

            if (data) {
                setNotifications(data as Notification[]);
                setUnreadCount(data.filter((n) => !n.is_read).length);
            }
            setLoading(false);
        };

        fetchNotifications();

        // Subscribe to realtime notifications
        const channel = supabase
            .channel("notifications")
            .on(
                "postgres_changes" as never,
                { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
                (payload: { new: Notification }) => {
                    setNotifications((prev) => [payload.new, ...prev]);
                    setUnreadCount((prev) => prev + 1);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userId, supabase]);

    const markRead = useCallback(
        async (notificationId: string) => {
            await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
            setNotifications((prev) =>
                prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        },
        [supabase]
    );

    const markAllRead = useCallback(async () => {
        if (!userId) return;
        await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
    }, [userId, supabase]);

    return { notifications, unreadCount, loading, markRead, markAllRead };
}
