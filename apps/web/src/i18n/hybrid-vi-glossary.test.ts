import { describe, expect, it } from 'vitest';
import vi from '../../public/locales/vi/common.json';

describe('hybrid Vietnamese console glossary', () => {
    it('keeps English resource names in nav, titles, and documentTitle', () => {
        expect(vi.dashboard.dashboard).toBe('Console');
        expect(vi.dashboard.titles.list).toBe('Console');
        expect(vi.documentTitle.dashboard.list).toBe('Console | Gemini Proxy');

        expect(vi.api_keys.api_keys).toBe('API Keys');
        expect(vi.api_keys.titles.list).toBe('API Keys');
        expect(vi.documentTitle.api_keys.list).toBe('API Keys | Gemini Proxy');

        expect(vi.proxy_api_keys.proxy_api_keys).toBe('Proxy API Keys');
        expect(vi.proxy_api_keys.titles.list).toBe('Proxy API Keys');
        expect(vi.documentTitle.proxy_api_keys.list).toBe('Proxy API Keys | Gemini Proxy');

        expect(vi.request_logs.request_logs).toBe('Logs');
        expect(vi.request_logs.titles.list).toBe('Logs');
        expect(vi.documentTitle.request_logs.list).toBe('Logs | Gemini Proxy');

        expect(vi.model_combos.model_combos).toBe('Combos');
        expect(vi.combos.title).toBe('Combos');
        expect(vi.documentTitle.model_combos.list).toBe('Combos | Gemini Proxy');

        expect(vi.proxy_reconciliation_needed.proxy_reconciliation_needed).toBe('Reconciliation');
        expect(vi.proxy_reconciliation_needed.titles.list).toBe('Reconciliation');
        expect(vi.documentTitle.proxy_reconciliation_needed.list).toBe(
            'Reconciliation | Gemini Proxy',
        );

        expect(vi.settings.tabs.observability).toBe('Observability');
    });

    it('keeps Vietnamese settings chrome and Est. Speed loanwords', () => {
        expect(vi.header.settings).toBe('Cài đặt');
        expect(vi.header.account).toBe('Tài khoản');
        expect(vi.settings.tabs.timezone).toBe('Múi giờ');
        expect(vi.settings.tabs.appearance).toBe('Giao diện');
        expect(vi.request_logs.fields.speed).toBe('Est. Speed');
        expect(vi.request_logs.fields.cache).toBe('Token cache');
        expect(vi.request_logs.fields.input).toBe('Token đầu vào');
        expect(vi.request_logs.fields.output).toBe('Token đầu ra');
        expect(vi.request_logs.fields.duration).toBe('Thời gian xử lý');
        expect(vi.api_keys.actions.rotate).toBe('Rotate key');
        expect(vi.proxy_api_keys.actions.rotate).toBe('Rotate key');
    });

    it('bans nhật ký as a resource name and the locked calques', () => {
        const catalog = JSON.stringify(vi);
        expect(catalog).not.toMatch(/nhật ký/i);
        expect(catalog).not.toMatch(/dấu ống/i);
        expect(catalog).not.toMatch(/xoay khóa/i);
        expect(catalog).not.toMatch(/sức khỏe/i);
        expect(catalog).not.toMatch(/token suốt đời/i);
    });
});
