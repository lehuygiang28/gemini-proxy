export const I18N_COOKIE_NAME = 'NEXT_LOCALE';
export const DEFAULT_LOCALE = 'en';
export const SUPPORTED_LOCALES = ['en', 'vi'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

/** Shared by server `cookies().set` and client `Cookies.set`. No maxAge — match theme cookie. */
export const I18N_COOKIE_OPTIONS = {
    path: '/',
    sameSite: 'lax',
} as const;

export function isAppLocale(value: string | undefined): value is AppLocale {
    return value === 'en' || value === 'vi';
}
