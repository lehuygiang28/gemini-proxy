import { describe, expect, it } from 'vitest';
import { requestLogTableSpinning } from './request-log-table-query-ui';

describe('requestLogTableSpinning', () => {
    it('spins on the initial load', () => {
        expect(
            requestLogTableSpinning({
                isLoading: true,
                isFetching: true,
                userInitiated: false,
            }),
        ).toBe(true);
    });

    it('stays quiet for live refetches the user did not start', () => {
        expect(
            requestLogTableSpinning({
                isLoading: false,
                isFetching: true,
                userInitiated: false,
            }),
        ).toBe(false);
    });

    it('spins immediately when the user sorts, filters, or pages', () => {
        expect(
            requestLogTableSpinning({
                isLoading: false,
                isFetching: false,
                userInitiated: true,
            }),
        ).toBe(true);
        expect(
            requestLogTableSpinning({
                isLoading: false,
                isFetching: true,
                userInitiated: true,
            }),
        ).toBe(true);
    });
});
