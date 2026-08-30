const MASKED_CHARACTER_PATTERN = /[*•·]/g;
const MASKED_OR_WHITESPACE_PATTERN = /[*•·\s]/g;
const MASKED_CHARACTER_PROPORTION = 0.5;
const MIN_VISIBLE_CHARACTER_COUNT = 10;

export function isMaskedApiKey(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.includes('***')) return true;
    if (/^[\s*•·]+$/.test(trimmed)) return true;
    const visible = trimmed.replace(MASKED_OR_WHITESPACE_PATTERN, '');
    if (visible.length < MIN_VISIBLE_CHARACTER_COUNT) return true;
    const maskCount = (trimmed.match(MASKED_CHARACTER_PATTERN) ?? []).length;
    return maskCount / trimmed.length >= MASKED_CHARACTER_PROPORTION;
}
