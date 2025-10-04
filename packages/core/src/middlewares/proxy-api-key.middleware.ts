import { Context, Next } from 'hono';

import { ApiKeyService } from '../services/api-key.service';
import { getSupabaseClient } from '../services/supabase.service';

export const validateProxyApiKeyMiddleware = async (c: Context, next: Next) => {
    const proxyApiKey = ApiKeyService.getProxyApiKeyFromHeader(c);
    if (!proxyApiKey) {
        return c.json(
            {
                error: 'Unauthorized',
                message: 'API key is required',
            },
            401,
        );
    }

    const supabase = getSupabaseClient(c);

    const { data, error } = await supabase
        .from('proxy_api_keys')
        .select('id, user_id, name, is_active')
        .eq('proxy_key_value', proxyApiKey)
        .limit(1)
        .single();

    if (error) {
        return c.json({ error: error.message }, 500);
    }

    if (!data) {
        return c.json(
            {
                error: 'Unauthorized',
                message: 'Provided proxy API key is not valid',
            },
            401,
        );
    }

    if (!data.is_active) {
        return c.json(
            {
                error: 'Unauthorized',
                message: 'Provided proxy API key is not active',
            },
            401,
        );
    }

    c.set('proxyApiKeyData', data);
    await next();
};
