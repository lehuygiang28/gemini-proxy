import { describe, expect, it } from 'vitest';
import { validateComboSave } from './validate-combo-save';

describe('validateComboSave', () => {
    it('normalizes name case and models/ prefix', () => {
        const actual = validateComboSave({
            name: 'models/Flash-Combo',
            members: ['gemini-3.7-flash'],
        });
        expect(actual).toEqual({
            ok: true,
            name: 'flash-combo',
            members: ['gemini-3.7-flash'],
        });
    });

    it('rejects empty members', () => {
        const actual = validateComboSave({ name: 'flash-combo', members: [] });
        expect(actual).toEqual({ ok: false, error: 'members_required' });
    });

    it('rejects duplicate members after normalize', () => {
        const actual = validateComboSave({
            name: 'flash-combo',
            members: ['models/Gemini-3.7-Flash', 'gemini-3.7-flash'],
        });
        expect(actual).toEqual({ ok: false, error: 'duplicate_member' });
    });

    it('rejects a member equal to this combo name', () => {
        const actual = validateComboSave({
            name: 'flash-combo',
            members: ['flash-combo'],
        });
        expect(actual).toEqual({ ok: false, error: 'member_is_combo_name' });
    });

    it('allows a member that matches a different combo-shaped google id', () => {
        const actual = validateComboSave({
            name: 'flash-combo',
            members: ['gemini-3.7-flash'],
        });
        expect(actual.ok).toBe(true);
    });

    it('rejects invalid names', () => {
        expect(validateComboSave({ name: 'bad name', members: ['gemini-3.7-flash'] })).toEqual({
            ok: false,
            error: 'invalid_name',
        });
        expect(validateComboSave({ name: '', members: ['gemini-3.7-flash'] })).toEqual({
            ok: false,
            error: 'invalid_name',
        });
        expect(validateComboSave({ name: '-leading', members: ['gemini-3.7-flash'] })).toEqual({
            ok: false,
            error: 'invalid_name',
        });
        expect(validateComboSave({ name: 'has/slash', members: ['gemini-3.7-flash'] })).toEqual({
            ok: false,
            error: 'invalid_name',
        });
        expect(
            validateComboSave({
                name: 'a'.repeat(65),
                members: ['gemini-3.7-flash'],
            }),
        ).toEqual({ ok: false, error: 'invalid_name' });
    });

    it('accepts a 64-character name with dots and underscores', () => {
        const name = `g${'x'.repeat(61)}_1`;
        expect(name).toHaveLength(64);
        const actual = validateComboSave({
            name,
            members: ['gemini-3.7-flash'],
        });
        expect(actual).toEqual({ ok: true, name, members: ['gemini-3.7-flash'] });
    });

    it('rejects a member that is empty after normalize', () => {
        expect(
            validateComboSave({ name: 'flash-combo', members: ['models/', 'gemini-3.7-flash'] }),
        ).toEqual({ ok: false, error: 'members_required' });
    });
});
