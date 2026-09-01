import { describe, expect, it } from 'vitest';
import { comboSaveFieldError } from './combo-save-error';

describe('comboSaveFieldError', () => {
    it('maps member_is_combo_name onto the members field', () => {
        expect(comboSaveFieldError('member_is_combo_name')).toEqual({
            field: 'members',
            messageKey: 'combos.errors.memberIsComboName',
        });
    });

    it('maps invalid_name onto the name field', () => {
        expect(comboSaveFieldError('invalid_name\nDETAIL: junk')).toEqual({
            field: 'name',
            messageKey: 'combos.errors.invalidName',
        });
    });

    it('returns null for unknown messages', () => {
        expect(comboSaveFieldError('combo_not_found')).toBeNull();
        expect(comboSaveFieldError(undefined)).toBeNull();
    });
});
