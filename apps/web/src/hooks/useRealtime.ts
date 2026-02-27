"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type ChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeOptions {
    table: string;
    schema?: string;
    event?: ChangeEvent;
    filter?: string;
    onInsert?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
    onUpdate?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
    onDelete?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
    onChange?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
    enabled?: boolean;
}

export function useRealtime({
    table,
    schema = "public",
    event = "*",
    filter,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    enabled = true,
}: UseRealtimeOptions) {
    const channelRef = useRef<RealtimeChannel | null>(null);
    const supabase = createClient();

    const unsubscribe = useCallback(() => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
    }, [supabase]);

    useEffect(() => {
        if (!enabled) return;

        const channelConfig: Record<string, string> = {
            event,
            schema,
            table,
        };
        if (filter) channelConfig.filter = filter;

        const channel = supabase
            .channel(`${table}-changes`)
            .on(
                "postgres_changes" as never,
                channelConfig,
                (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
                    onChange?.(payload);
                    if (payload.eventType === "INSERT") onInsert?.(payload);
                    if (payload.eventType === "UPDATE") onUpdate?.(payload);
                    if (payload.eventType === "DELETE") onDelete?.(payload);
                }
            )
            .subscribe();

        channelRef.current = channel;

        return () => unsubscribe();
    }, [table, schema, event, filter, enabled, supabase, unsubscribe, onChange, onInsert, onUpdate, onDelete]);

    return { unsubscribe };
}
