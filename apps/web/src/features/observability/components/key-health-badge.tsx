import React from 'react';
import { useTranslation } from '@refinedev/core';
import { resolveKeyBadgeState } from '../api-key-cooldown';

interface KeyHealthBadgeProps {
    isActive: boolean;
    successRate: number;
    failureCount: number;
    cooldownUntil?: string | null;
}

/**
 * Compact key health chip for lists and the health panel.
 */
export function KeyHealthBadge({
    isActive,
    successRate,
    failureCount,
    cooldownUntil,
}: KeyHealthBadgeProps) {
    const { translate } = useTranslation();
    const state = resolveKeyBadgeState({
        isActive,
        successRate,
        failureCount,
        cooldownUntil,
        nowMs: Date.now(),
    });
    const label =
        state === 'disabled'
            ? translate('observability.healthDisabled')
            : state === 'cooldown'
              ? translate('observability.healthCooldown')
              : `${successRate}%`;
    return (
        <span
            className="gp-chip"
            data-state={state}
            title={translate('observability.successRateTitle', { rate: successRate })}
        >
            <span className="gp-chip-dot" />
            {label}
        </span>
    );
}
