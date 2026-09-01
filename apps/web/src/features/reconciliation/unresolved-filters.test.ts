import { describe, expect, it } from 'vitest';
import { unresolvedReconciliationFilters } from './unresolved-filters';

describe('unresolvedReconciliationFilters', () => {
    it('lists only rows that still need reconcile', () => {
        expect(unresolvedReconciliationFilters()).toEqual([
            { field: 'resolved_at', operator: 'null', value: true },
        ]);
    });
});
