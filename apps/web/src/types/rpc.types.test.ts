import { describe, expect, it } from 'vitest';
import { validateRpcParams, validateRpcResponse } from './rpc.types';

describe('validateRpcParams', () => {
    it('accepts reconcile_proxy_request with a non-empty request id', () => {
        expect(validateRpcParams({ p_request_id: 'req-1' }, 'reconcile_proxy_request')).toBe(true);
    });

    it('rejects reconcile_proxy_request without p_request_id', () => {
        expect(validateRpcParams({}, 'reconcile_proxy_request')).toBe(false);
        expect(validateRpcParams({ p_request_id: '' }, 'reconcile_proxy_request')).toBe(false);
    });
});

describe('validateRpcResponse', () => {
    it('accepts void/null for reconcile_proxy_request', () => {
        expect(validateRpcResponse(null, 'reconcile_proxy_request')).toBe(true);
        expect(validateRpcResponse(undefined, 'reconcile_proxy_request')).toBe(true);
    });

    it('rejects a payload object for reconcile_proxy_request', () => {
        expect(validateRpcResponse({ ok: true }, 'reconcile_proxy_request')).toBe(false);
    });
});
