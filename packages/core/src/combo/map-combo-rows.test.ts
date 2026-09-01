import { describe, expect, it } from 'vitest';
import { mapComboRows } from './map-combo-rows';

describe('mapComboRows', () => {
    it('orders members by position and maps strategy', () => {
        const actual = mapComboRows([
            {
                id: 'c1',
                name: 'flash-combo',
                is_active: true,
                strategy: null,
                stick_after_successes: null,
                model_combo_members: [
                    { position: 1, canonical_model: 'gemini-3.5-flash' },
                    { position: 0, canonical_model: 'gemini-3.7-flash' },
                ],
            },
        ]);
        expect(actual).toEqual([
            {
                id: 'c1',
                name: 'flash-combo',
                isActive: true,
                strategy: null,
                stickAfterSuccesses: null,
                members: ['gemini-3.7-flash', 'gemini-3.5-flash'],
            },
        ]);
    });
});
