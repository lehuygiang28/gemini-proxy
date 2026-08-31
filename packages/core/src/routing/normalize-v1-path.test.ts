import { describe, expect, it } from 'vitest';
import { normalizeV1Path } from './normalize-v1-path';

describe('normalizeV1Path', () => {
    it('keeps /v1/models paths', () => {
        expect(normalizeV1Path('/v1/models/gemini-flash:generateContent')).toBe(
            '/v1/models/gemini-flash:generateContent',
        );
    });

    it('collapses /v1/v1/models to /v1/models', () => {
        expect(normalizeV1Path('/v1/v1/models/gemini-flash:generateContent')).toBe(
            '/v1/models/gemini-flash:generateContent',
        );
    });

    it('rewrites /v1/v1beta/models to /v1beta/models', () => {
        expect(normalizeV1Path('/v1/v1beta/models/gemini-flash:generateContent')).toBe(
            '/v1beta/models/gemini-flash:generateContent',
        );
    });
});
