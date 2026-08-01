import { useEffect, useState } from 'react';
import { supabaseBrowserClient } from '@utils/supabase/client';

export type RealtimeConnectionLabel = 'Live' | 'Connecting' | 'Paused' | 'Offline';

export type RealtimeConnectionState = 'live' | 'connecting' | 'paused' | 'offline';

interface UseRealtimeConnectionStatusOptions {
    paused?: boolean;
}

interface UseRealtimeConnectionStatusResult {
    state: RealtimeConnectionState;
    label: RealtimeConnectionLabel;
}

/**
 * Thin reader of Supabase realtime socket state for the connection badge.
 */
export function useRealtimeConnectionStatus(
    options: UseRealtimeConnectionStatusOptions = {},
): UseRealtimeConnectionStatusResult {
    const { paused = false } = options;
    const [socketConnected, setSocketConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);

    useEffect(() => {
        const realtime = supabaseBrowserClient.realtime;
        const syncStatus = () => {
            const status = realtime.connectionState();
            setSocketConnected(status === 'open');
            setIsConnecting(status === 'connecting');
        };
        syncStatus();
        const intervalId = window.setInterval(syncStatus, 2000);
        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    if (paused) {
        return { state: 'paused', label: 'Paused' };
    }
    if (isConnecting && !socketConnected) {
        return { state: 'connecting', label: 'Connecting' };
    }
    if (socketConnected) {
        return { state: 'live', label: 'Live' };
    }
    return { state: 'offline', label: 'Offline' };
}
