import { normalizeGeminiModelId } from '../constants/gemini-pricing';

export const GEMINI_MODEL_PROBE_MESSAGE = 'hi';

export const DEFAULT_GEMINI_PROBE_MODEL = 'gemini-2.0-flash';

export type ProbeGeminiModelResult =
    | { readonly ok: true }
    | { readonly ok: false; readonly status?: number; readonly message: string };

function isHttpsBaseUrl(raw: string): boolean {
    try {
        return new URL(raw).protocol === 'https:';
    } catch {
        return false;
    }
}

function extractErrorMessage(body: unknown, fallback: string): string {
    if (!body || typeof body !== 'object') {
        return fallback;
    }
    const record = body as Record<string, unknown>;
    const error = record.error;
    if (error && typeof error === 'object') {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim()) {
            return message.trim();
        }
    }
    const message = record.message;
    if (typeof message === 'string' && message.trim()) {
        return message.trim();
    }
    return fallback;
}

export async function probeGeminiModel(input: {
    readonly apiKeyValue: string;
    readonly modelId: string;
    readonly geminiBaseUrl?: string;
    readonly fetchImpl?: typeof fetch;
}): Promise<ProbeGeminiModelResult> {
    const fetchImpl = input.fetchImpl ?? fetch;
    const base = (input.geminiBaseUrl ?? 'https://generativelanguage.googleapis.com/').replace(
        /\/?$/,
        '/',
    );
    if (!isHttpsBaseUrl(base)) {
        return { ok: false, message: 'invalid_gemini_base_url' };
    }
    const model = normalizeGeminiModelId(input.modelId);
    if (!model) {
        return { ok: false, message: 'model_required' };
    }
    const url = `${base}v1beta/models/${encodeURIComponent(model)}:generateContent`;
    let response: Response;
    try {
        response = await fetchImpl(
            new Request(url, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-goog-api-key': input.apiKeyValue,
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: GEMINI_MODEL_PROBE_MESSAGE }],
                        },
                    ],
                }),
                redirect: 'error',
            }),
        );
    } catch {
        return { ok: false, message: 'network_error' };
    }
    if (response.ok) {
        return { ok: true };
    }
    let body: unknown;
    try {
        body = await response.json();
    } catch {
        body = null;
    }
    return {
        ok: false,
        status: response.status,
        message: extractErrorMessage(body, `upstream_${response.status}`),
    };
}
