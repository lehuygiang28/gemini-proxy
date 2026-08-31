import { describe, expect, it } from 'vitest';
import { estimateAdmitTokens } from './estimate-admit';

describe('estimateAdmitTokens', () => {
    it('defaults to 8192 when peeked max output is unset', () => {
        expect(estimateAdmitTokens({ peekedMaxOutput: undefined })).toBe(8192);
    });

    it('uses peeked max output when present', () => {
        expect(estimateAdmitTokens({ peekedMaxOutput: 4096 })).toBe(4096);
    });

    it('ignores fractional peeked values', () => {
        expect(estimateAdmitTokens({ peekedMaxOutput: 1.5 })).toBe(8192);
    });

    it('ignores non-positive peeked values', () => {
        expect(estimateAdmitTokens({ peekedMaxOutput: 0 })).toBe(8192);
        expect(estimateAdmitTokens({ peekedMaxOutput: -1 })).toBe(8192);
    });
});
