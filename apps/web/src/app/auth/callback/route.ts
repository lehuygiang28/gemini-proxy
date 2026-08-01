import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@utils/supabase/constants';

/**
 * Exchange Supabase Auth PKCE `code` for a session cookie, then redirect.
 * Required for email confirm / magic link / OAuth with @supabase/ssr.
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const nextParam = searchParams.get('next') ?? '/dashboard';
    const next = nextParam.startsWith('/') ? nextParam : '/dashboard';

    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=missing_auth_code`);
    }

    let response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
            get(name: string) {
                return request.cookies.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
                request.cookies.set({ name, value, ...options });
                response = NextResponse.redirect(`${origin}${next}`);
                response.cookies.set({ name, value, ...options });
            },
            remove(name: string, options: CookieOptions) {
                request.cookies.set({ name, value: '', ...options });
                response = NextResponse.redirect(`${origin}${next}`);
                response.cookies.set({ name, value: '', ...options });
            },
        },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
        return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent(error.message || 'auth_callback_failed')}`,
        );
    }

    return response;
}
