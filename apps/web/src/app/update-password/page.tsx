import { UpdatePasswordClient } from './update-password-client';

/**
 * Password recovery landing page.
 * Session may arrive via cookies (after /auth/confirm or /auth/callback),
 * PKCE ?code=, or hash tokens — handled client-side.
 */
export default function UpdatePasswordPage() {
    return <UpdatePasswordClient />;
}
