import type { ComboAttempt } from './combo-types';

export function planComboAttempts(input: {
    readonly keys: readonly string[];
    readonly members: readonly string[];
    readonly isPairIneligible: (apiKeyId: string, canonicalModel: string) => boolean;
}): ComboAttempt[] {
    const { keys, members, isPairIneligible } = input;
    if (keys.length === 0) {
        return [];
    }
    const attempts: ComboAttempt[] = [];
    let cursor = 0;
    for (const member of members) {
        const waveStart = cursor;
        for (let step = 0; step < keys.length; step += 1) {
            const apiKeyId = keys[(waveStart + step) % keys.length]!;
            if (isPairIneligible(apiKeyId, member)) {
                continue;
            }
            attempts.push({ apiKeyId, canonicalModel: member });
            cursor = (waveStart + step + 1) % keys.length;
        }
    }
    return attempts;
}
