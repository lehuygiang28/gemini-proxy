import '@ant-design/v5-patch-for-react-19';
import '@refinedev/antd/dist/reset.css';
import './globals.css';

import React, { Suspense } from 'react';
import { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';

import { ColorModeContextProvider } from '@contexts/color-mode';
import { DateTimeFormatContextProvider } from '@contexts/datetime-format';
import { DevtoolsProvider } from '@providers/devtools';
import { RefineProvider } from '@providers/refine-provider';
import { IntlClientProvider } from '@i18n/intl-client-provider';
import { DATETIME_FORMAT_COOKIE_NAME, THEME_COOKIE_NAME } from '@constants';
import { parseDatetimeFormatMode } from '@/features/datetime/datetime-format';

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ['latin', 'vietnamese'],
    weight: ['400', '500', '600'],
    variable: '--gp-font-sans',
    display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
    subsets: ['latin'],
    weight: ['400', '500'],
    variable: '--gp-font-mono',
    display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations();
    const title = t('landing.meta.title');
    const description = t('landing.meta.description');

    return {
        title,
        description,
        icons: {
            icon: '/favicon.ico',
        },
        applicationName: 'Gemini Proxy',
        authors: [
            { name: 'Lê Huy Giang', url: 'mailto:lehuygiang28@gmail.com' },
            { name: 'Lê Huy Giang', url: 'https://github.com/lehuygiang28' },
        ],
        keywords: [
            'API Management',
            'Proxy',
            'AI',
            'Gemini',
            'OpenAI',
            'Google',
            'Github',
            'Gemini proxy',
            'Gemini polling',
            'Gemini balance',
            'Gemini rotate',
            'lehuygiang28',
            'lehuygiang28/gemini-proxy',
        ],
        robots: 'index, follow',
        openGraph: {
            title,
            description,
            type: 'website',
        },
    };
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
    themeColor: 'black',
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const cookieStore = await cookies();
    const theme = cookieStore.get(THEME_COOKIE_NAME);
    const defaultMode = theme?.value === 'light' ? 'light' : 'dark';
    const defaultDatetimeFormat = parseDatetimeFormatMode(
        cookieStore.get(DATETIME_FORMAT_COOKIE_NAME)?.value,
    );
    const locale = await getLocale();
    const messages = await getMessages();

    return (
        <html
            lang={locale}
            data-theme={defaultMode}
            className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
        >
            <body className="gp-scrollable-root" style={{ fontFamily: 'var(--gp-font-sans)' }}>
                <Suspense>
                    <AntdRegistry>
                        <ColorModeContextProvider defaultMode={defaultMode} locale={locale}>
                            <DateTimeFormatContextProvider defaultMode={defaultDatetimeFormat}>
                                <IntlClientProvider locale={locale} messages={messages}>
                                    <DevtoolsProvider>
                                        <RefineProvider>{children}</RefineProvider>
                                    </DevtoolsProvider>
                                </IntlClientProvider>
                            </DateTimeFormatContextProvider>
                        </ColorModeContextProvider>
                    </AntdRegistry>
                </Suspense>
            </body>
        </html>
    );
}
