'use client';

import { useGetIdentity, useList } from '@refinedev/core';
import {
    resolveQuotaTimezoneState,
    type QuotaTimezoneState,
} from '@/features/datetime/datetime-format';
import type { UserSettings } from '@/features/settings/types';

type Identity = { id?: string };

/**
 * Quota timezone from user_settings. Shared across DateTimeDisplay instances via Refine query cache.
 * Missing settings row uses UTC (same as quota windows). Invalid stored zones stay intact for Auto → exact.
 */
export function useUserQuotaTimezone(): QuotaTimezoneState {
    const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
    const userId = identity?.id;
    const { result, query } = useList<UserSettings>({
        resource: 'user_settings',
        filters: userId ? [{ field: 'id', operator: 'eq', value: userId }] : [],
        pagination: { currentPage: 1, pageSize: 1 },
        queryOptions: { enabled: Boolean(userId) },
    });

    return resolveQuotaTimezoneState({
        identityReady: Boolean(userId) && !identityLoading,
        settingsQueryEnabled: Boolean(userId),
        settingsFetched: Boolean(query.isFetched),
        timezone: result?.data?.[0]?.timezone,
    });
}
