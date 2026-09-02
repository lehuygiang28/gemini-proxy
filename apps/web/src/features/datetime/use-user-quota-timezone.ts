'use client';

import { useGetIdentity, useList } from '@refinedev/core';
import type { UserSettings } from '@/features/settings/types';

type Identity = { id?: string };

/**
 * Quota timezone from user_settings. Shared across DateTimeDisplay instances via Refine query cache.
 */
export function useUserQuotaTimezone(): string | undefined {
    const { data: identity } = useGetIdentity<Identity>();
    const userId = identity?.id;
    const { result } = useList<UserSettings>({
        resource: 'user_settings',
        filters: userId ? [{ field: 'id', operator: 'eq', value: userId }] : [],
        pagination: { currentPage: 1, pageSize: 1 },
        queryOptions: { enabled: Boolean(userId) },
    });

    return result?.data?.[0]?.timezone;
}
