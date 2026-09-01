import type { Context, Next } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import type { HonoApp } from '../types';
import { estimateAdmitTokens } from '../policy/estimate-admit';
import { getSupabaseClient } from '../services/supabase.service';
import { safelyExtractBodyText } from '../utils/body-handler';
import { estimateGeminiCostUsd } from '../utils/cost-estimator';
import { loadUserCombos } from '../combo/load-user-combos';
import { resolveCombo } from '../combo/resolve-combo';
import { firstPricedComboMember } from '../combo/first-priced-combo-member';

type AdmitResult = {
    ok: boolean;
    code?: string;
    reserved_tokens?: number;
    reserved_usd?: number;
    window_starts?: {
        minute?: string | null;
        day?: string | null;
        month?: string | null;
    };
};

const DENY_STATUS: Record<string, ContentfulStatusCode> = {
    rpm: 429,
    rpd: 429,
    tokens: 429,
    budget: 429,
    model_denied: 400,
    model_required: 400,
    expired_key: 400,
    inactive_key: 400,
    unknown_key: 401,
    invalid_timezone: 400,
};

function parsePositiveInteger(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

function parseBody(bodyText: string | null): Record<string, unknown> | null {
    if (!bodyText) {
        return null;
    }
    try {
        const parsed: unknown = JSON.parse(bodyText);
        return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : null;
    } catch {
        return null;
    }
}

function peekMaxOutput(body: Record<string, unknown> | null): number | undefined {
    if (!body) {
        return undefined;
    }
    const generationConfig = body.generationConfig;
    const geminiMax =
        generationConfig !== null &&
        typeof generationConfig === 'object' &&
        !Array.isArray(generationConfig)
            ? (generationConfig as Record<string, unknown>).maxOutputTokens
            : undefined;
    return parsePositiveInteger(geminiMax) ?? parsePositiveInteger(body.max_tokens);
}

function createDenyResponse(c: Context<HonoApp>, code: string, message: string): Response {
    return c.json(
        {
            error: 'policy_denied',
            code,
            message,
            gproxy_request_id: c.get('proxyRequestId'),
        },
        DENY_STATUS[code] ?? 500,
    );
}

export async function proxyPolicyMiddleware(
    c: Context<HonoApp>,
    next: Next,
): Promise<Response | void> {
    const proxyKey = c.get('proxyApiKeyData');
    const requestData = c.get('proxyRequestDataParsed');
    const supabase = getSupabaseClient(c);
    const combos = await loadUserCombos(supabase, proxyKey.user_id);
    const resolvedCombo = resolveCombo({
        combos,
        requestedModel: requestData.model ?? '',
    });
    c.set('resolvedCombo', resolvedCombo);
    const managed = requestData.managed;
    let estimatedTokens = 0;
    let estimatedUsd = 0;
    if (managed) {
        const bodyText = await safelyExtractBodyText(c);
        const peekedMaxOutput = peekMaxOutput(parseBody(bodyText));
        estimatedTokens = estimateAdmitTokens({ peekedMaxOutput });
        const costModel =
            resolvedCombo.kind === 'combo'
                ? (firstPricedComboMember(resolvedCombo.members) ??
                  requestData.model ??
                  'unknown')
                : (requestData.model ?? 'unknown');
        estimatedUsd =
            estimateGeminiCostUsd({
                model: costModel,
                promptTokens: 0,
                cacheTokens: 0,
                completionTokens: estimatedTokens,
                thoughtsTokens: 0,
                toolUsePromptTokens: 0,
                totalTokens: estimatedTokens,
            })?.usd ?? 0;
    }
    const { data, error } = await supabase.rpc('admit_proxy_request', {
        p_proxy_key_id: proxyKey.id,
        p_model: requestData.model ?? '',
        p_estimated_tokens: estimatedTokens,
        p_estimated_usd: estimatedUsd,
        p_body_bytes: 0,
        p_managed: managed,
    });
    if (error) {
        console.error('Failed to admit proxy request:', error);
        return c.json(
            {
                error: 'server_error',
                message: 'Failed to enforce proxy key policy',
                gproxy_request_id: c.get('proxyRequestId'),
            },
            500,
        );
    }
    const result = data as AdmitResult | null;
    if (!result?.ok) {
        const code = result?.code ?? 'policy_error';
        return createDenyResponse(c, code, `Proxy key policy denied this request: ${code}`);
    }
    c.set('proxyPolicyReservation', {
        reserved_tokens: Number(result.reserved_tokens ?? 0),
        reserved_usd: Number(result.reserved_usd ?? 0),
        window_starts: {
            minute: result.window_starts?.minute ?? null,
            day: result.window_starts?.day ?? null,
            month: result.window_starts?.month ?? null,
        },
    });
    await next();
}
