import React from 'react';
import { useTranslation } from '@refinedev/core';
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
    const { translate } = useTranslation();
    const { state } = useRealtimeConnectionStatus({ paused });
    const label = translate(`observability.connection.${state}`);
    return (
        <span className="gp-conn" title={translate('observability.realtimeTitle', { label })}>
            <span className="gp-conn-dot" data-state={state as RealtimeConnectionState} />
            {label}
        </span>
    );
}
