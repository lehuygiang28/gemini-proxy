export type ComboSaveFieldError = {
    readonly field: 'name' | 'members';
    readonly messageKey: string;
};

export function comboSaveFieldError(message: string | undefined): ComboSaveFieldError | null {
    const code = (message ?? '').split('\n')[0]?.trim() ?? '';
    if (code === 'member_is_combo_name') {
        return { field: 'members', messageKey: 'combos.errors.memberIsComboName' };
    }
    if (code === 'duplicate_member') {
        return { field: 'members', messageKey: 'combos.errors.duplicateMember' };
    }
    if (code === 'members_required') {
        return { field: 'members', messageKey: 'combos.errors.membersRequired' };
    }
    if (code === 'invalid_name') {
        return { field: 'name', messageKey: 'combos.errors.invalidName' };
    }
    return null;
}
