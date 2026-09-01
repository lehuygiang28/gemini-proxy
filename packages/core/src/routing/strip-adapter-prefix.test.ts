import { describe, expect, it } from 'vitest';
import { stripAdapterPrefix } from './strip-adapter-prefix';

describe('stripAdapterPrefix', () => {
    it('strips /api/gproxy from legacy gemini paths', () => {
        expect(
            stripAdapterPrefix('/api/gproxy/gemini/v1beta/models/gemini-flash:generateContent'),
        ).toBe('/gemini/v1beta/models/gemini-flash:generateContent');
    });

    it('strips /api/gproxy from canonical /v1 paths', () => {
        expect(stripAdapterPrefix('/api/gproxy/v1/chat/completions')).toBe('/v1/chat/completions');
    });

    it('leaves coreApp-relative paths unchanged', () => {
        expect(stripAdapterPrefix('/gemini/v1beta/models/gemini-flash:generateContent')).toBe(
            '/gemini/v1beta/models/gemini-flash:generateContent',
        );
    });
});
