export function isMaskedApiKey(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.includes('***')) return true;
    if (/^[\s*•·]+$/.test(trimmed)) return true;
    const visible = trimmed.replace(/[*•·\s]/g, '');
    return visible.length < 10;
}
