export const I18N_COOKIE_NAME = 'NEXT_LOCALE';
export const DEFAULT_LOCALE = 'en';
export const SUPPORTED_LOCALES = ['en', 'vi'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export function isAppLocale(value: string | undefined): value is AppLocale {
    return value === 'en' || value === 'vi';
}
