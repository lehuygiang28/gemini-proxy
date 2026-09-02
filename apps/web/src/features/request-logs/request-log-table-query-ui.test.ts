import { describe, expect, it } from 'vitest';
import {
    REQUEST_LOG_TABLE_BUSY_MIN_MS,
    requestLogTableBusyClearDelayMs,
    requestLogTableSpinning,
} from './request-log-table-query-ui';

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

describe('requestLogTableBusyClearDelayMs', () => {
    it('holds the overlay while the user query is still fetching', () => {
        expect(
            requestLogTableBusyClearDelayMs({
                isFetching: true,
                userInitiated: true,
                elapsedMs: 20,
            }),
        ).toBeNull();
    });

    it('keeps a minimum visible overlay after a fast user query', () => {
        expect(
            requestLogTableBusyClearDelayMs({
                isFetching: false,
                userInitiated: true,
                elapsedMs: 40,
            }),
        ).toBe(REQUEST_LOG_TABLE_BUSY_MIN_MS - 40);
        expect(
            requestLogTableBusyClearDelayMs({
                isFetching: false,
                userInitiated: true,
                elapsedMs: REQUEST_LOG_TABLE_BUSY_MIN_MS + 20,
            }),
        ).toBe(0);
    });

    it('does not schedule a clear when the user did not start the query', () => {
        expect(
            requestLogTableBusyClearDelayMs({
                isFetching: false,
                userInitiated: false,
                elapsedMs: 10,
            }),
        ).toBeNull();
    });
});
