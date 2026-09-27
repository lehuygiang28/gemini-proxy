export type ModelProbeResponse =
    | { readonly ok: true; readonly model: string }
    | { readonly ok: false; readonly error: string; readonly status?: number };

export async function fetchModelProbe(input: {
    readonly model: string;
    readonly apiKeyId?: string;
    readonly fetchImpl?: typeof fetch;
}): Promise<ModelProbeResponse> {
    const fetchImpl = input.fetchImpl ?? fetch;
    let response: Response;
    try {
        response = await fetchImpl('/api/models/probe', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                model: input.model,
                apiKeyId: input.apiKeyId,
            }),
        });
    } catch {
        return { ok: false, error: 'network_error' };
    }
    let body: {
        ok?: boolean;
        model?: string;
        error?: string;
        status?: number;
    };
    try {
        body = (await response.json()) as {
            ok?: boolean;
            model?: string;
            error?: string;
            status?: number;
        };
    } catch {
        return { ok: false, error: 'probe_failed' };
    }
    if (response.ok && body.ok && body.model) {
        return { ok: true, model: body.model };
    }
    return {
        ok: false,
        error: body.error ?? 'probe_failed',
        status: body.status,
    };
}
