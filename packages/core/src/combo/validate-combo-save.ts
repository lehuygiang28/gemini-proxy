import { normalizeGeminiModelId } from '../constants/gemini-pricing';

const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

type ComboSaveValidation =
    | { readonly ok: true; readonly name: string; readonly members: readonly string[] }
    | {
          readonly ok: false;
          readonly error:
              | 'invalid_name'
              | 'members_required'
              | 'duplicate_member'
              | 'member_is_combo_name';
      };

export function validateComboSave(input: {
    readonly name: string;
    readonly members: readonly string[];
}): ComboSaveValidation {
    const name = normalizeGeminiModelId(input.name);
    if (name.length < 1 || name.length > 64 || !NAME_PATTERN.test(name)) {
        return { ok: false, error: 'invalid_name' };
    }
    const members = input.members.map((member) => normalizeGeminiModelId(member));
    if (members.length === 0 || members.some((member) => member === '')) {
        return { ok: false, error: 'members_required' };
    }
    if (new Set(members).size !== members.length) {
        return { ok: false, error: 'duplicate_member' };
    }
    if (members.includes(name)) {
        return { ok: false, error: 'member_is_combo_name' };
    }
    return { ok: true, name, members };
}
