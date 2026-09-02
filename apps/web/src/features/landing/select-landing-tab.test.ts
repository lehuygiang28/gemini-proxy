import { describe, expect, it } from 'vitest';
import { selectLandingTab } from './select-landing-tab';

const ITEMS = ['google', 'openai', 'vercel'] as const;

describe('selectLandingTab', () => {
    it('wraps to the next and previous tab', () => {
        expect(selectLandingTab(ITEMS, 'google', 'ArrowRight')).toBe('openai');
        expect(selectLandingTab(ITEMS, 'google', 'ArrowLeft')).toBe('vercel');
        expect(selectLandingTab(ITEMS, 'vercel', 'Home')).toBe('google');
        expect(selectLandingTab(ITEMS, 'google', 'End')).toBe('vercel');
    });

    it('ignores unrelated keys', () => {
        expect(selectLandingTab(ITEMS, 'google', 'Enter')).toBeNull();
    });
});
