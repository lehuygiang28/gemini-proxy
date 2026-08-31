import { Hono, type Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { timing } from 'hono/timing';
import { secureHeaders } from 'hono/secure-headers';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import type { HonoApp } from './types';
import { ProxyError } from './types/error.type';
import { requestIdMiddleware } from './middlewares/request-id.middleware';
import { validateProxyApiKeyMiddleware } from './middlewares/proxy-api-key.middleware';
import { httpLoggerMiddleware } from './middlewares/http-logger.middleware';
import { extractProxyDataMiddleware } from './middlewares/extract-proxy-data.middleware';
import { proxyPolicyMiddleware } from './middlewares/proxy-policy.middleware';
import { ProxyService } from './services/proxy.service';
import { getSupabaseClient } from './services/supabase.service';
import { executeWithWaitUntil } from './utils/wait-until';

async function settleErroredProxyRequest(c: Context<HonoApp>): Promise<void> {
    const reservation = c.get('proxyPolicyReservation');
    if (!reservation) {
        return;
    }
    const { error } = await getSupabaseClient(c).rpc('settle_proxy_request', {
        p_proxy_key_id: c.get('proxyApiKeyData').id,
        p_request_id: c.get('proxyRequestId'),
        p_reserved_tokens: reservation.reserved_tokens,
        p_reserved_usd: reservation.reserved_usd,
        p_actual_tokens: 0,
        p_actual_usd: 0,
        p_minute_start: reservation.window_starts.minute,
        p_day_start: reservation.window_starts.day,
        p_month_start: reservation.window_starts.month,
    });
    if (error) {
        throw error;
    }
}

function toStatusCode(status: number | undefined): ContentfulStatusCode {
    if (typeof status === 'number' && status >= 400 && status <= 599) {
        return status as ContentfulStatusCode;
    }
    return 500;
}

export const coreApp = new Hono<HonoApp>()
    .use(timing())
    .use(secureHeaders())
    .use(requestIdMiddleware)
    // Must to use after requestIdMiddleware to make sure the requestId is set
    .use(httpLoggerMiddleware)
    .onError((err, c) => {
        const requestId = c.get('proxyRequestId');
        if (c.get('proxyPolicyReservation')) {
            void executeWithWaitUntil(c, settleErroredProxyRequest(c));
        }

        if (err instanceof ProxyError) {
            return c.json(
                {
                    error: err.type,
                    message: err.message,
                    code: err.code,
                    ...(requestId ? { gproxy_request_id: requestId } : {}),
                },
                toStatusCode(err.status),
            );
        }

        if (err instanceof HTTPException) {
            return err.getResponse();
        }

        console.error('Unhandled proxy error:', err);
        return c.json(
            {
                error: 'server_error',
                message: 'Internal Server Error',
                ...(requestId ? { gproxy_request_id: requestId } : {}),
            },
            500,
        );
    })
    .notFound((c) =>
        c.json(
            {
                error: 'Not Found',
                message: 'The requested endpoint does not exist',
            },
            404,
        ),
    )
    .get('/healthz', (c) => c.json({ status: 'ok' }))
    .get('/readyz', async (c) => {
        try {
            const supabase = getSupabaseClient(c);
            const { error } = await supabase.from('proxy_api_keys').select('id').limit(1);
            if (error) {
                throw error;
            }
            return c.json({ status: 'ready' });
        } catch {
            return c.json({ status: 'not_ready' }, 503);
        }
    })
    .use('/*', validateProxyApiKeyMiddleware)
    .use('/*', extractProxyDataMiddleware)
    .use('/*', proxyPolicyMiddleware)
    // Main handler route for all requests
    .use('/*', async (c) => {
        return ProxyService.makeApiRequest({ c });
    });
