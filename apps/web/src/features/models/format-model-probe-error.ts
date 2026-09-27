const KNOWN_ERROR_KEYS: Record<string, string> = {
    unauthorized: 'modelProbe.errors.unauthorized',
    invalid_json: 'modelProbe.errors.invalidJson',
    invalid_body: 'modelProbe.errors.invalidBody',
    model_required: 'modelProbe.errors.modelRequired',
    no_api_key: 'modelProbe.errors.noApiKey',
    api_key_not_found: 'modelProbe.errors.apiKeyNotFound',
    rate_limited: 'modelProbe.errors.rateLimited',
    network_error: 'modelProbe.errors.networkError',
    probe_failed: 'modelProbe.errors.probeFailed',
    invalid_gemini_base_url: 'modelProbe.errors.invalidGeminiBase',
};

export function formatModelProbeErrorMessage(
    error: string,
    translate: (key: string) => string,
): string {
    const trimmed = error.trim();
    if (!trimmed) {
        return translate('modelProbe.errors.probeFailed');
    }
    const i18nKey = KNOWN_ERROR_KEYS[trimmed];
    if (i18nKey) {
        return translate(i18nKey);
    }
    return trimmed;
}
