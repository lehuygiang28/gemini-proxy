import { describe, expect, it } from 'vitest';
import { normalizeProxyKeyLimits } from './normalize-proxy-key-limits';

describe('normalizeProxyKeyLimits', () => {
    it('submits empty numeric limits, tag lists, and expiry as null', () => {
        const inputValues: Record<string, unknown> = {
            name: 'SDK key',
            rpm_limit: undefined,
            tpm_limit: null,
            rpd_limit: '',
            max_concurrent: undefined,
            daily_budget_usd: '',
            monthly_budget_usd: null,
            max_output_tokens: undefined,
            max_request_body_bytes: '',
            allowed_models: [],
            denied_models: undefined,
            expires_at: '',
        };

        const actualValues = normalizeProxyKeyLimits(inputValues);

        expect(actualValues).toEqual({
            name: 'SDK key',
            rpm_limit: null,
            tpm_limit: null,
            rpd_limit: null,
            max_concurrent: null,
            daily_budget_usd: null,
            monthly_budget_usd: null,
            max_output_tokens: null,
            max_request_body_bytes: null,
            allowed_models: null,
            denied_models: null,
            expires_at: null,
        });
    });

    it('preserves configured limits and serializes a date value', () => {
        const inputDate: { toISOString: () => string } = {
            toISOString: (): string => '2026-09-01T12:00:00.000Z',
        };
        const inputValues: Record<string, unknown> = {
            rpm_limit: 60,
            daily_budget_usd: 1.25,
            allowed_models: ['gemini-2.5-*'],
            denied_models: ['gemini-2.5-pro'],
            expires_at: inputDate,
        };

        const actualValues = normalizeProxyKeyLimits(inputValues);

        expect(actualValues).toEqual({
            rpm_limit: 60,
            daily_budget_usd: 1.25,
            allowed_models: ['gemini-2.5-*'],
            denied_models: ['gemini-2.5-pro'],
            expires_at: '2026-09-01T12:00:00.000Z',
            tpm_limit: null,
            rpd_limit: null,
            max_concurrent: null,
            monthly_budget_usd: null,
            max_output_tokens: null,
            max_request_body_bytes: null,
        });
    });
});
