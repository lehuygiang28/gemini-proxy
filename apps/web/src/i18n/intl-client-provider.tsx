'use client';

import type { ComponentProps, ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getIntlMessageFallback, onIntlError } from './intl-errors';

type IntlClientProviderProps = {
    locale: string;
    messages: ComponentProps<typeof NextIntlClientProvider>['messages'];
    children: ReactNode;
};

export function IntlClientProvider({ locale, messages, children }: IntlClientProviderProps) {
    return (
        <NextIntlClientProvider
            locale={locale}
            messages={messages}
            onError={onIntlError}
            getMessageFallback={getIntlMessageFallback}
        >
            {children}
        </NextIntlClientProvider>
    );
}
