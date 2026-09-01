import { describe, expect, it } from 'vitest';
import { detectApiFormat } from './detect-api-format';

const VALID_KEY = 'AIzaGPROXY_abcdefghijklmnopqr';

describe('detectApiFormat', () => {
    it('uses goog header as Gemini on /v1', () => {
        const actual = detectApiFormat({
            path: '/v1/chat/completions',
            header: (name) => (name.toLowerCase() === 'x-goog-api-key' ? VALID_KEY : undefined),
        });
        expect(actual).toEqual({ apiFormat: 'gemini' });
    });

    it('uses Bearer as OpenAI on /v1 generateContent', () => {
        const actual = detectApiFormat({
            path: '/v1/models/gemini-flash:generateContent',
            header: (name) =>
                name.toLowerCase() === 'authorization' ? `Bearer ${VALID_KEY}` : undefined,
        });
        expect(actual).toEqual({ apiFormat: 'openai' });
    });

    it('returns conflicting_credentials when both headers are present', () => {
        const actual = detectApiFormat({
            path: '/v1/models/gemini-flash:generateContent',
            header: (name) => {
                if (name.toLowerCase() === 'x-goog-api-key') return VALID_KEY;
                if (name.toLowerCase() === 'authorization') return `Bearer ${VALID_KEY}`;
                return undefined;
            },
        });
        expect(actual).toEqual({ error: 'conflicting_credentials' });
    });

    it('returns missing_credential when /v1 has no credential', () => {
        const actual = detectApiFormat({
            path: '/v1/models/gemini-flash:generateContent',
            header: () => undefined,
        });
        expect(actual).toEqual({ error: 'missing_credential' });
    });

    it('keeps Gemini from a legacy /gemini path', () => {
        const actual = detectApiFormat({
            path: '/gemini/v1beta/models/gemini-flash:generateContent',
            header: (name) =>
                name.toLowerCase() === 'authorization' ? `Bearer ${VALID_KEY}` : undefined,
        });
        expect(actual).toEqual({ apiFormat: 'gemini' });
    });

    it('still conflicts on a legacy path when both headers are present', () => {
        const actual = detectApiFormat({
            path: '/gemini/v1beta/models/gemini-flash:generateContent',
            header: (name) => {
                if (name.toLowerCase() === 'x-goog-api-key') return VALID_KEY;
                if (name.toLowerCase() === 'authorization') return `Bearer ${VALID_KEY}`;
                return undefined;
            },
        });
        expect(actual).toEqual({ error: 'conflicting_credentials' });
    });
});
