import { isValidProxyApiKeyValue } from '../keys/is-valid-proxy-api-key';

export interface ExtractedProxyCredential {
    readonly value: string;
    readonly source: 'x-goog-api-key' | 'authorization' | 'query-key';
}

function readBearerToken(authorization: string | undefined): string | undefined {
    if (!authorization) {
        return undefined;
    }
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1]?.trim();
    return token || undefined;
}

export function extractProxyCredential(input: {
    readonly path: string;
    readonly header: (name: string) => string | undefined;
    readonly queryKey: string | undefined;
}): ExtractedProxyCredential | null {
    const candidates: ExtractedProxyCredential[] = [];
    const goog = input.header('x-goog-api-key')?.trim();
    if (goog) {
        candidates.push({ value: goog, source: 'x-goog-api-key' });
    }
    const bearer = readBearerToken(input.header('authorization'));
    if (bearer) {
        candidates.push({ value: bearer, source: 'authorization' });
    }
    const queryKey = input.queryKey?.trim();
    if (queryKey) {
        candidates.push({ value: queryKey, source: 'query-key' });
    }

    for (const candidate of candidates) {
        if (isValidProxyApiKeyValue(candidate.value)) {
            return candidate;
        }
    }
    return null;
}
