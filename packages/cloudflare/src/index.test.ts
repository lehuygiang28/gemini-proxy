import { describe, expect, it } from 'vitest';
import * as worker from './index';

describe('cloudflare worker module', () => {
    it('exports fetch', () => {
        expect(typeof worker.fetch).toBe('function');
    });
});
