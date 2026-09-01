import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';
import { syncGoogleModelCatalog } from '@gemini-proxy/core';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
    const result = await syncGoogleModelCatalog({
        supabase: supabase as unknown as SupabaseClient<Database>,
        userId: user.id,
        geminiBaseUrl: process.env.GOOGLE_GEMINI_API_BASE_URL,
    });
    if (!result.ok) {
        return NextResponse.json({ ok: false, error: 'catalog_sync_failed' }, { status: 502 });
    }
    return NextResponse.json(result);
}
