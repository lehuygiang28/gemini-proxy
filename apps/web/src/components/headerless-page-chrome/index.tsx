'use client';

import type { ReactNode } from 'react';
import { theme } from 'antd';
import { LanguageSwitcher } from '@components/language-switcher';

type HeaderlessPageChromeProps = {
    children: ReactNode;
};

export function HeaderlessPageChrome({ children }: HeaderlessPageChromeProps) {
    const { token } = theme.useToken();
    const insetBlock = `max(${token.padding}px, env(safe-area-inset-top))`;
    const insetInline = `max(${token.padding}px, env(safe-area-inset-right))`;

    return (
        <div
            style={{
                position: 'relative',
                minHeight: '100dvh',
                background: token.colorBgLayout,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: insetBlock,
                    insetInlineEnd: insetInline,
                    zIndex: 10,
                }}
            >
                <LanguageSwitcher />
            </div>
            {children}
        </div>
    );
}
