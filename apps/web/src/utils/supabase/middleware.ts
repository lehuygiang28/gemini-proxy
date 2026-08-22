import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './constants';
import { safeNextPath } from './route-handler';

export async function updateSession(request: NextRequest) {
    // Supabase PKCE returns ?code= on the redirectTo URL — route it to the exchanger.
    const authCode = request.nextUrl.searchParams.get('code');
    if (authCode && !request.nextUrl.pathname.startsWith('/auth/callback')) {
        const callbackUrl = request.nextUrl.clone();
        callbackUrl.pathname = '/auth/callback';
        // Keep the landing path (e.g. /update-password) as `next`, not always /dashboard.
        if (!callbackUrl.searchParams.get('next')) {
            const fromPath = safeNextPath(request.nextUrl.pathname, '/dashboard');
            callbackUrl.searchParams.set(
                'next',
                fromPath === '/' ? '/dashboard' : fromPath,
            );
        }
        return NextResponse.redirect(callbackUrl);
    }

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
            get(name: string) {
                return request.cookies.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
                request.cookies.set({
                    name,
                    value,
                    ...options,
                });
                response = NextResponse.next({
                    request: {
                        headers: request.headers,
                    },
                });
                response.cookies.set({
                    name,
                    value,
                    ...options,
                });
            },
            remove(name: string, options: CookieOptions) {
                request.cookies.set({
                    name,
                    value: '',
                    ...options,
                });
                response = NextResponse.next({
                    request: {
                        headers: request.headers,
                    },
                });
                response.cookies.set({
                    name,
                    value: '',
                    ...options,
                });
            },
        },
    });

    await supabase.auth.getUser();

    return response;
}
