export type KeyJoinLabel = {
    name: string;
    deleted_at: string | null;
} | null | undefined;

export type ResolveKeyLabelInput = {
    joined?: KeyJoinLabel;
    /** Optional name from retry_attempts JSON (not a DB column on request_logs). */
    embeddedName?: string | null;
    id?: string | null;
};

export type ResolveKeyLabelResult = {
    label: string;
    isRemoved: boolean;
    shortId: string | null;
};

/**
 * Resolve a display label: joined name → embedded name → short id → em dash.
 */
export function resolveKeyLabel(input: ResolveKeyLabelInput): ResolveKeyLabelResult {
    const { joined, embeddedName, id } = input;
    const shortId = id ? `${id.slice(0, 8)}…` : null;
    if (joined?.name) {
        return { label: joined.name, isRemoved: Boolean(joined.deleted_at), shortId };
    }
    if (embeddedName) {
        return { label: embeddedName, isRemoved: !joined && Boolean(id), shortId };
    }
    if (shortId) {
        return { label: shortId, isRemoved: Boolean(id) && !joined, shortId };
    }
    return { label: '—', isRemoved: false, shortId: null };
}

/**
 * Compact label for tables / feeds (optional removed suffix).
 */
export function formatKeyLabel(
    input: ResolveKeyLabelInput,
    options?: { showRemoved?: boolean },
): string {
    const resolved = resolveKeyLabel(input);
    if (options?.showRemoved !== false && resolved.isRemoved && resolved.label !== '—') {
        return `${resolved.label} (removed)`;
    }
    return resolved.label;
}
