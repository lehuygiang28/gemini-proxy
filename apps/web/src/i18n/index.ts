'use server';

import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, I18N_COOKIE_NAME, I18N_COOKIE_OPTIONS, isAppLocale } from './config';

export async function getUserLocale(): Promise<string> {
    const cookieStore = await cookies();
    const value = cookieStore.get(I18N_COOKIE_NAME)?.value;
    return isAppLocale(value) ? value : DEFAULT_LOCALE;
}

export async function setUserLocale(locale: string): Promise<void> {
    if (!isAppLocale(locale)) {
        return;
    }
    const cookieStore = await cookies();
    cookieStore.set(I18N_COOKIE_NAME, locale, I18N_COOKIE_OPTIONS);
}
