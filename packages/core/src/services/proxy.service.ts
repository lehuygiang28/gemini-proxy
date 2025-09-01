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
import { flushAllLogBatches } from '../utils/wait-until';
import { createRetryRequest } from '../utils/body-handler';

interface RetryAttemptData {
    attempt_number: number;
    api_key_id: string | null;
    error: { message: string; type: string; status?: number; code?: string };
    duration_ms: number;
    timestamp: string;
    provider_error?: {
        status?: number;
        headers?: Record<string, string>;
        raw_body?: string;
    };
}

interface ProviderErrorData {
    status: number;
    headers: Record<string, string>;
    body: string;
}

export class ProxyService {
    private static readonly MAX_RETRIES_SAFETY_CAP = 50;
    private static readonly ERROR_BODY_MAX_LENGTH = 4000;

    static async makeApiRequest(params: { c: Context<HonoApp> }): Promise<Response> {
        const { c } = params;
        const proxyRequestDataParsed = c.get('proxyRequestDataParsed');
        const proxyApiKeyData = c.get('proxyApiKeyData');
        const requestId = c.get('proxyRequestId');

        // Safely create a request that can be used for retries
        const rawBodyText = c.get('rawBodyText');
        const baseRequest = createRetryRequest(c.req.raw, rawBodyText);

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
        });

        if (!allApiKeys || allApiKeys.length === 0) {
            throw new InvalidKeyError('No API key found');
        }

        console.log(`Found ${allApiKeys.length} available API keys for retry`);

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
                const syntheticError = this.createSyntheticError(firstResponse.status);
                const firstRetryAttempt = this.createRetryAttempt({
                    attemptNumber: 1,
                    apiKeyId: firstApiKey.id,
                    error: syntheticError,
                    durationMs: firstAttemptDuration,
                    providerError: this.extractProviderError(firstResponse),
                });

                this.logApiKeyUsage(c, {
                    apiKeyId: firstApiKey.id,
                    isSuccessful: false,
                    error: syntheticError,
                    providerError: this.extractProviderError(firstResponse),
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
                    initialProviderError: this.extractProviderError(firstResponse),
                    initialRetryAttempt: firstRetryAttempt,
                    options,
                });
            } else {
                this.logApiKeyUsage(c, { apiKeyId: firstApiKey.id, isSuccessful: true });

                const responseClone = firstResponse.clone();
                const filteredResponseHeaders = this.filterResponseHeaders(responseClone.headers);

                const responseCloneForLog = firstResponse.clone();
                this.logRequestSuccess(c, {
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
                    responseBody: responseCloneForLog,
                    isStream: proxyRequestDataParsed.stream,
                    durationMs: firstAttemptDuration,
                    retryAttempts: [],
                });

                flushAllLogBatches(c);

                return new Response(firstResponse.clone().body, {
                    status: firstResponse.clone().status,
                    headers: filteredResponseHeaders,
                });
            }
        }

        const firstError = this.createProxyError(firstResponse.clone(), firstAttemptDuration);
        const firstProviderError = await this.extractProviderErrorWithBody(firstResponse.clone());
        const firstRetryAttempt = this.createRetryAttempt({
            attemptNumber: 1,
            apiKeyId: firstApiKey.id,
            error: firstError,
            durationMs: firstAttemptDuration,
            providerError: firstProviderError,
        });

        this.logApiKeyUsage(c, {
            apiKeyId: firstApiKey.id,
            isSuccessful: false,
            error: firstError,
            providerError: firstProviderError,
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
            initialProviderError: firstProviderError,
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
        initialProviderError?: ProviderErrorData;
        initialRetryAttempt?: RetryAttemptData;
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
            initialProviderError,
            initialRetryAttempt,
            options,
        } = params;

        let retryAttempts: RetryAttemptData[] = initialRetryAttempt ? [initialRetryAttempt] : [];
        let lastError: ProxyError = initialError;
        let lastProviderError: ProviderErrorData | null = initialProviderError
            ? { ...initialProviderError }
            : null;

        const retriesTimes = this.calculateRetryAttempts(retryConfig.maxRetries, allApiKeys.length);
        console.log(
            `Starting retry process: ${retriesTimes} attempts with ${allApiKeys.length} available API keys (maxRetries: ${retryConfig.maxRetries})`,
        );

        // If no retries configured, return the initial error
        if (retriesTimes === 0) {
            console.log('No retries configured, returning initial error');
            return this.createErrorResponse(c, {
                requestId,
                proxyApiKeyData,
                proxyRequestDataParsed,
                baseRequest,
                lastError,
                lastProviderError,
                retryAttempts,
            });
        }

        for (
            let currentAttempt = startAttemptIndex;
            currentAttempt <= retriesTimes;
            currentAttempt++
        ) {
            let selectedApiKey: ApiKeyWithStats | undefined;
            let attemptStart: number = Date.now();

            try {
                console.log(
                    `Retry attempt ${currentAttempt} of ${retriesTimes} (${allApiKeys.length} total API keys available)`,
                );

                // Safety check: ensure we don't try to access API keys beyond what's available
                if (currentAttempt >= allApiKeys.length) {
                    console.log(
                        `No more API keys available (attempt ${currentAttempt} >= ${allApiKeys.length} available keys)`,
                    );
                    const error = new InvalidKeyError('No more API keys available for retry');
                    const retryAttempt = this.createRetryAttempt({
                        attemptNumber: currentAttempt + 1,
                        apiKeyId: null,
                        error,
                        durationMs: 0,
                        providerError: { status: 0, headers: {}, body: '' },
                    });
                    retryAttempts.push(retryAttempt);
                    throw error;
                }

                selectedApiKey = allApiKeys[currentAttempt];
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
                    const providerError = await this.extractProviderErrorWithBody(response.clone());

                    this.logApiKeyUsage(c, {
                        apiKeyId: selectedApiKey.id,
                        isSuccessful: false,
                        error,
                        providerError,
                    });

                    const retryAttempt = this.createRetryAttempt({
                        attemptNumber: currentAttempt + 1,
                        apiKeyId: selectedApiKey.id,
                        error,
                        durationMs: attemptDuration,
                        providerError,
                    });
                    retryAttempts.push(retryAttempt);

                    if (currentAttempt >= retriesTimes || !this.shouldRetry(error)) {
                        lastError = error;
                        lastProviderError = providerError;
                        break;
                    }

                    lastError = error;
                    lastProviderError = providerError;
                    continue;
                }

                // Even when response is OK, evaluate optional zero-completion retry rule
                const treatOkAsFailure = await this.shouldTreatOkAsFailure({
                    response,
                    apiFormat: proxyRequestDataParsed.apiFormat,
                    options,
                });
                if (treatOkAsFailure) {
                    const syntheticError = this.createSyntheticError(response.status);
                    const providerError = this.extractProviderError(response);

                    this.logApiKeyUsage(c, {
                        apiKeyId: selectedApiKey.id,
                        isSuccessful: false,
                        error: syntheticError,
                        providerError,
                    });

                    const retryAttempt = this.createRetryAttempt({
                        attemptNumber: currentAttempt + 1,
                        apiKeyId: selectedApiKey.id,
                        error: syntheticError,
                        durationMs: attemptDuration,
                        providerError,
                    });
                    retryAttempts.push(retryAttempt);

                    if (currentAttempt >= retriesTimes || !this.shouldRetry(syntheticError)) {
                        lastError = syntheticError;
                        lastProviderError = providerError;
                        break;
                    }

                    lastError = syntheticError;
                    lastProviderError = providerError;
                    continue;
                }

                this.logApiKeyUsage(c, { apiKeyId: selectedApiKey.id, isSuccessful: true });

                const responseClone = response.clone();
                const responseCloneForLog = response.clone();
                const filteredResponseHeaders = this.filterResponseHeaders(responseClone.headers);

                this.logRequestSuccess(c, {
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
                    responseBody: responseCloneForLog,
                    isStream: proxyRequestDataParsed.stream,
                    durationMs: attemptDuration,
                    retryAttempts: retryAttempts.length > 0 ? retryAttempts : [],
                });

                flushAllLogBatches(c);

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

                const retryAttempt = this.createRetryAttempt({
                    attemptNumber: currentAttempt + 1,
                    apiKeyId: selectedApiKey?.id || null,
                    error: errorObj,
                    durationMs: Date.now() - attemptStart,
                    providerError: { status: 0, headers: {}, body: '' },
                });
                retryAttempts.push(retryAttempt);

                lastError = errorObj;
                break;
            }
        }

        return this.createErrorResponse(c, {
            requestId,
            proxyApiKeyData,
            proxyRequestDataParsed,
            baseRequest,
            lastError,
            lastProviderError,
            retryAttempts,
        });
    }

    // Helper methods to reduce code duplication
    private static calculateRetryAttempts(maxRetries: number, availableApiKeys: number): number {
        if (maxRetries === -1) {
            return Math.min(availableApiKeys, this.MAX_RETRIES_SAFETY_CAP);
        } else if (maxRetries > 0) {
            return Math.min(maxRetries, availableApiKeys);
        }
        return 0;
    }

    private static createSyntheticError(status: number): ProxyError {
        return new ProxyError(
            'Zero completion tokens detected',
            'server_error',
            status,
            'zero_completion_tokens',
        );
    }

    private static createRetryAttempt(params: {
        attemptNumber: number;
        apiKeyId: string | null;
        error: ProxyError;
        durationMs: number;
        providerError: ProviderErrorData;
    }): RetryAttemptData {
        return {
            attempt_number: params.attemptNumber,
            api_key_id: params.apiKeyId,
            error: {
                message: params.error.message,
                type: params.error.type,
                status: params.error.status,
                code: params.error.code,
            },
            duration_ms: params.durationMs,
            timestamp: new Date().toISOString(),
            provider_error: {
                status: params.providerError.status,
                headers: params.providerError.headers,
                raw_body: params.providerError.body,
            },
        };
    }

    private static extractProviderError(response: Response): ProviderErrorData {
        return {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: '',
        };
    }

    private static async extractProviderErrorWithBody(
        response: Response,
    ): Promise<ProviderErrorData> {
        let providerBody = '';
        try {
            providerBody = await response.text();
        } catch {
            providerBody = '';
        }
        return {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: providerBody?.slice(0, this.ERROR_BODY_MAX_LENGTH) || '',
        };
    }

    private static logApiKeyUsage(
        c: Context<HonoApp>,
        params: {
            apiKeyId: string;
            isSuccessful: boolean;
            error?: ProxyError;
            providerError?: ProviderErrorData;
        },
    ): void {
        const { apiKeyId, isSuccessful, error, providerError } = params;

        if (isSuccessful) {
            BatchLoggerService.addApiKeyUsage(c, { apiKeyId, isSuccessful: true });
        } else if (error && providerError) {
            BatchLoggerService.addApiKeyUsage(c, {
                apiKeyId,
                isSuccessful: false,
                errorDetails: {
                    message: error.message,
                    type: error.type,
                    status: error.status,
                    code: error.code,
                    provider_status: providerError.status,
                    provider_headers: providerError.headers,
                    provider_raw_body: providerError.body,
                },
            });
        }
    }

    private static logRequestSuccess(
        c: Context<HonoApp>,
        params: {
            requestId: string;
            apiKeyId: string;
            proxyKeyId: string;
            userId: string | null;
            apiFormat: ProxyRequestDataParsed['apiFormat'];
            requestData: any;
            responseData: any;
            responseBody: Response;
            isStream: boolean;
            durationMs: number;
            retryAttempts: RetryAttemptData[];
        },
    ): void {
        const {
            requestId,
            apiKeyId,
            proxyKeyId,
            userId,
            apiFormat,
            requestData,
            responseData,
            responseBody,
            isStream,
            durationMs,
            retryAttempts,
        } = params;

        BatchLoggerService.addRequestLog(c, {
            requestId,
            apiKeyId,
            proxyKeyId,
            userId,
            apiFormat,
            requestData,
            responseData,
            isSuccessful: true,
            isStream,
            performanceMetrics: {
                duration_ms: durationMs,
                attempt_count: retryAttempts.length + 1,
            },
            responseBody: responseBody,
            retryAttempts,
        });
    }

    private static createErrorResponse(
        c: Context<HonoApp>,
        params: {
            requestId: string;
            proxyApiKeyData: Tables<'proxy_api_keys'>;
            proxyRequestDataParsed: ProxyRequestDataParsed;
            baseRequest: Request;
            lastError: ProxyError;
            lastProviderError: ProviderErrorData | null;
            retryAttempts: RetryAttemptData[];
        },
    ): Response {
        const {
            requestId,
            proxyApiKeyData,
            proxyRequestDataParsed,
            baseRequest,
            lastError,
            lastProviderError,
            retryAttempts,
        } = params;

        BatchLoggerService.addRequestLog(c, {
            requestId,
            apiKeyId: null,
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
                duration_ms: 0,
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
            retryAttempts,
        });

        flushAllLogBatches(c);

        // If we have provider error details, return raw provider body & headers
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

        // Fallback: return gproxy JSON error
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

        // Pure proxy approach: always try to use the original request body
        let bodyToUse: RequestInit['body'] | null = null;

        try {
            // Try to clone the original request body
            const requestClone = baseRequest.clone();
            if (requestClone.body) {
                bodyToUse = requestClone.body;
            }
        } catch (error) {
            console.warn('Cannot clone original request body:', error);

            // Only use stored body text as absolute fallback
            if (c) {
                const rawBodyText = c.get('rawBodyText');
                if (rawBodyText) {
                    console.warn('Using stored body text as fallback (original unavailable)');
                    bodyToUse = rawBodyText;
                }
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
