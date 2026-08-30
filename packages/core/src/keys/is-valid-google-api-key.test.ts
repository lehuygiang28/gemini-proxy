import { describe, expect, it } from 'vitest';
import { isValidGoogleApiKey } from './is-valid-google-api-key';

const LEGACY_KEY = 'AIzaSyTESTKEY000000000000000000000';
const AUTH_KEY = 'AQ.TESTAUTHKEY0000000000000000000000';

describe('isValidGoogleApiKey', () => {
    it('accepts legacy AIza Google API keys', () => {
        expect(isValidGoogleApiKey(LEGACY_KEY)).toBe(true);
    });

    it('accepts new AQ. Google auth API keys', () => {
        expect(isValidGoogleApiKey(AUTH_KEY)).toBe(true);
    });

    it('accepts AQ. keys after trimming whitespace', () => {
        expect(isValidGoogleApiKey(`  ${AUTH_KEY}  `)).toBe(true);
    });

    it('rejects empty and short values', () => {
        expect(isValidGoogleApiKey('')).toBe(false);
        expect(isValidGoogleApiKey('   ')).toBe(false);
        expect(isValidGoogleApiKey('AQ.short')).toBe(false);
        expect(isValidGoogleApiKey('AIzaSy')).toBe(false);
    });

    it('rejects masked keys', () => {
        expect(isValidGoogleApiKey('AIzaSy****abcd123456')).toBe(false);
        expect(isValidGoogleApiKey('AQ.TESTAUTH••••••••••••••••••')).toBe(false);
    });

    it('still accepts other unmasked secrets of sufficient length', () => {
        expect(isValidGoogleApiKey('gproxy_custom_secret_1')).toBe(true);
        expect(isValidGoogleApiKey('GK.future-format-key-value-xx')).toBe(true);
    });
});
