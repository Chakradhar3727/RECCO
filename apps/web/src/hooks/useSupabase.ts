"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook to access the Supabase browser client.
 * Use this in client components — memoized so only one instance is created.
 */
export function useSupabase() {
    const supabase = useMemo(() => createClient(), []);
    return supabase;
}
