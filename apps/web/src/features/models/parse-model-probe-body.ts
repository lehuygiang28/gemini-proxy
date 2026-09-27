export type ParsedModelProbeBody = {
    readonly model?: string;
    readonly apiKeyId?: string;
};

export function parseModelProbeBody(
    parsed: unknown,
):
    | { ok: true; body: ParsedModelProbeBody }
    | { ok: false; error: 'invalid_json' | 'invalid_body' } {
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, error: 'invalid_body' };
    }
    const record = parsed as Record<string, unknown>;
    if ('model' in record && record.model !== undefined && typeof record.model !== 'string') {
        return { ok: false, error: 'invalid_body' };
    }
    if (
        'apiKeyId' in record &&
        record.apiKeyId !== undefined &&
        typeof record.apiKeyId !== 'string'
    ) {
        return { ok: false, error: 'invalid_body' };
    }
    return {
        ok: true,
        body: {
            model: typeof record.model === 'string' ? record.model : undefined,
            apiKeyId: typeof record.apiKeyId === 'string' ? record.apiKeyId : undefined,
        },
    };
}
