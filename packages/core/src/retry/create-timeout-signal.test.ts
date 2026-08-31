import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTimeoutSignal, mergeAbortSignals } from './create-timeout-signal';

describe('createTimeoutSignal', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('aborts after the configured timeout', () => {
        const signal = createTimeoutSignal(50);
        expect(signal.aborted).toBe(false);
        vi.advanceTimersByTime(50);
        expect(signal.aborted).toBe(true);
    });
});

describe('mergeAbortSignals', () => {
    it('aborts when the first input signal aborts', () => {
        const first = new AbortController();
        const second = new AbortController();
        const merged = mergeAbortSignals([first.signal, second.signal]);
        expect(merged.aborted).toBe(false);
        first.abort();
        expect(merged.aborted).toBe(true);
    });

    it('aborts when the second input signal aborts', () => {
        const first = new AbortController();
        const second = new AbortController();
        const merged = mergeAbortSignals([first.signal, second.signal]);
        expect(merged.aborted).toBe(false);
        second.abort();
        expect(merged.aborted).toBe(true);
    });

    it('returns a non-aborted signal for an empty array', () => {
        const merged = mergeAbortSignals([]);
        expect(merged.aborted).toBe(false);
    });

    it('returns the same signal for a single-element array', () => {
        const controller = new AbortController();
        const merged = mergeAbortSignals([controller.signal]);
        expect(merged).toBe(controller.signal);
    });
});
