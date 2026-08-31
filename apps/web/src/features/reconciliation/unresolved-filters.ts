import type { CrudFilters } from '@refinedev/core';

export const RECONCILIATION_RESOURCE = 'proxy_reconciliation_needed';

/**
 * Unresolved stale reservations. Refine `null` operator plus liveProvider
 * encoding (`column=is.null`) from createLiveProvider.
 */
export function unresolvedReconciliationFilters(): CrudFilters {
    return [{ field: 'resolved_at', operator: 'null', value: true }];
}
