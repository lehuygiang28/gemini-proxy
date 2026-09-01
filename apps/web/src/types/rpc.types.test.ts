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

    it('accepts reset_proxy_key_quota with id and windows', () => {
        expect(
            validateRpcParams(
                { p_proxy_key_id: 'key-1', p_window_types: ['day'] },
                'reset_proxy_key_quota',
            ),
        ).toBe(true);
    });

    it('rejects reset_proxy_key_quota without windows', () => {
        expect(validateRpcParams({ p_proxy_key_id: 'key-1' }, 'reset_proxy_key_quota')).toBe(false);
        expect(
            validateRpcParams(
                { p_proxy_key_id: 'key-1', p_window_types: [] },
                'reset_proxy_key_quota',
            ),
        ).toBe(false);
    });

    it('rejects reset_proxy_key_quota with unknown or duplicate windows', () => {
        expect(
            validateRpcParams(
                { p_proxy_key_id: 'key-1', p_window_types: ['week'] },
                'reset_proxy_key_quota',
            ),
        ).toBe(false);
        expect(
            validateRpcParams(
                { p_proxy_key_id: 'key-1', p_window_types: ['minute', 'minute'] },
                'reset_proxy_key_quota',
            ),
        ).toBe(false);
    });

    it('accepts current_proxy_key_quota with a key id', () => {
        expect(validateRpcParams({ p_proxy_key_id: 'key-1' }, 'current_proxy_key_quota')).toBe(
            true,
        );
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

    it('accepts reset_proxy_key_quota reset and skipped arrays', () => {
        expect(validateRpcResponse({ reset: ['day'], skipped: [] }, 'reset_proxy_key_quota')).toBe(
            true,
        );
    });

    it('accepts current_proxy_key_quota minute day month objects', () => {
        expect(
            validateRpcResponse({ minute: {}, day: {}, month: {} }, 'current_proxy_key_quota'),
        ).toBe(true);
    });
});
