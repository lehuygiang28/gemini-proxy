import { isMaskedApiKey } from '../import/is-masked-api-key';

const GOOGLE_API_KEY_MIN_LENGTH = 10;

export function isValidGoogleApiKey(value: string | null | undefined): boolean {
    if (!value) return false;
    const trimmed = value.trim();
    if (trimmed.length < GOOGLE_API_KEY_MIN_LENGTH) return false;
    return !isMaskedApiKey(trimmed);
}
