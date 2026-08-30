const PROXY_KEY_PREFIX = 'AIzaGPROXY_';
const PROXY_KEY_RANDOM_LENGTH = 28;
const PROXY_KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateProxyApiKeyValue(): string {
    const randomBytes = new Uint8Array(PROXY_KEY_RANDOM_LENGTH);
    crypto.getRandomValues(randomBytes);

    let randomPart = '';
    for (let index = 0; index < PROXY_KEY_RANDOM_LENGTH; index += 1) {
        randomPart += PROXY_KEY_CHARS.charAt(randomBytes[index] % PROXY_KEY_CHARS.length);
    }

    return `${PROXY_KEY_PREFIX}${randomPart}`;
}
