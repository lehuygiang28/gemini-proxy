'use client';

import { useTranslation } from '@refinedev/core';

const MODES = ['web', 'api', 'edge'] as const;

/**
 * Compact deploy strip: Next.js, standalone API, edge.
 */
export function DeploymentSection() {
    const { translate } = useTranslation();

    return (
        <section className="gp-landing-deploy">
            <div className="gp-landing-wrap">
                <p className="gp-landing-eyebrow">{translate('landing.deploy.eyebrow')}</p>
                <h2 className="gp-landing-deploy-heading">{translate('landing.deploy.heading')}</h2>
                <div className="gp-landing-deploy-grid">
                    {MODES.map((mode) => (
                        <div className="gp-landing-deploy-cell" key={mode}>
                            <h3>{translate(`landing.deploy.${mode}.title`)}</h3>
                            <p>{translate(`landing.deploy.${mode}.meta`)}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
