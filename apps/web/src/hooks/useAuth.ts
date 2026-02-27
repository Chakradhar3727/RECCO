"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type UserRole = "admin" | "aggregator" | "recycler" | "pibo" | "pro" | null;

interface AuthState {
    user: User | null;
    role: UserRole;
    loading: boolean;
    error: string | null;
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        role: null,
        loading: true,
        error: null,
    });

    const supabase = createClient();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (session?.user) {
                    // Fetch role from user_profiles
                    const { data: profile } = await supabase
                        .from("user_profiles")
                        .select("role")
                        .eq("id", session.user.id)
                        .single();

                    setState({
                        user: session.user,
                        role: (profile?.role as UserRole) || null,
                        loading: false,
                        error: null,
                    });
                } else {
                    setState({ user: null, role: null, loading: false, error: null });
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [supabase]);

    const signIn = useCallback(
        async (email: string, password: string) => {
            setState((s) => ({ ...s, loading: true, error: null }));
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) setState((s) => ({ ...s, loading: false, error: error.message }));
        },
        [supabase]
    );

    const signUp = useCallback(
        async (email: string, password: string, metadata?: Record<string, unknown>) => {
            setState((s) => ({ ...s, loading: true, error: null }));
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: metadata },
            });
            if (error) setState((s) => ({ ...s, loading: false, error: error.message }));
        },
        [supabase]
    );

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
    }, [supabase]);

    return { ...state, signIn, signUp, signOut };
}
