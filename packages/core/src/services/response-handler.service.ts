import { Context } from 'hono';
import { BackgroundService } from './background.service';
import type { HonoApp, ProxyRequestDataParsed } from '../types';
import type { Tables } from '@gemini-proxy/database';
import type { ProxyError } from '../types/error.type';

export class ResponseHandlerService {
    /**
     * Handle successful response - return immediately and log in background
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

        // Calculate total response time from start to finish
        const requestStartTime = c.get('requestStartTime') as number | undefined;
        const totalResponseTimeMs = Date.now() - (requestStartTime || Date.now());

        // Prepare response immediately for fastest user response
        const responseClone = response.clone();
        const filteredHeaders = this.filterResponseHeaders(responseClone.headers);

        // Handle successful request with unified background service
        await BackgroundService.handleRequestSuccess({
            requestId,
            apiKeyId,
            proxyKeyId: proxyApiKeyData.id,
            userId: proxyApiKeyData.user_id,
            apiFormat: proxyRequestDataParsed.apiFormat,
            baseRequest,
            response: response,
            headers: headers,
            durationMs,
            proxyRequestDataParsed,
            retryAttempts: retryAttempts || [],
            totalResponseTimeMs,
        });

        // Return response immediately without waiting for logging
        return new Response(responseClone.body, {
            status: responseClone.status,
            headers: filteredHeaders,
        });
    }

    /**
     * Handle error response - return immediately and log in background
     */
    static handleError(params: {
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
    }): Response {
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

        // Calculate total response time from start to finish
        const requestStartTime = c.get('requestStartTime') as number | undefined;
        const totalResponseTimeMs = Date.now() - (requestStartTime || Date.now());

        // Handle failed request with unified background service
        BackgroundService.handleRequestError({
            requestId,
            proxyKeyId: proxyApiKeyData.id,
            userId: proxyApiKeyData.user_id,
            apiFormat: proxyRequestDataParsed.apiFormat,
            baseRequest,
            error: lastError,
            providerError: lastProviderError,
            retryAttempts: retryAttempts || [],
            isStream: proxyRequestDataParsed.stream,
            totalResponseTimeMs,
            model: proxyRequestDataParsed.model, // Include model name for failed requests
        });

        // Return error response immediately without waiting for logging
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

    /**
     * Filter response headers to remove sensitive or problematic headers
     */
    private static filterResponseHeaders(headers: Headers): Headers {
        const filteredHeaders = new Headers();
        const blockedHeaders = [
            'content-encoding',
            'transfer-encoding',
            'connection',
            'keep-alive',
            'set-cookie',
            'alt-svc',
            'server-timing',
            'vary',
        ];

        headers.forEach((value, key) => {
            const lowerKey = key.toLowerCase();
            if (!blockedHeaders.includes(lowerKey)) {
                filteredHeaders.set(key, value);
            }
        });

        return filteredHeaders;
    }
}
