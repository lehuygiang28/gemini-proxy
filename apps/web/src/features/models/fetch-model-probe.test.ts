import { describe, expect, it, vi } from 'vitest';
import { fetchModelProbe } from './fetch-model-probe';

describe('fetchModelProbe', () => {
    it('returns success when the probe route succeeds', async () => {
        const fetchImpl = vi.fn(
            async () =>
                new Response(JSON.stringify({ ok: true, model: 'gemini-2.0-flash' }), {
                    status: 200,
                }),
        );
        const actual = await fetchModelProbe({
            model: 'gemini-2.0-flash',
            fetchImpl,
        });
        expect(actual).toEqual({ ok: true, model: 'gemini-2.0-flash' });
        expect(fetchImpl).toHaveBeenCalledWith('/api/models/probe', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ model: 'gemini-2.0-flash', apiKeyId: undefined }),
        });
    });

    it('surfaces upstream errors from the probe route', async () => {
        const fetchImpl = vi.fn(
            async () =>
                new Response(
                    JSON.stringify({ ok: false, error: 'Model not found', status: 404 }),
                    { status: 502 },
                ),
        );
        const actual = await fetchModelProbe({
            model: 'gemini-missing',
            fetchImpl,
        });
        expect(actual).toEqual({ ok: false, error: 'Model not found', status: 404 });
    });
});
