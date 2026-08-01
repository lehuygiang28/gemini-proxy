import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './constants';

/**
 * Supabase server client for Route Handlers that must write session cookies
 * onto the redirect/response (PKCE code exchange / verifyOtp).
 */
export function createSupabaseRouteHandlerClient(
    request: NextRequest,
    getResponse: () => NextResponse,
    setResponse: (response: NextResponse) => void,
) {
    return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
            get(name: string) {
                return request.cookies.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
                request.cookies.set({ name, value, ...options });
                const response = getResponse();
                response.cookies.set({ name, value, ...options });
                setResponse(response);
            },
            remove(name: string, options: CookieOptions) {
                request.cookies.set({ name, value: '', ...options });
                const response = getResponse();
                response.cookies.set({ name, value: '', ...options });
                setResponse(response);
            },
        },
    });
}

export function safeNextPath(raw: string | null | undefined, fallback = '/dashboard'): string {
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
        return fallback;
    }
    return raw;
}
