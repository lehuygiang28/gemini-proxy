import { Context } from 'hono';
import { BackgroundService } from './background.service';
import { attachUsageLogging } from '../utils/usage-log-stream';
import { executeWithWaitUntil } from '../utils/wait-until';
import type { HonoApp, ProxyRequestDataParsed } from '../types';
import type { Tables } from '@gemini-proxy/database';
import type { ProxyError } from '../types/error.type';

export class ResponseHandlerService {
    /**
     * Return the provider body immediately; parse usage while streaming.
     */
    static async handleSuccess(params: {
        c: Context<HonoApp>;
        response: Response;
        requestId: string;
        apiKeyId: string;
        proxyApiKeyData: Tables<'proxy_api_keys'>;
        proxyRequestDataParsed: ProxyRequestDataParsed;
        baseRequest: Request;
        headers: Headers;
        durationMs: number;
        retryAttempts?: any[];
    }): Promise<Response> {
        const {
            c,
            response,
            requestId,
            apiKeyId,
            proxyApiKeyData,
            proxyRequestDataParsed,
            baseRequest,
            headers,
            durationMs,
            retryAttempts,
        } = params;
        const requestStartTime = c.get('requestStartTime') as number | undefined;
        const totalResponseTimeMs = Date.now() - (requestStartTime || Date.now());
        const filteredHeaders = this.filterResponseHeaders(response.headers);
        return attachUsageLogging({
            response,
            headers: filteredHeaders,
            apiFormat: proxyRequestDataParsed.apiFormat,
            waitUntil: (operation) => {
                void executeWithWaitUntil(c, operation);
            },
            onComplete: async (usage, responseText) => {
                await BackgroundService.handleRequestSuccess({
                    c,
                    requestId,
                    apiKeyId,
                    proxyKeyId: proxyApiKeyData.id,
                    userId: proxyApiKeyData.user_id,
                    apiFormat: proxyRequestDataParsed.apiFormat,
                    baseRequest,
                    requestHeaders: headers,
                    responseStatus: response.status,
                    responseHeaders: response.headers,
                    durationMs,
                    proxyRequestDataParsed,
                    retryAttempts: retryAttempts || [],
                    totalResponseTimeMs,
                    usage,
                    responseText,
                });
                await BackgroundService.executeAllOperations(c, requestId);
            },
        });
    }

    /**
     * Handle error response - collect then persist with waitUntil.
     */
    static async handleError(params: {
        c: Context<HonoApp>;
        requestId: string;
        proxyApiKeyData: Tables<'proxy_api_keys'>;
        proxyRequestDataParsed: ProxyRequestDataParsed;
        baseRequest: Request;
        lastError: ProxyError;
        lastProviderError?: {
            status: number;
            headers: Record<string, string>;
            body: string;
        };
        retryAttempts?: any[];
    }): Promise<Response> {
        const {
            c,
            requestId,
            proxyApiKeyData,
            proxyRequestDataParsed,
            baseRequest,
            lastError,
            lastProviderError,
            retryAttempts,
        } = params;
        const requestStartTime = c.get('requestStartTime') as number | undefined;
        const totalResponseTimeMs = Date.now() - (requestStartTime || Date.now());
        const lastRetry =
            retryAttempts && retryAttempts.length > 0
                ? retryAttempts[retryAttempts.length - 1]
                : null;
        await BackgroundService.handleRequestError({
            c,
            requestId,
            proxyKeyId: proxyApiKeyData.id,
            apiKeyId: lastRetry?.api_key_id ?? null,
            userId: proxyApiKeyData.user_id,
            apiFormat: proxyRequestDataParsed.apiFormat,
            baseRequest,
            error: lastError,
            providerError: lastProviderError,
            retryAttempts: retryAttempts || [],
            isStream: proxyRequestDataParsed.stream,
            totalResponseTimeMs,
            model: proxyRequestDataParsed.model,
        });
        void executeWithWaitUntil(c, BackgroundService.executeAllOperations(c, requestId));
        if (lastProviderError) {
            const providerHeaders = new Headers();
            if (lastProviderError.headers) {
                Object.entries(lastProviderError.headers).forEach(([k, v]) => {
                    providerHeaders.set(k, v);
                });
            }
            const safeHeaders = this.filterResponseHeaders(providerHeaders);
            safeHeaders.set('x-gproxy-error-type', lastError.type);
            if (lastError.code) safeHeaders.set('x-gproxy-error-code', lastError.code);
            safeHeaders.set('x-gproxy-error-message', lastError.message);
            safeHeaders.set('x-gproxy-request-id', requestId);
            const statusToReturn = lastProviderError.status || lastError.status || 500;
            return new Response(lastProviderError.body || '', {
                status: statusToReturn,
                headers: safeHeaders,
            });
        }
        const statusCode = typeof lastError.status === 'number' ? lastError.status : 500;
        const jsonBody = {
            error: lastError.type,
            message: lastError.message,
            code: lastError.code,
            gproxy_request_id: requestId,
        };
        return new Response(JSON.stringify(jsonBody), {
            status: statusCode,
            headers: { 'content-type': 'application/json' },
        });
    }

    private static filterResponseHeaders(headers: Headers): Headers {
        const filtered = new Headers();
        const excludeHeaders = new Set([
            'content-encoding',
            'transfer-encoding',
            'content-length',
            'connection',
            'keep-alive',
            'set-cookie',
            'alt-svc',
            'server-timing',
            'vary',
        ]);
        headers.forEach((value, key) => {
            if (!excludeHeaders.has(key.toLowerCase())) {
                filtered.set(key, value);
            }
        });
        return filtered;
    }
}
