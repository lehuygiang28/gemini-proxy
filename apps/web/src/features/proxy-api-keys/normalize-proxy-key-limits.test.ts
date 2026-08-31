import { describe, expect, it } from 'vitest';
import { normalizeProxyKeyLimits } from './normalize-proxy-key-limits';

describe('normalizeProxyKeyLimits', () => {
    it('submits empty numeric limits, tag lists, and expiry as null', () => {
        const inputValues: Record<string, unknown> = {
            name: 'SDK key',
            rpm_limit: undefined,
            rpd_limit: '',
            token_day_limit: undefined,
            monthly_budget_usd: null,
            allowed_models: [],
            expires_at: '',
        };

        const actualValues = normalizeProxyKeyLimits(inputValues);

        expect(actualValues).toEqual({
            name: 'SDK key',
            rpm_limit: null,
            rpd_limit: null,
            token_day_limit: null,
            monthly_budget_usd: null,
            allowed_models: null,
            expires_at: null,
        });
    });

    it('preserves configured limits and serializes a date value', () => {
        const inputDate: { toISOString: () => string } = {
            toISOString: (): string => '2026-09-01T12:00:00.000Z',
        };
        const inputValues: Record<string, unknown> = {
            rpm_limit: 60,
            token_day_limit: 1_000_000,
            monthly_budget_usd: 12.5,
            allowed_models: ['gemini-2.5-*'],
            expires_at: inputDate,
        };

        const actualValues = normalizeProxyKeyLimits(inputValues);

        expect(actualValues).toEqual({
            rpm_limit: 60,
            rpd_limit: null,
            token_day_limit: 1_000_000,
            monthly_budget_usd: 12.5,
            allowed_models: ['gemini-2.5-*'],
            expires_at: '2026-09-01T12:00:00.000Z',
        });
    });
});
