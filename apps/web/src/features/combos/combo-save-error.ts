export type ComboSaveFieldError = {
    readonly field: 'name' | 'models';
    readonly messageKey: string;
};

export function comboSaveFieldError(message: string | undefined): ComboSaveFieldError | null {
    const code = (message ?? '').split('\n')[0]?.trim() ?? '';
    if (code === 'member_is_combo_name') {
        return { field: 'models', messageKey: 'combos.errors.modelIsComboName' };
    }
    if (code === 'duplicate_member') {
        return { field: 'models', messageKey: 'combos.errors.duplicateModel' };
    }
    if (code === 'members_required') {
        return { field: 'models', messageKey: 'combos.errors.modelsRequired' };
    }
    if (code === 'invalid_name') {
        return { field: 'name', messageKey: 'combos.errors.invalidName' };
    }
    return null;
}
