import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient, safeNextPath } from '@utils/supabase/route-handler';

/**
 * Exchange Supabase Auth PKCE `code` for a session cookie, then redirect.
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = safeNextPath(searchParams.get('next'), '/dashboard');
    const isRecovery = next.startsWith('/update-password');

    const errorRedirect = (message: string) =>
        NextResponse.redirect(
            `${origin}${isRecovery ? '/forgot-password' : '/login'}?error=${encodeURIComponent(message)}`,
        );

    if (!code) {
        return errorRedirect('missing_auth_code');
    }

    let response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createSupabaseRouteHandlerClient(
        request,
        () => response,
        (nextResponse) => {
            response = nextResponse;
        },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
        return errorRedirect('auth_callback_failed');
    }

    return response;
}
