import { describe, expect, it } from 'vitest';
import { formatModelProbeErrorMessage } from './format-model-probe-error';

describe('formatModelProbeErrorMessage', () => {
    it('maps known codes through translate', () => {
        const actual = formatModelProbeErrorMessage('no_api_key', (key) => key);
        expect(actual).toBe('modelProbe.errors.noApiKey');
    });

    it('returns upstream messages verbatim', () => {
        const actual = formatModelProbeErrorMessage('Model not found', (key) => key);
        expect(actual).toBe('Model not found');
    });
});
