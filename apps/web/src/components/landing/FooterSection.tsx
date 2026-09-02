'use client';

import Link from 'next/link';
import { useTranslation } from '@refinedev/core';

const GITHUB_REPO = 'https://github.com/lehuygiang28/gemini-proxy';

/**
 * Compact landing footer with dashboard, GitHub, and stack line.
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
                    <span>{translate('landing.footer.stack')}</span>
                    <span>
                        {translate('landing.footer.copyright', { year })}{' '}
                        <Link
                            href="https://github.com/lehuygiang28"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            lehuygiang28
                        </Link>
                    </span>
                </div>
            </div>
        </footer>
    );
}
