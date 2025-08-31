import { Context } from 'hono';

import { ApiKeyService } from './api-key.service';
import { BatchLoggerService } from './batch-logger.service';
import { ConfigService } from './config.service';
import { HonoApp } from '../types';
import type { ProxyRequestDataParsed, ProxyRequestOptions } from '../types';
import type { RetryConfig } from './config.service';
import type { ApiKeyWithStats } from './api-key.service';
import type { Tables } from '@gemini-proxy/database';
import { UsageMetadataParser } from '../utils/usage-metadata-parser';
import {
    ProxyError,
    RateLimitError,
    InvalidKeyError,
    ServerError,
    NetworkError,
} from '../types/error.type';
import { HEADERS_REMOVE_TO_ORIGIN } from '../constants/headers-to-remove.constant';

export class ProxyService {
    static async makeApiRequest(params: { c: Context<HonoApp> }): Promise<Response> {
        const { c } = params;
        const proxyRequestDataParsed = c.get('proxyRequestDataParsed');
        const proxyApiKeyData = c.get('proxyApiKeyData');
        const requestId = c.get('proxyRequestId');

        // Safely clone the request, handling cases where body might be consumed
        let baseRequest: Request;
        try {
            baseRequest = c.req.raw.clone();
        } catch (error) {
            // If cloning fails, create a new request without body initially
            // The performAttempt method will reconstruct the body from stored data
            console.warn('Failed to clone request body, will reconstruct from stored data:', error);
            baseRequest = new Request(c.req.raw.url, {
                method: c.req.raw.method,
                headers: c.req.raw.headers,
                // Don't include body here - performAttempt will handle it
            });
        }

        const retryConfigBase = ConfigService.getRetryConfig(c);
        const options = c.get('proxyRequestOptions');
        const retryConfig: RetryConfig = {
            ...retryConfigBase,
            ...(options?.retry || {}),
        };

        const allApiKeys = await ApiKeyService.getSmartApiKeys(c, {
            userId: proxyApiKeyData.user_id,
            prioritizeLeastRecentlyUsed:
                options?.apiKeySelection?.prioritizeLeastRecentlyUsed ?? true,
            prioritizeLeastErrors: options?.apiKeySelection?.prioritizeLeastErrors ?? true,
            prioritizeNewer: options?.apiKeySelection?.prioritizeNewer ?? true,
            count: retryConfig.maxRetries,
        });

        if (!allApiKeys || allApiKeys.length === 0) {
            throw new InvalidKeyError('No API key found');
        }

        const firstApiKey = allApiKeys[0];
        const {
            response: firstResponse,
            headers: firstHeaders,
            durationMs: firstAttemptDuration,
        } = await this.performAttempt({
            baseRequest,
            apiKeyValue: firstApiKey.api_key_value,
            apiFormat: proxyRequestDataParsed.apiFormat,
            url: proxyRequestDataParsed.urlToProxy,
            c,
        });

        if (firstResponse.ok) {
            const shouldTreatAsFailure = await this.shouldTreatOkAsFailure({
                response: firstResponse.clone(),
                apiFormat: proxyRequestDataParsed.apiFormat,
                options,
            });
            if (shouldTreatAsFailure) {
                // Create synthetic error for zero completion tokens
                const syntheticError = new ProxyError(
                    'Zero completion tokens detected',
                    'server_error',
                    firstResponse.status,
                    'zero_completion_tokens',
                );

                // Create retry attempts array with the first failed attempt
                const firstRetryAttempt = {
                    attempt_number: 1,
                    api_key_id: firstApiKey.id,
                    error: {
                        message: syntheticError.message,
                        type: syntheticError.type,
                        status: firstResponse.status,
                        code: syntheticError.code,
                    },
                    duration_ms: firstAttemptDuration,
                    timestamp: new Date().toISOString(),
                    provider_error: {
                        status: firstResponse.status,
                        headers: Object.fromEntries(firstResponse.headers.entries()),
                        raw_body: '',
                    },
                };

                BatchLoggerService.addApiKeyUsage(c, {
                    apiKeyId: firstApiKey.id,
                    isSuccessful: false,
                    errorDetails: {
                        message: syntheticError.message,
                        type: syntheticError.type,
                        status: firstResponse.status,
                        code: syntheticError.code,
                        provider_status: firstResponse.status,
                        provider_headers: Object.fromEntries(firstResponse.headers.entries()),
                        provider_raw_body: '',
                    },
                });

                return this.retryApiRequest({
                    c,
                    baseRequest,
                    allApiKeys,
                    startAttemptIndex: 1,
                    retryConfig,
                    requestId,
                    proxyApiKeyData,
                    proxyRequestDataParsed,
                    initialError: syntheticError,
                    initialProviderError: {
                        status: firstResponse.status,
                        headers: Object.fromEntries(firstResponse.headers.entries()),
                        body: '',
                    },
                    initialRetryAttempt: firstRetryAttempt,
                    options,
                });
            } else {
                BatchLoggerService.addApiKeyUsage(c, {
                    apiKeyId: firstApiKey.id,
                    isSuccessful: true,
                });

                const responseClone = firstResponse.clone();
                const filteredResponseHeaders = this.filterResponseHeaders(responseClone.headers);

                BatchLoggerService.addRequestLog(c, {
                    requestId,
                    apiKeyId: firstApiKey.id,
                    proxyKeyId: proxyApiKeyData.id,
                    userId: proxyApiKeyData.user_id,
                    apiFormat: proxyRequestDataParsed.apiFormat,
                    requestData: {
                        method: baseRequest.method,
                        url: proxyRequestDataParsed.urlToProxy,
                        headers: Object.fromEntries(firstHeaders.entries()),
                    },
                    responseData: {
                        status: firstResponse.status,
                        headers: Object.fromEntries(firstResponse.headers.entries()),
                    },
                    isSuccessful: true,
                    isStream: proxyRequestDataParsed.stream,
                    performanceMetrics: {
                        duration_ms: firstAttemptDuration,
                        attempt_count: 1,
                    },
                    responseBody: responseClone.clone(),
                    retryAttempts: [], // Empty array for first attempt success (no retries)
                });

                try {
                    // Ensure batched logs have a chance to complete in serverless
                    c?.executionCtx?.waitUntil(BatchLoggerService.flushAllBatches());
                } catch (exCtxError) {
                    try {
                        const { waitUntil } = await import('@vercel/functions');
                        waitUntil(BatchLoggerService.flushAllBatches());
                    } catch (err) {
                        console.warn(`
                            Err when tried to waitUntil with execution context - ${exCtxError}`);
                        console.warn(
                            `Err when tried to waitUntil with vercel functions helper - ${err}`,
                        );
                    }
                }

                return new Response(firstResponse.clone().body, {
                    status: firstResponse.clone().status,
                    headers: filteredResponseHeaders,
                });
            }
        }

        const firstError = this.createProxyError(firstResponse.clone(), firstAttemptDuration);
        // Capture provider error details for clearer diagnostics
        const firstErrorClone = firstResponse.clone();
        let firstProviderBody = '';
        try {
            firstProviderBody = await firstErrorClone.text();
        } catch {
            firstProviderBody = '';
        }
        const firstProviderHeaders = Object.fromEntries(firstResponse.headers.entries());

        // Create retry attempts array with the first failed attempt
        const firstRetryAttempt = {
            attempt_number: 1,
            api_key_id: firstApiKey.id,
            error: {
                message: firstError.message,
                type: firstError.type,
                status: firstResponse.status,
                code: firstError.code,
            },
            duration_ms: firstAttemptDuration,
            timestamp: new Date().toISOString(),
            provider_error: {
                status: firstResponse.status,
                headers: firstProviderHeaders,
                raw_body: firstProviderBody?.slice(0, 4000),
            },
        };

        BatchLoggerService.addApiKeyUsage(c, {
            apiKeyId: firstApiKey.id,
            isSuccessful: false,
            errorDetails: {
                message: firstError.message,
                type: firstError.type,
                status: firstResponse.status,
                code: firstError.code,
                provider_status: firstResponse.status,
                provider_headers: firstProviderHeaders,
                provider_raw_body: firstProviderBody?.slice(0, 4000),
            },
        });

        return this.retryApiRequest({
            c,
            baseRequest,
            allApiKeys,
            startAttemptIndex: 1,
            retryConfig,
            requestId,
            proxyApiKeyData,
            proxyRequestDataParsed,
            initialError: firstError,
            initialProviderError: {
                status: firstResponse.status,
                headers: firstProviderHeaders,
                body: firstProviderBody?.slice(0, 4000),
            },
            initialRetryAttempt: firstRetryAttempt,
            options,
        });
    }

    private static async retryApiRequest(params: {
        c: Context<HonoApp>;
        baseRequest: Request;
        allApiKeys: ApiKeyWithStats[];
        startAttemptIndex: number;
        retryConfig: RetryConfig;
        requestId: string;
        proxyApiKeyData: Tables<'proxy_api_keys'>;
        proxyRequestDataParsed: ProxyRequestDataParsed;
        initialError: ProxyError;
        initialProviderError?: { status: number; headers: Record<string, string>; body: string };
        initialRetryAttempt?: {
            attempt_number: number;
            api_key_id: string;
            error: { message: string; type: string; status?: number; code?: string };
            duration_ms: number;
            timestamp: string;
            provider_error?: {
                status?: number;
                headers?: Record<string, string>;
                raw_body?: string;
            };
        };
        options?: ProxyRequestOptions;
    }): Promise<Response> {
        const {
            c,
            baseRequest,
            allApiKeys,
            startAttemptIndex,
            retryConfig,
            requestId,
            proxyApiKeyData,
            proxyRequestDataParsed,
            initialError,
            options,
        } = params;

        /**
         * Retry attempts array structure:
         * - attempt_number: Sequential attempt number starting from 1
         * - api_key_id: ID of the API key used for this attempt
         * - error: Error details from the attempt
         * - duration_ms: Duration of this attempt in milliseconds
         * - timestamp: ISO timestamp of when this attempt was made
         * - provider_error: Original provider error details (status, headers, body)
         */
        let retryAttempts: Array<{
            attempt_number: number;
            api_key_id: string;
            error: { message: string; type: string; status?: number; code?: string };
            duration_ms: number;
            timestamp: string;
            provider_error?: {
                status?: number;
                headers?: Record<string, string>;
                raw_body?: string;
            };
        }> = params.initialRetryAttempt ? [params.initialRetryAttempt] : [];

        let lastError: ProxyError = initialError;
        let lastProviderError: {
            status?: number;
            headers?: Record<string, string>;
            body?: string;
        } | null = params.initialProviderError ? { ...params.initialProviderError } : null;
        const retriesTimes =
            retryConfig.maxRetries === -1
                ? Math.min(allApiKeys.length, 20) // Cap at 20 retries for safety
                : Math.min(retryConfig.maxRetries, 20); // Cap at 20 retries for safety

        // Safety check: ensure we don't exceed reasonable limits
        const maxAttempts = Math.min(retriesTimes, 20);

        for (
            let currentAttempt = startAttemptIndex;
            currentAttempt <= maxAttempts;
            currentAttempt++
        ) {
            let selectedApiKey: ApiKeyWithStats | undefined;
            let attemptStart: number = Date.now();

            try {
                console.log(`attempt ${currentAttempt} of ${retryConfig.maxRetries}`);
                selectedApiKey = allApiKeys[currentAttempt];
                if (!selectedApiKey) {
                    const error = new InvalidKeyError('No more API keys available for retry');

                    // Add retry attempt for no more API keys
                    retryAttempts.push({
                        attempt_number: currentAttempt + 1,
                        api_key_id: 'unknown',
                        error: {
                            message: error.message,
                            type: error.type,
                            status: error.status,
                            code: error.code,
                        },
                        duration_ms: 0,
                        timestamp: new Date().toISOString(),
                        provider_error: {
                            status: undefined,
                            headers: {},
                            raw_body: '',
                        },
                    });

                    throw error;
                }

                attemptStart = Date.now();
                const { response, headers } = await this.performAttempt({
                    baseRequest,
                    apiKeyValue: selectedApiKey.api_key_value,
                    apiFormat: proxyRequestDataParsed.apiFormat,
                    url: proxyRequestDataParsed.urlToProxy,
                    c,
                });
                const attemptDuration = Date.now() - attemptStart;

                if (!response.ok) {
                    const error = this.createProxyError(response, attemptDuration);
                    // Capture provider error details
                    const errorClone = response.clone();
                    let providerBody = '';
                    try {
                        providerBody = await errorClone.text();
                    } catch {
                        providerBody = '';
                    }
                    const providerHeaders = Object.fromEntries(response.headers.entries());

                    BatchLoggerService.addApiKeyUsage(c, {
                        apiKeyId: selectedApiKey.id,
                        isSuccessful: false,
                        errorDetails: {
                            message: error.message,
                            type: error.type,
                            status: response.status,
                            code: error.code,
                            provider_status: response.status,
                            provider_headers: providerHeaders,
                            provider_raw_body: providerBody?.slice(0, 4000),
                        },
                    });

                    // Add retry attempt (attempt_number should be currentAttempt + 1 since we start from 1)
                    retryAttempts.push({
                        attempt_number: currentAttempt + 1,
                        api_key_id: selectedApiKey.id,
                        error: {
                            message: error.message,
                            type: error.type,
                            status: response.status,
                            code: error.code,
                        },
                        duration_ms: attemptDuration,
                        timestamp: new Date().toISOString(),
                        provider_error: {
                            status: response.status,
                            headers: providerHeaders,
                            raw_body: providerBody?.slice(0, 4000),
                        },
                    });

                    if (currentAttempt >= retryConfig.maxRetries || !this.shouldRetry(error)) {
                        lastError = error;
                        lastProviderError = {
                            status: response.status,
                            headers: providerHeaders,
                            body: providerBody?.slice(0, 4000),
                        };
                        break;
                    }

                    lastError = error;
                    lastProviderError = {
                        status: response.status,
                        headers: providerHeaders,
                        body: providerBody?.slice(0, 4000),
                    };
                    continue;
                }

                // Even when response is OK, evaluate optional zero-completion retry rule
                const treatOkAsFailure = await this.shouldTreatOkAsFailure({
                    response,
                    apiFormat: proxyRequestDataParsed.apiFormat,
                    options,
                });
                if (treatOkAsFailure) {
                    const syntheticError = new ProxyError(
                        'Zero completion tokens detected',
                        'server_error',
                        response.status,
                        'zero_completion_tokens',
                    );

                    BatchLoggerService.addApiKeyUsage(c, {
                        apiKeyId: selectedApiKey.id,
                        isSuccessful: false,
                        errorDetails: {
                            message: syntheticError.message,
                            type: syntheticError.type,
                            status: response.status,
                            code: syntheticError.code,
                            provider_status: response.status,
                            provider_headers: Object.fromEntries(response.headers.entries()),
                            provider_raw_body: '',
                        },
                    });

                    // Add retry attempt for synthetic error (zero completion tokens)
                    retryAttempts.push({
                        attempt_number: currentAttempt + 1,
                        api_key_id: selectedApiKey.id,
                        error: {
                            message: syntheticError.message,
                            type: syntheticError.type,
                            status: response.status,
                            code: syntheticError.code,
                        },
                        duration_ms: attemptDuration,
                        timestamp: new Date().toISOString(),
                        provider_error: {
                            status: response.status,
                            headers: Object.fromEntries(response.headers.entries()),
                            raw_body: '',
                        },
                    });

                    if (
                        currentAttempt >= retryConfig.maxRetries ||
                        !this.shouldRetry(syntheticError)
                    ) {
                        lastError = syntheticError;
                        lastProviderError = {
                            status: response.status,
                            headers: Object.fromEntries(response.headers.entries()),
                            body: '',
                        };
                        break;
                    }

                    lastError = syntheticError;
                    lastProviderError = {
                        status: response.status,
                        headers: Object.fromEntries(response.headers.entries()),
                        body: '',
                    };
                    continue;
                }

                BatchLoggerService.addApiKeyUsage(c, {
                    apiKeyId: selectedApiKey.id,
                    isSuccessful: true,
                });

                const responseClone = response.clone();
                const responseCloneForLog = response.clone();
                const filteredResponseHeaders = this.filterResponseHeaders(responseClone.headers);

                BatchLoggerService.addRequestLog(c, {
                    requestId,
                    apiKeyId: selectedApiKey.id,
                    proxyKeyId: proxyApiKeyData.id,
                    userId: proxyApiKeyData.user_id,
                    apiFormat: proxyRequestDataParsed.apiFormat,
                    requestData: {
                        method: baseRequest.method,
                        url: proxyRequestDataParsed.urlToProxy,
                        headers: Object.fromEntries(headers.entries()),
                    },
                    responseData: {
                        status: response.status,
                        headers: Object.fromEntries(response.headers.entries()),
                    },
                    isSuccessful: true,
                    isStream: proxyRequestDataParsed.stream,
                    performanceMetrics: {
                        duration_ms: attemptDuration,
                        attempt_count: retryAttempts.length + 1, // Total attempts = retry attempts + current successful attempt
                    },
                    responseBody: responseCloneForLog,
                    retryAttempts: retryAttempts.length > 0 ? retryAttempts : [],
                });

                // Ensure batched logs have a chance to complete in serverless
                const executionCtx = c.executionCtx;
                if (executionCtx && typeof executionCtx.waitUntil === 'function') {
                    executionCtx.waitUntil(BatchLoggerService.flushAllBatches());
                }

                return new Response(responseClone.body, {
                    status: responseClone.status,
                    headers: filteredResponseHeaders,
                });
            } catch (error) {
                const errorObj =
                    error instanceof ProxyError
                        ? error
                        : new ProxyError(
                              error instanceof Error ? error.message : 'Unknown error',
                              'server_error',
                          );

                // Add retry attempt for exception
                retryAttempts.push({
                    attempt_number: currentAttempt + 1,
                    api_key_id: selectedApiKey?.id || 'unknown',
                    error: {
                        message: errorObj.message,
                        type: errorObj.type,
                        status: errorObj.status,
                        code: errorObj.code,
                    },
                    duration_ms: Date.now() - attemptStart,
                    timestamp: new Date().toISOString(),
                    provider_error: {
                        status: undefined,
                        headers: {},
                        raw_body: '',
                    },
                });

                lastError = errorObj;
                break;
            }
        }

        BatchLoggerService.addRequestLog(c, {
            requestId,
            apiKeyId: 'unknown',
            proxyKeyId: proxyApiKeyData.id,
            userId: proxyApiKeyData.user_id,
            apiFormat: proxyRequestDataParsed.apiFormat,
            requestData: {
                method: baseRequest.method,
                url: proxyRequestDataParsed.urlToProxy,
            },
            responseData: lastProviderError
                ? {
                      status: lastProviderError.status,
                      headers: lastProviderError.headers,
                      error_body: lastProviderError.body,
                  }
                : undefined,
            isStream: proxyRequestDataParsed.stream,
            isSuccessful: false,
            performanceMetrics: {
                duration_ms: 0, // Will be calculated from retry attempts
                attempt_count: retryAttempts.length,
            },
            errorDetails: {
                message: lastError.message,
                type: lastError.type,
                status: lastError.status,
                code: lastError.code,
                provider_status: lastProviderError?.status,
                provider_headers: lastProviderError?.headers,
                provider_raw_body: lastProviderError?.body,
            },
            retryAttempts: retryAttempts.length > 0 ? retryAttempts : [],
        });

        // Ensure batched logs have a chance to complete in serverless
        const executionCtx = c.executionCtx;
        if (executionCtx && typeof executionCtx.waitUntil === 'function') {
            executionCtx.waitUntil(BatchLoggerService.flushAllBatches());
        }

        // If we have provider error details, return raw provider body & headers,
        // and attach gproxy-specific metadata in prefixed headers for SDK compatibility
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

            const statusToReturn =
                (lastProviderError.status as number | undefined) ||
                (lastError.status as number | undefined) ||
                500;

            // Ensure batched logs have a chance to complete in serverless
            const executionCtx2 = c.executionCtx;
            if (executionCtx2 && typeof executionCtx2.waitUntil === 'function') {
                executionCtx2.waitUntil(BatchLoggerService.flushAllBatches());
            }

            return new Response(lastProviderError.body || '', {
                status: statusToReturn,
                headers: safeHeaders,
            });
        }

        // Fallback: return gproxy JSON error if no provider details available
        return c.json(
            {
                error: lastError.type,
                message: lastError.message,
                code: lastError.code,
                gproxy_request_id: requestId,
            },
            (lastError.status as any) || 500,
        );
    }

    private static createProxyError(response: Response, durationMs: number): ProxyError {
        const status = response.status;

        if (status === 429) {
            return new RateLimitError(
                'Rate limit exceeded',
                response.headers.get('retry-after')
                    ? parseInt(response.headers.get('retry-after')!)
                    : undefined,
            );
        }

        if (status === 401 || status === 403) {
            return new InvalidKeyError('Invalid API key');
        }

        if (status >= 500) {
            return new ServerError('Server error', status);
        }

        if (status >= 400) {
            return new ProxyError('Client error', 'validation_error', status);
        }

        return new NetworkError('Network error');
    }

    private static shouldRetry(error: ProxyError): boolean {
        return error.retryable;
    }

    private static filterResponseHeaders(headers: Headers): Headers {
        const filteredHeaders = new Headers();

        // Filter out headers that can cause proxy issues or client parsing problems
        const blockedResponseHeaders = [
            'content-encoding', // Skip gzip/compression headers that might interfere
            'transfer-encoding', // Skip chunked encoding that might interfere with client parsing
            'connection', // Skip connection headers
            'keep-alive', // Skip keep-alive headers
            'set-cookie', // Skip cookies from target APIs
            'alt-svc', // Skip alternative service headers
            'server-timing', // Skip server timing headers
            'vary', // Skip vary headers that might interfere
        ];

        headers.forEach((value, key) => {
            const lowerKey = key.toLowerCase();

            // Skip blocked headers
            if (blockedResponseHeaders.includes(lowerKey)) {
                return;
            }

            // Preserve all other headers including content-type, content-length, etc.
            filteredHeaders.set(key, value);
        });

        return filteredHeaders;
    }

    private static async performAttempt(params: {
        baseRequest: Request;
        apiKeyValue: string;
        apiFormat: ProxyRequestDataParsed['apiFormat'];
        url: string;
        c?: Context<HonoApp>; // Add context to access stored body data
    }): Promise<{ response: Response; durationMs: number; headers: Headers }> {
        const { baseRequest, apiKeyValue, apiFormat, url, c } = params;
        const headers = new Headers(baseRequest.headers);

        // Remove internal control headers so they are not sent to the origin
        headers.forEach((_v, k) => {
            if (
                k.toLowerCase().startsWith('x-gproxy-') ||
                HEADERS_REMOVE_TO_ORIGIN.includes(k.toLowerCase())
            ) {
                headers.delete(k);
            }
        });

        headers.set('origin', url.split('/')[2]);
        if (apiFormat === 'gemini') {
            headers.set('x-goog-api-key', apiKeyValue);
        } else {
            headers.set('authorization', `Bearer ${apiKeyValue}`);
        }

        const requestInit: RequestInit = {
            method: baseRequest.method,
            headers,
        };

        // Try to use stored raw body text first, then fall back to request body
        let bodyToUse: RequestInit['body'] | null = null;
        if (c) {
            const rawBodyText = c.get('rawBodyText');
            if (rawBodyText) {
                bodyToUse = rawBodyText;
            }
        }

        // If no stored body text, try to use the request body (might fail if consumed)
        if (!bodyToUse) {
            try {
                const requestClone = baseRequest.clone();
                if (requestClone.body) {
                    bodyToUse = requestClone.body;
                }
            } catch (error) {
                console.warn(
                    'Failed to clone request body, using stored raw text or no body:',
                    error,
                );
            }
        }

        if (bodyToUse) {
            requestInit.body = bodyToUse;
            if (typeof process !== 'undefined') {
                (requestInit as any).duplex = 'half';
            }
        }

        const start = Date.now();
        const response = await fetch(new Request(url, requestInit));
        const durationMs = Date.now() - start;

        return { response, durationMs, headers };
    }

    private static async shouldTreatOkAsFailure(params: {
        response: Response;
        apiFormat: ProxyRequestDataParsed['apiFormat'];
        options?: { retry?: { onZeroCompletionTokens?: boolean } };
    }): Promise<boolean> {
        const { response, apiFormat, options } = params;
        const retryOpts = options?.retry || {};
        if (!retryOpts.onZeroCompletionTokens) return false;

        try {
            const cloned = response.clone();
            const text = await cloned.text();

            const parsed = UsageMetadataParser.parseFromResponseBody(text, apiFormat);
            if (!parsed) {
                // Treat empty or unparsable body as zero completion tokens for this rule
                const isEmpty = !text || text.trim().length === 0;
                if (isEmpty) return true;
                return false;
            }

            const hasAnyTokenSignal =
                (parsed.totalTokens ?? 0) > 0 || (parsed.promptTokens ?? 0) > 0;
            if (hasAnyTokenSignal && parsed.completionTokens === 0) {
                return true;
            }
        } catch {
            // If parsing fails, do not force retry
        }

        return false;
    }
}
