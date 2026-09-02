'use client';

import Link from 'next/link';
import { useTranslation } from '@refinedev/core';

const GITHUB_REPO = 'https://github.com/lehuygiang28/gemini-proxy';
const AUTHOR_URL = 'https://github.com/lehuygiang28';

/**
 * Compact landing footer with product links and a single copyright line.
 */
export function FooterSection() {
    const { translate } = useTranslation();
    const year = new Date().getFullYear();

    return (
        <footer className="gp-landing-footer">
            <div className="gp-landing-wrap">
                <div className="gp-landing-footer-top">
                    <div>
                        <Link href="/" className="gp-landing-wordmark">
                            Gemini Proxy
                        </Link>
                        <p className="gp-landing-footer-blurb">
                            {translate('landing.footer.blurb')}
                        </p>
                    </div>
                    <div className="gp-landing-footer-links">
                        <Link href="/dashboard">{translate('landing.footer.dashboard')}</Link>
                        <Link href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
                            {translate('landing.footer.github')}
                        </Link>
                        <Link
                            href={`${GITHUB_REPO}/issues`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {translate('landing.footer.issues')}
                        </Link>
                    </div>
                </div>
                <div className="gp-landing-footer-bottom">
                    <p className="gp-landing-footer-copy">
                        {translate('landing.footer.copyright', { year })}{' '}
                        <Link href={AUTHOR_URL} target="_blank" rel="noopener noreferrer">
                            lehuygiang28
                        </Link>
                    </p>
                </div>
            </div>
        </footer>
    );
}
