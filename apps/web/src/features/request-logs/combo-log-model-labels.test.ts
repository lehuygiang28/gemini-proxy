import { describe, expect, it } from 'vitest';
import { comboLogModelLabels } from './combo-log-model-labels';

describe('comboLogModelLabels', () => {
    it('uses the winning model as primary and requested combo name as secondary when they differ', () => {
        expect(
            comboLogModelLabels({
                model: 'models/gemini-3.5-flash',
                requested_model: 'flash-combo',
            }),
        ).toEqual({
            primary: 'gemini-3.5-flash',
            requested: 'flash-combo',
        });
    });

    it('hides requested when it matches the winning model', () => {
        expect(
            comboLogModelLabels({
                model: 'gemini-3.7-flash',
                requested_model: 'gemini-3.7-flash',
            }),
        ).toEqual({
            primary: 'gemini-3.7-flash',
            requested: null,
        });
    });

    it('hides requested when absent', () => {
        expect(comboLogModelLabels({ model: 'gemini-3.7-flash' })).toEqual({
            primary: 'gemini-3.7-flash',
            requested: null,
        });
    });

    it('shows a dash when both ids are missing', () => {
        expect(comboLogModelLabels({ model: null, requested_model: null })).toEqual({
            primary: '—',
            requested: null,
        });
    });

    it('hides requested when both ids normalize to the same value', () => {
        expect(
            comboLogModelLabels({
                model: 'models/flash-combo',
                requested_model: 'flash-combo',
            }),
        ).toEqual({
            primary: 'flash-combo',
            requested: null,
        });
    });
});
