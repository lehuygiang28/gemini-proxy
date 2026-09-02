/**
 * Moves within a horizontal landing tablist using ArrowLeft/ArrowRight, Home, and End.
 */
export function selectLandingTab<T extends string>(
    items: readonly T[],
    value: T,
    key: string,
): T | null {
    const index = items.indexOf(value);
    if (index < 0 || items.length === 0) {
        return null;
    }
    if (key === 'ArrowRight') {
        return items[(index + 1) % items.length];
    }
    if (key === 'ArrowLeft') {
        return items[(index - 1 + items.length) % items.length];
    }
    if (key === 'Home') {
        return items[0];
    }
    if (key === 'End') {
        return items[items.length - 1];
    }
    return null;
}
