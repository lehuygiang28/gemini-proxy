'use client';

import type { AuthProvider } from '@refinedev/core';
import type { AuthError, User } from '@supabase/supabase-js';
import { supabaseBrowserClient } from '@utils/supabase/client';

type NormalizedAuthError = {
    name: string;
    message: string;
    code?: string | number;
    status?: number;
};

function normalizeSupabaseError(error: AuthError): NormalizedAuthError {
    const maybeWithCode = error as unknown as { code?: string | number };
    const maybeWithStatus = error as unknown as { status?: number };
    return {
        name: error.name ?? 'AuthError',
        message: error.message ?? 'Auth error',
        code: maybeWithCode.code,
        status: typeof maybeWithStatus.status === 'number' ? maybeWithStatus.status : undefined,
    };
}

function hasNumericStatus(value: unknown): value is { status: number } {
    if (!value || typeof value !== 'object') return false;
    const v = value as { status?: unknown };
    return typeof v.status === 'number';
}

function hasCode(value: unknown): value is { code: string | number } {
    if (!value || typeof value !== 'object') return false;
    return 'code' in (value as object);
}

export const authProviderClient: AuthProvider = {
    login: async ({ email, password }) => {
        const { data, error } = await supabaseBrowserClient.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return {
                success: false,
                error: normalizeSupabaseError(error),
            };
        }

        if (data?.session) {
            await supabaseBrowserClient.auth.setSession(data.session);

            return {
                success: true,
                redirectTo: '/',
            };
        }

        // for third-party login
        return {
            success: false,
            error: {
                name: 'AuthError',
                message: 'Invalid username or password',
            },
        };
    },
    logout: async () => {
        const { error } = await supabaseBrowserClient.auth.signOut();

        if (error) {
            return {
                success: false,
                error,
            };
        }

        return {
            success: true,
            redirectTo: '/login',
        };
    },
    register: async ({ email, password }) => {
        try {
            const { data, error } = await supabaseBrowserClient.auth.signUp({
                email,
                password,
            });

            if (error) {
                return {
                    success: false,
                    error: normalizeSupabaseError(error),
                };
            }

            if (data?.session) {
                return { success: true, redirectTo: '/' };
            }
            // User created but not authenticated (e.g., email confirmation required)
            return { success: true, redirectTo: '/login' };
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            return {
                success: false,
                error: {
                    name: err.name ?? 'AuthError',
                    message: err.message ?? 'Register failed',
                },
            };
        }
    },
    check: async () => {
        const { data, error } = await supabaseBrowserClient.auth.getUser();
        const { user } = data;

        if (error) {
            return {
                authenticated: false,
                redirectTo: '/login',
                logout: true,
            };
        }

        if (user) {
            return {
                authenticated: true,
            };
        }

        return {
            authenticated: false,
            redirectTo: '/login',
        };
    },
    getPermissions: async () => {
        const { data } = await supabaseBrowserClient.auth.getUser();
        const user: User | null | undefined = data?.user ?? null;
        const metadata = (user?.user_metadata as { role?: string } | undefined) ?? undefined;
        const role = metadata?.role ?? (user ? 'authenticated' : null);
        return role;
    },
    getIdentity: async () => {
        const { data } = await supabaseBrowserClient.auth.getUser();

        if (data?.user) {
            return {
                ...data.user,
                name: data.user.email,
            };
        }

        return null;
    },
    onError: async (error) => {
        if (
            (hasCode(error) && (error as { code: unknown }).code === 'PGRST301') ||
            (hasNumericStatus(error) && error.status === 401)
        ) {
            return {
                logout: true,
            };
        }

        return { error };
    },
};
