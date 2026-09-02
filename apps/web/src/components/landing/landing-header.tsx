'use client';

import Link from 'next/link';
import { useTranslation } from '@refinedev/core';
import { LanguageSwitcher } from '@components/language-switcher';

const GITHUB_REPO = 'https://github.com/lehuygiang28/gemini-proxy';

/**
 * Public landing top bar: wordmark, GitHub, get started, locale switcher.
 */
export function LandingHeader() {
    const { translate } = useTranslation();

    return (
        <header className="gp-landing-header">
            <div className="gp-landing-header-inner">
                <Link href="/" className="gp-landing-wordmark">
                    Gemini Proxy
                </Link>
                <nav className="gp-landing-nav">
                    <Link
                        href={GITHUB_REPO}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gp-landing-nav-link"
                    >
                        {translate('landing.nav.github')}
                    </Link>
                    <Link href="/dashboard" className="gp-landing-cta">
                        {translate('landing.nav.getStarted')}
                    </Link>
                    <LanguageSwitcher />
                </nav>
            </div>
        </header>
    );
}
