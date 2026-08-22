/**
 * Soft-delete payload for api_keys / proxy_api_keys.
 * Keeps the row for request_log joins; revokes the secret so it cannot authenticate.
 */
export function buildSoftDeleteKeyValues(kind: 'api' | 'proxy', id: string) {
    const stamp = Date.now().toString(36);
    const revoked = `deleted_${id.replace(/-/g, '').slice(0, 16)}_${stamp}`;

    if (kind === 'api') {
        return {
            is_active: false,
            deleted_at: new Date().toISOString(),
            api_key_value: revoked,
        };
    }

    return {
        is_active: false,
        deleted_at: new Date().toISOString(),
        proxy_key_value: revoked,
    };
}
