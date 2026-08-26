import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient, safeNextPath } from '@utils/supabase/route-handler';

/**
 * Email OTP / recovery confirmation (token_hash).
 * Template: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/update-password`
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type') as EmailOtpType | null;
    const next = safeNextPath(
        searchParams.get('next'),
        type === 'recovery' ? '/update-password' : '/dashboard',
    );

    const errorRedirect = (message: string) => {
        const target =
            type === 'recovery'
                ? `${origin}/forgot-password?error=${encodeURIComponent(message)}`
                : `${origin}/login?error=${encodeURIComponent(message)}`;
        return NextResponse.redirect(target);
    };

    if (!tokenHash || !type) {
        return errorRedirect('missing_auth_token');
    }

    let response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createSupabaseRouteHandlerClient(
        request,
        () => response,
        (nextResponse) => {
            response = nextResponse;
        },
    );

    const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
    });

    if (error) {
        return errorRedirect('auth_confirm_failed');
    }

    return response;
}
