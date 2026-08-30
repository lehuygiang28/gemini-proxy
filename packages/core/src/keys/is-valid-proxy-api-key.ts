const PROXY_API_KEY_MIN_LENGTH = 10;
const PROXY_API_KEY_MAX_LENGTH = 128;
const PROXY_API_KEY_PATTERN = /^[A-Za-z0-9._-]+$/;

export function isValidProxyApiKeyValue(value: string | null | undefined): boolean {
    if (!value) return false;
    const trimmed = value.trim();
    if (trimmed.length < PROXY_API_KEY_MIN_LENGTH || trimmed.length > PROXY_API_KEY_MAX_LENGTH) {
        return false;
    }
    return PROXY_API_KEY_PATTERN.test(trimmed);
}
