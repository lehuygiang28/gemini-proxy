import { describe, expect, it } from 'vitest';
import { estimateAdmitTokens } from './estimate-admit';

describe('estimateAdmitTokens', () => {
    it('defaults to 8192 when neither peeked nor policy is set', () => {
        expect(
            estimateAdmitTokens({
                peekedMaxOutput: undefined,
                policyMaxOutput: null,
            }),
        ).toBe(8192);
    });

    it('uses peeked max output when policy is unset', () => {
        expect(
            estimateAdmitTokens({
                peekedMaxOutput: 4096,
                policyMaxOutput: null,
            }),
        ).toBe(4096);
    });

    it('uses policy max output when peeked is unset', () => {
        expect(
            estimateAdmitTokens({
                peekedMaxOutput: undefined,
                policyMaxOutput: 2048,
            }),
        ).toBe(2048);
    });

    it('uses the minimum of peeked and policy when both are set', () => {
        expect(
            estimateAdmitTokens({
                peekedMaxOutput: 4096,
                policyMaxOutput: 2048,
            }),
        ).toBe(2048);
        expect(
            estimateAdmitTokens({
                peekedMaxOutput: 1024,
                policyMaxOutput: 8192,
            }),
        ).toBe(1024);
    });

    it('ignores non-positive peeked and policy values', () => {
        expect(
            estimateAdmitTokens({
                peekedMaxOutput: 0,
                policyMaxOutput: null,
            }),
        ).toBe(8192);
        expect(
            estimateAdmitTokens({
                peekedMaxOutput: -1,
                policyMaxOutput: 2048,
            }),
        ).toBe(2048);
        expect(
            estimateAdmitTokens({
                peekedMaxOutput: 4096,
                policyMaxOutput: 0,
            }),
        ).toBe(4096);
    });
});
