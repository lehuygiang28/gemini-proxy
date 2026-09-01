import { describe, expect, it } from 'vitest';
import { isSupportedIanaTimeZone } from './iana-timezone';

describe('isSupportedIanaTimeZone', () => {
    it('accepts UTC and Asia/Bangkok', () => {
        expect(isSupportedIanaTimeZone('UTC')).toBe(true);
        expect(isSupportedIanaTimeZone('Asia/Bangkok')).toBe(true);
    });

    it('rejects empty, unknown, and non-IANA values', () => {
        expect(isSupportedIanaTimeZone('')).toBe(false);
        expect(isSupportedIanaTimeZone('Not/A_Zone')).toBe(false);
        expect(isSupportedIanaTimeZone('EST')).toBe(false);
    });
});
