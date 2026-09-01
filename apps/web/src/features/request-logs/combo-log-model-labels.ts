import { shortModel } from '@/utils/table-helpers';

export function comboLogModelLabels(usage: {
    readonly model: string | null;
    readonly requested_model?: string | null;
}): { primary: string; requested: string | null } {
    const primary = shortModel(usage.model);
    const requested = usage.requested_model ? shortModel(usage.requested_model) : null;
    if (!requested || requested === primary) {
        return { primary, requested: null };
    }
    return { primary, requested };
}
