'use client';

import React from 'react';

interface KeyHealthBadgeProps {
    isActive: boolean;
    successRate: number;
    failureCount: number;
}

function resolveHealthState(
    isActive: boolean,
    successRate: number,
    failureCount: number,
): 'active' | 'degraded' | 'disabled' {
    if (!isActive) {
        return 'disabled';
    }
    if (failureCount > 0 && successRate < 90) {
        return 'degraded';
    }
    return 'active';
}

/**
 * Compact key health chip for lists and the health panel.
 */
export function KeyHealthBadge({ isActive, successRate, failureCount }: KeyHealthBadgeProps) {
    const state = resolveHealthState(isActive, successRate, failureCount);
    const label =
        state === 'disabled'
            ? 'disabled'
            : state === 'degraded'
              ? `${successRate}%`
              : `${successRate}%`;
    return (
        <span className="gp-chip" data-state={state} title={`Success ${successRate}%`}>
            <span className="gp-chip-dot" />
            {label}
        </span>
    );
}
