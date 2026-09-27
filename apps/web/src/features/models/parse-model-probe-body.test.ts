import { describe, expect, it } from 'vitest';
import { parseModelProbeBody } from './parse-model-probe-body';

describe('parseModelProbeBody', () => {
    it('accepts an empty object', () => {
        expect(parseModelProbeBody({})).toEqual({ ok: true, body: {} });
    });

    it('rejects null and non-object bodies', () => {
        expect(parseModelProbeBody(null)).toEqual({ ok: false, error: 'invalid_body' });
        expect(parseModelProbeBody('x')).toEqual({ ok: false, error: 'invalid_body' });
    });

    it('rejects non-string model or apiKeyId fields', () => {
        expect(parseModelProbeBody({ model: 1 })).toEqual({ ok: false, error: 'invalid_body' });
        expect(parseModelProbeBody({ apiKeyId: false })).toEqual({
            ok: false,
            error: 'invalid_body',
        });
    });
});
