import { Context, Next } from 'hono';

import { getSupabaseClient } from '../services/supabase.service';
import {
    extractProxyCredential,
    isProxyCredentialConflict,
} from '../auth/extract-proxy-credential';

export const validateProxyApiKeyMiddleware = async (c: Context, next: Next) => {
    const extracted = extractProxyCredential({
        header: (name) => c.req.header(name),
    });
    if (isProxyCredentialConflict(extracted)) {
        return c.json(
            {
                error: 'conflicting_credentials',
                message: 'Provide either x-goog-api-key or Authorization: Bearer, not both',
            },
            400,
        );
    }
    if (!extracted) {
        return c.json(
            {
                error: 'Unauthorized',
                message: 'API key is required',
            },
            401,
        );
    }
    const proxyApiKey = extracted.value;

    const supabase = getSupabaseClient(c);

    const { data, error } = await supabase
        .from('proxy_api_keys')
        .select('id, user_id, name, is_active, deleted_at')
        .eq('proxy_key_value', proxyApiKey)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();

    // PGRST116 / null data = key not found (client error), not a server failure
    if (error && error.code !== 'PGRST116') {
        return c.json(
            {
                error: 'server_error',
                message: 'Failed to validate proxy API key',
            },
            500,
        );
    }

    if (!data) {
        return c.json(
            {
                error: 'policy_denied',
                code: 'unknown_key',
                message: 'Provided proxy API key is not valid',
                gproxy_request_id: c.get('proxyRequestId'),
            },
            401,
        );
    }

    if (!data.user_id) {
        return c.json(
            {
                error: 'server_error',
                message: 'Proxy API key is missing owner',
            },
            500,
        );
    }

    c.set('proxyApiKeyData', data);
    await next();
};
