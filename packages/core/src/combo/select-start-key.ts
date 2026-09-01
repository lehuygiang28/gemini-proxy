import type { ComboStrategy } from './combo-types';

export function selectStartKey(input: {
    readonly strategy: ComboStrategy;
    readonly stickAfterSuccesses: number | null;
    readonly consecutiveSuccesses: number;
    readonly lastApiKeyId: string | null;
    readonly keys: ReadonlyArray<{ id: string; lastUsedAt: string | null }>;
}): string[] {
    const roundRobin = [...input.keys].sort(compareKeys).map((key) => key.id);
    const lastApiKeyId = input.lastApiKeyId;
    const lastIndex = lastApiKeyId == null ? -1 : roundRobin.indexOf(lastApiKeyId);
    const shouldRotate =
        input.strategy === 'stick_n' &&
        input.stickAfterSuccesses != null &&
        input.consecutiveSuccesses >= input.stickAfterSuccesses;
    if (lastIndex === -1 || (input.strategy === 'fallback' && !shouldRotate)) {
        return roundRobin;
    }
    if (!shouldRotate) {
        return [roundRobin[lastIndex]!, ...roundRobin.filter((id) => id !== lastApiKeyId)];
    }
    const nextIndex = (lastIndex + 1) % roundRobin.length;
    return [...roundRobin.slice(nextIndex), ...roundRobin.slice(0, nextIndex)];
}

function compareKeys(
    left: { id: string; lastUsedAt: string | null },
    right: { id: string; lastUsedAt: string | null },
): number {
    if (left.lastUsedAt == null && right.lastUsedAt != null) {
        return -1;
    }
    if (left.lastUsedAt != null && right.lastUsedAt == null) {
        return 1;
    }
    if (
        left.lastUsedAt != null &&
        right.lastUsedAt != null &&
        left.lastUsedAt !== right.lastUsedAt
    ) {
        return left.lastUsedAt.localeCompare(right.lastUsedAt);
    }
    return left.id.localeCompare(right.id);
}
