import {
    extractProxyCredential,
    isProxyCredentialConflict,
} from '../auth/extract-proxy-credential';
import type { ProxyApiFormat } from '../types';

export type DetectedApiFormat =
    | { readonly apiFormat: ProxyApiFormat }
    | { readonly error: 'conflicting_credentials' | 'missing_credential' };

function isLegacyGeminiPath(path: string): boolean {
    return path === '/gemini' || path.startsWith('/gemini/');
}

function isLegacyOpenaiPath(path: string): boolean {
    return path === '/openai' || path.startsWith('/openai/');
}

export function detectApiFormat(input: {
    readonly path: string;
    readonly header: (name: string) => string | undefined;
}): DetectedApiFormat {
    const credential = extractProxyCredential({ header: input.header });
    if (isProxyCredentialConflict(credential)) {
        return { error: 'conflicting_credentials' };
    }

    if (isLegacyGeminiPath(input.path)) {
        return { apiFormat: 'gemini' };
    }
    if (isLegacyOpenaiPath(input.path)) {
        return { apiFormat: 'openai' };
    }

    if (!credential) {
        return { error: 'missing_credential' };
    }
    return { apiFormat: credential.source === 'x-goog-api-key' ? 'gemini' : 'openai' };
}
