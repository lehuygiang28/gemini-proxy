import { isMaskedApiKey } from '../import/is-masked-api-key';

const GOOGLE_API_KEY_MIN_LENGTH = 10;
const LEGACY_GOOGLE_API_KEY_PATTERN = /^AIza[A-Za-z0-9_-]{20,}$/;
const AUTH_GOOGLE_API_KEY_PATTERN = /^AQ\.[A-Za-z0-9_-]{20,}$/;

export function isValidGoogleApiKey(value: string | null | undefined): boolean {
    if (!value) return false;
    const trimmed = value.trim();
    if (trimmed.length < GOOGLE_API_KEY_MIN_LENGTH) return false;
    if (isMaskedApiKey(trimmed)) return false;
    if (LEGACY_GOOGLE_API_KEY_PATTERN.test(trimmed)) return true;
    if (AUTH_GOOGLE_API_KEY_PATTERN.test(trimmed)) return true;
    return true;
}
