'use client';

import React from 'react';
import {
    useRealtimeConnectionStatus,
    type RealtimeConnectionState,
} from '../hooks/use-realtime-connection-status';

interface ConnectionStatusBadgeProps {
    paused?: boolean;
}

/**
 * Live / Connecting / Paused / Offline indicator for the ops console.
 */
export function ConnectionStatusBadge({ paused = false }: ConnectionStatusBadgeProps) {
    const { state, label } = useRealtimeConnectionStatus({ paused });
    return (
        <span className="gp-conn" title={`Realtime: ${label}`}>
            <span className="gp-conn-dot" data-state={state as RealtimeConnectionState} />
            {label}
        </span>
    );
}
