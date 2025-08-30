import { Context, Next } from 'hono';

import { ApiKeyService } from '../services/api-key.service';
import { getSupabaseClient } from '../services/supabase.service';

export const validateProxyApiKeyMiddleware = async (c: Context, next: Next) => {
    const apiKey = ApiKeyService.getProxyApiKey(c);

    if (!apiKey) {
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
        .select('*')
        .eq('proxy_key_value', apiKey);

    if (error) {
        return c.json({ error: error.message }, 500);
    }

    if (!data || data?.length === 0) {
        return c.json(
            {
                error: 'Unauthorized',
                message: 'Provided proxy API key is not valid',
            },
            401,
        );
    }

    c.set('proxyApiKeyData', data[0]);
    await next();
};
