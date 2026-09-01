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

    it('inherits global N when combo stick_n omits N', () => {
        const actual = effectiveComboStrategy({
            globalStrategy: 'fallback',
            globalStickAfterSuccesses: 3,
            comboStrategy: 'stick_n',
            comboStickAfterSuccesses: null,
        });
        expect(actual).toEqual({ strategy: 'stick_n', stickAfterSuccesses: 3 });
    });

    it('drops unused N when the effective strategy is not stick_n', () => {
        const actual = effectiveComboStrategy({
            globalStrategy: 'stick_n',
            globalStickAfterSuccesses: 5,
            comboStrategy: 'fallback',
            comboStickAfterSuccesses: 9,
        });
        expect(actual).toEqual({ strategy: 'fallback', stickAfterSuccesses: null });
    });

    it('inherits global stick_n N when combo strategy is null', () => {
        const actual = effectiveComboStrategy({
            globalStrategy: 'stick_n',
            globalStickAfterSuccesses: 2,
            comboStrategy: null,
            comboStickAfterSuccesses: null,
        });
        expect(actual).toEqual({ strategy: 'stick_n', stickAfterSuccesses: 2 });
    });
});
