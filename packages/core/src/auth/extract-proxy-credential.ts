import { isValidProxyApiKeyValue } from '../keys/is-valid-proxy-api-key';

export type ProxyCredentialConflict = {
    readonly error: 'conflicting_credentials';
};

export interface ExtractedProxyCredential {
    readonly value: string;
    readonly source: 'x-goog-api-key' | 'authorization';
}

export function isProxyCredentialConflict(
    value: ExtractedProxyCredential | ProxyCredentialConflict | null,
): value is ProxyCredentialConflict {
    return value !== null && 'error' in value;
}

function readBearerToken(authorization: string | undefined): string | undefined {
    if (!authorization) {
        return undefined;
    }
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1]?.trim();
    return token || undefined;
}

function readValidCredential(
    value: string | undefined,
    source: ExtractedProxyCredential['source'],
): ExtractedProxyCredential | null {
    if (!value || !isValidProxyApiKeyValue(value)) {
        return null;
    }
    return { value: value.trim(), source };
}

export function extractProxyCredential(input: {
    readonly header: (name: string) => string | undefined;
}): ExtractedProxyCredential | ProxyCredentialConflict | null {
    const goog = readValidCredential(input.header('x-goog-api-key')?.trim(), 'x-goog-api-key');
    const bearer = readValidCredential(
        readBearerToken(input.header('authorization')),
        'authorization',
    );
    if (goog && bearer) {
        return { error: 'conflicting_credentials' };
    }
    return goog ?? bearer;
}
