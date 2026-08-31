import { describe, expect, it } from 'vitest';
import { normalizeTimezone } from './normalize-timezone';

describe('normalizeTimezone', () => {
    it('keeps a supported IANA timezone', () => {
        expect(normalizeTimezone('Asia/Bangkok')).toBe('Asia/Bangkok');
        expect(normalizeTimezone('UTC')).toBe('UTC');
    });

    it('rejects an invalid timezone without falling back to UTC', () => {
        expect(() => normalizeTimezone('Not/A_Zone')).toThrow(/invalid timezone/i);
    });
});
