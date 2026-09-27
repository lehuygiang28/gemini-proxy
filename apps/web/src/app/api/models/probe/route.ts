import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';
import {
    DEFAULT_GEMINI_PROBE_MODEL,
    normalizeGeminiModelId,
    probeModelForUser,
} from '@gemini-proxy/core';
import { parseModelProbeBody } from '@/features/models/parse-model-probe-body';
import { consumeModelProbeRateLimit } from '@/features/models/model-probe-rate-limit';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
    if (!consumeModelProbeRateLimit(user.id)) {
        return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }
    let parsedBody: unknown;
    try {
        parsedBody = await request.json();
    } catch {
        return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
    }
    const parsed = parseModelProbeBody(parsedBody);
    if (!parsed.ok) {
        return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    }
    const body = parsed.body;
    const rawModel = body.model?.trim() || DEFAULT_GEMINI_PROBE_MODEL;
    const modelId = normalizeGeminiModelId(rawModel);
    if (!modelId) {
        return NextResponse.json({ ok: false, error: 'model_required' }, { status: 400 });
    }
    const apiKeyId = body.apiKeyId?.trim() ? body.apiKeyId.trim() : undefined;
    const result = await probeModelForUser({
        supabase: supabase as unknown as SupabaseClient<Database>,
        userId: user.id,
        modelId,
        apiKeyId,
        geminiBaseUrl: process.env.GOOGLE_GEMINI_API_BASE_URL,
    });
    if (!result.ok) {
        const status =
            result.message === 'no_api_key' || result.message === 'api_key_not_found' ? 404 : 502;
        return NextResponse.json(
            {
                ok: false,
                error: result.message,
                status: 'status' in result ? result.status : undefined,
            },
            { status },
        );
    }
    return NextResponse.json({ ok: true, model: modelId });
}
