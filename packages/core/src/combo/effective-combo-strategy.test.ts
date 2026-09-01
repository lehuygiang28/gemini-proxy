import { describe, expect, it } from 'vitest';
import { effectiveComboStrategy } from './effective-combo-strategy';

describe('effectiveComboStrategy', () => {
    it('uses combo override when set', () => {
        const actual = effectiveComboStrategy({
            globalStrategy: 'fallback',
            globalStickAfterSuccesses: 3,
            comboStrategy: 'sticky_until_error',
            comboStickAfterSuccesses: null,
        });
        expect(actual).toEqual({ strategy: 'sticky_until_error', stickAfterSuccesses: null });
    });

    it('inherits global when combo strategy is null', () => {
        const actual = effectiveComboStrategy({
            globalStrategy: 'sticky_until_error',
            globalStickAfterSuccesses: null,
            comboStrategy: null,
            comboStickAfterSuccesses: null,
        });
        expect(actual).toEqual({ strategy: 'sticky_until_error', stickAfterSuccesses: null });
    });

    it('treats stick_n without N as fallback', () => {
        const actual = effectiveComboStrategy({
            globalStrategy: 'stick_n',
            globalStickAfterSuccesses: null,
            comboStrategy: null,
            comboStickAfterSuccesses: null,
        });
        expect(actual).toEqual({ strategy: 'fallback', stickAfterSuccesses: null });
    });

    it('keeps stick_n when combo supplies N while global lacks it', () => {
        const actual = effectiveComboStrategy({
            globalStrategy: 'fallback',
            globalStickAfterSuccesses: null,
            comboStrategy: 'stick_n',
            comboStickAfterSuccesses: 4,
        });
        expect(actual).toEqual({ strategy: 'stick_n', stickAfterSuccesses: 4 });
    });
});
