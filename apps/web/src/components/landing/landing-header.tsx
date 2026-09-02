'use client';

import Link from 'next/link';
import { Avatar } from 'antd';
import { useGetIdentity, useTranslation } from '@refinedev/core';
import { LanguageSwitcher } from '@components/language-switcher';

const GITHUB_REPO = 'https://github.com/lehuygiang28/gemini-proxy';

type LandingUser = {
    id: string;
    avatar?: string;
    email?: string;
    name?: string;
};

/**
 * Builds two-letter initials for the landing account avatar.
 */
function initialsFrom(user: LandingUser): string {
    const source = user.name?.trim() || user.email?.trim() || '?';
    const parts = source.split(/[\s@._-]+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
}

/**
 * Sign-in link, or a dashboard user control when a session exists.
 */
function LandingAccountLink() {
    const { translate } = useTranslation();
    const { data: user, isPending } = useGetIdentity<LandingUser>();

    if (isPending) {
        return <span className="gp-landing-account is-pending" aria-hidden />;
    }

    if (!user) {
        return (
            <Link href="/login" className="gp-landing-account">
                {translate('landing.nav.signIn')}
            </Link>
        );
    }

    return (
        <Link href="/dashboard" className="gp-landing-account">
            <Avatar
                size={24}
                src={user.avatar || undefined}
                alt=""
                className="gp-landing-account-avatar"
            >
                {user.avatar ? null : initialsFrom(user)}
            </Avatar>
            {translate('landing.nav.dashboard')}
        </Link>
    );
}

/**
 * Public landing top bar: wordmark, GitHub, account control, locale switcher.
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
                    <LanguageSwitcher />
                    <LandingAccountLink />
                </nav>
            </div>
        </header>
    );
}
