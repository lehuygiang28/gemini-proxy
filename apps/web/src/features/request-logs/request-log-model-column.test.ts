import { describe, expect, it } from 'vitest';
import { modelColumnPresentation } from './request-log-model-column';

describe('modelColumnPresentation', () => {
    it('always keeps format and hides non-stream and zero retries', () => {
        expect(
            modelColumnPresentation({ apiFormat: 'openai', isStream: false, retryCount: 0 }),
        ).toEqual({
            apiFormat: 'openai',
            showStream: false,
            showRetries: false,
            retryCount: 0,
        });
    });

    it('shows stream tag and retries when present', () => {
        expect(
            modelColumnPresentation({ apiFormat: 'gemini', isStream: true, retryCount: 2 }),
        ).toEqual({
            apiFormat: 'gemini',
            showStream: true,
            showRetries: true,
            retryCount: 2,
        });
    });
});
