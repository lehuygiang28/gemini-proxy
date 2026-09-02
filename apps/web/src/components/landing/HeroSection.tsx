'use client';

import Link from 'next/link';
import { useTranslation } from '@refinedev/core';
import { LandingCodePanel } from './code-panel';

const GITHUB_REPO = 'https://github.com/lehuygiang28/gemini-proxy';
const FACTS = ['pool', 'failover', 'logs', 'deploy'] as const;

type HeroSectionProps = {
    origin: string;
};

/**
 * Ops-dense hero: headline, CTAs, highlighted /v1 snippets, four facts.
 */
export function HeroSection({ origin }: HeroSectionProps) {
    const { translate } = useTranslation();
    const headline = translate('landing.hero.headline', { path: '/v1' });
    const [headlineBefore, headlineAfter] = headline.split('/v1');

    return (
        <section className="gp-landing-hero">
            <div className="gp-landing-wrap">
                <div className="gp-landing-hero-grid">
                    <div>
                        <p className="gp-landing-eyebrow">{translate('landing.hero.eyebrow')}</p>
                        <h1 className="gp-landing-title">
                            {headlineBefore}
                            <span className="gp-landing-title-path">/v1</span>
                            {headlineAfter}
                        </h1>
                        <p className="gp-landing-body">{translate('landing.hero.body')}</p>
                        <div className="gp-landing-actions">
                            <Link href="/dashboard" className="gp-landing-cta gp-landing-cta-lg">
                                {translate('landing.hero.getStarted')}
                            </Link>
                            <Link
                                href={GITHUB_REPO}
                                target="_blank"
                                className="gp-landing-cta-ghost"
                            >
                                {translate('landing.hero.github')}
                            </Link>
                            <span className="gp-landing-mit">{translate('landing.hero.mit')}</span>
                        </div>
                    </div>
                    <LandingCodePanel origin={origin} />
                </div>
                <div className="gp-landing-facts">
                    {FACTS.map((fact) => (
                        <div className="gp-landing-fact" key={fact}>
                            <h2>{translate(`landing.facts.${fact}.title`)}</h2>
                            <p>{translate(`landing.facts.${fact}.body`)}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
