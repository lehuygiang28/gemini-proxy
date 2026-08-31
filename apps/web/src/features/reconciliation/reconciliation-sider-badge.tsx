'use client';

import React, { type ReactNode } from 'react';
import { Badge } from 'antd';
import { useList } from '@refinedev/core';
import { RECONCILIATION_RESOURCE, unresolvedReconciliationFilters } from './unresolved-filters';

/**
 * Sider count of unresolved reservations. Refine liveMode + 30s refetch;
 * no useEffect polling.
 */
export function ReconciliationSiderBadge({ children }: { children: ReactNode }) {
    const { result } = useList({
        resource: RECONCILIATION_RESOURCE,
        filters: unresolvedReconciliationFilters(),
        pagination: { currentPage: 1, pageSize: 1 },
        liveMode: 'auto',
        queryOptions: { refetchInterval: 30_000 },
    });
    const unresolvedCount = result?.total ?? 0;
    if (unresolvedCount <= 0) {
        return <>{children}</>;
    }
    return (
        <Badge count={unresolvedCount} size="small" offset={[10, 0]}>
            {children}
        </Badge>
    );
}
