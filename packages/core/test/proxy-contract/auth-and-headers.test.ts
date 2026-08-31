import { afterEach, describe, expect, it } from 'vitest';
import {
    CONTRACT_GEMINI_KEY,
    CONTRACT_PROXY_KEY,
    invokeCore,
    originRequests,
    resetContractHarness,
} from './harness';

describe('proxy contract: auth and headers', () => {
    afterEach(() => {
        resetContractHarness();
    });

    it('rejects missing proxy key with 401', async () => {
        const actual = await invokeCore('/gemini/v1beta/models/gemini-flash:generateContent', {
            method: 'POST',
            body: '{}',
        });
        expect(actual.status).toBe(401);
        const body = (await actual.json()) as { message: string };
        expect(body.message).toBe('API key is required');
        expect(originRequests).toHaveLength(0);
    });

    it('rejects unknown proxy key with 401', async () => {
        const actual = await invokeCore(
            '/gemini/v1beta/models/gemini-flash:generateContent',
            {
                method: 'POST',
                headers: { 'x-goog-api-key': CONTRACT_PROXY_KEY },
                body: '{}',
            },
            { proxyKey: null },
        );
        expect(actual.status).toBe(401);
        const body = (await actual.json()) as { message: string };
        expect(body.message).toBe('Provided proxy API key is not valid');
        expect(originRequests).toHaveLength(0);
    });

    it('rejects inactive proxy key with 401', async () => {
        const actual = await invokeCore(
            '/gemini/v1beta/models/gemini-flash:generateContent',
            {
                method: 'POST',
                headers: { 'x-goog-api-key': CONTRACT_PROXY_KEY },
                body: '{}',
            },
            { proxyKeyActive: false },
        );
        expect(actual.status).toBe(401);
        const body = (await actual.json()) as { message: string };
        expect(body.message).toBe('Provided proxy API key is not active');
        expect(originRequests).toHaveLength(0);
    });

    it('strips cookie and x-forwarded-for to origin', async () => {
        const actual = await invokeCore('/gemini/v1beta/models/gemini-flash:generateContent', {
            method: 'POST',
            headers: {
                'x-goog-api-key': CONTRACT_PROXY_KEY,
                cookie: 'session=secret',
                'x-forwarded-for': '1.2.3.4',
                'content-type': 'application/json',
            },
            body: '{}',
        });
        expect(actual.status).toBe(200);
        expect(originRequests).toHaveLength(1);
        const originHeaders = originRequests[0]!.headers;
        expect(originHeaders.get('cookie')).toBeNull();
        expect(originHeaders.get('x-forwarded-for')).toBeNull();
    });

    it('strips x-gproxy-retry-max to origin', async () => {
        const actual = await invokeCore('/gemini/v1beta/models/gemini-flash:generateContent', {
            method: 'POST',
            headers: {
                'x-goog-api-key': CONTRACT_PROXY_KEY,
                'x-gproxy-retry-max': '99',
                'content-type': 'application/json',
            },
            body: '{}',
        });
        expect(actual.status).toBe(200);
        expect(originRequests).toHaveLength(1);
        expect(originRequests[0]!.headers.get('x-gproxy-retry-max')).toBeNull();
    });

    it('forwards gemini secret as x-goog-api-key', async () => {
        const actual = await invokeCore('/gemini/v1beta/models/gemini-flash:generateContent', {
            method: 'POST',
            headers: {
                'x-goog-api-key': CONTRACT_PROXY_KEY,
                'content-type': 'application/json',
            },
            body: '{}',
        });
        expect(actual.status).toBe(200);
        expect(originRequests).toHaveLength(1);
        expect(originRequests[0]!.headers.get('x-goog-api-key')).toBe(CONTRACT_GEMINI_KEY);
    });
});
