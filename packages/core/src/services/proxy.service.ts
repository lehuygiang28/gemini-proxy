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

export class ProxyService {
    static async makeApiRequest(params: { c: Context<HonoApp> }): Promise<Response> {
        const { c } = params;
        const proxyRequestDataParsed = c.get('proxyRequestDataParsed');
        const proxyApiKeyData = c.get('proxyApiKeyData');
        const requestId = c.get('proxyRequestId');
        const baseRequest = c.req.raw.clone();

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
        });

        if (firstResponse.ok) {
            const shouldTreatAsFailure = await this.shouldTreatOkAsFailure({
                response: firstResponse,
                apiFormat: proxyRequestDataParsed.apiFormat,
                options,
            });
            if (shouldTreatAsFailure) {
                // proceed to retry path using a synthetic error
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
                    retryAttempts: null,
                });

                return new Response(responseClone.body, {
                    status: responseClone.status,
                    headers: filteredResponseHeaders,
                });
            }
        }

        const firstError = this.createProxyError(firstResponse, firstAttemptDuration);

        BatchLoggerService.addApiKeyUsage(c, {
            apiKeyId: firstApiKey.id,
            isSuccessful: false,
            errorDetails: {
                message: firstError.message,
                type: firstError.type,
                status: firstResponse.status,
                code: firstError.code,
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

        let retryAttempts: Array<{
            attempt_number: number;
            api_key_id: string;
            error: { message: string; type: string; status?: number; code?: string };
            duration_ms: number;
            timestamp: string;
        }> = [];

        let lastError: ProxyError = initialError;
        const retriesTimes =
            retryConfig.maxRetries === -1 ? allApiKeys.length : retryConfig.maxRetries;

        for (
            let currentAttempt = startAttemptIndex;
            currentAttempt <= retriesTimes;
            currentAttempt++
        ) {
            try {
                console.log(`attempt ${currentAttempt} of ${retryConfig.maxRetries}`);
                const selectedApiKey = allApiKeys[currentAttempt];
                if (!selectedApiKey) {
                    throw new InvalidKeyError('No more API keys available for retry');
                }

                const attemptStart = Date.now();
                const { response, headers } = await this.performAttempt({
                    baseRequest,
                    apiKeyValue: selectedApiKey.api_key_value,
                    apiFormat: proxyRequestDataParsed.apiFormat,
                    url: proxyRequestDataParsed.urlToProxy,
                });
                const attemptDuration = Date.now() - attemptStart;

                if (!response.ok) {
                    const error = this.createProxyError(response, attemptDuration);

                    BatchLoggerService.addApiKeyUsage(c, {
                        apiKeyId: selectedApiKey.id,
                        isSuccessful: false,
                        errorDetails: {
                            message: error.message,
                            type: error.type,
                            status: response.status,
                            code: error.code,
                        },
                    });

                    if (currentAttempt > 0) {
                        retryAttempts.push({
                            attempt_number: currentAttempt,
                            api_key_id: selectedApiKey.id,
                            error: {
                                message: error.message,
                                type: error.type,
                                status: response.status,
                                code: error.code,
                            },
                            duration_ms: attemptDuration,
                            timestamp: new Date().toISOString(),
                        });
                    }

                    if (currentAttempt >= retryConfig.maxRetries || !this.shouldRetry(error)) {
                        lastError = error;
                        break;
                    }

                    lastError = error;
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
                        },
                    });

                    if (currentAttempt > 0) {
                        retryAttempts.push({
                            attempt_number: currentAttempt,
                            api_key_id: selectedApiKey.id,
                            error: {
                                message: syntheticError.message,
                                type: syntheticError.type,
                                status: response.status,
                                code: syntheticError.code,
                            },
                            duration_ms: attemptDuration,
                            timestamp: new Date().toISOString(),
                        });
                    }

                    if (
                        currentAttempt >= retryConfig.maxRetries ||
                        !this.shouldRetry(syntheticError)
                    ) {
                        lastError = syntheticError;
                        break;
                    }

                    lastError = syntheticError;
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
                        attempt_count: currentAttempt + 1,
                    },
                    responseBody: responseCloneForLog,
                    retryAttempts: retryAttempts.length > 0 ? retryAttempts : null,
                });

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
            isStream: proxyRequestDataParsed.stream,
            isSuccessful: false,
            errorDetails: {
                message: lastError.message,
                type: lastError.type,
                status: lastError.status,
                code: lastError.code,
            },
            retryAttempts: retryAttempts.length > 0 ? retryAttempts : null,
        });

        return c.json(
            {
                error: lastError.type,
                message: lastError.message,
                code: lastError.code,
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
    }): Promise<{ response: Response; durationMs: number; headers: Headers }> {
        const { baseRequest, apiKeyValue, apiFormat, url } = params;
        const requestClone = baseRequest.clone();
        const headers = new Headers(requestClone.headers);

        // Remove internal control headers so they are not sent to the origin
        headers.forEach((_v, k) => {
            if (k.toLowerCase().startsWith('x-gproxy-')) {
                headers.delete(k);
            }
        });

        if (apiFormat === 'gemini') {
            headers.set('x-goog-api-key', apiKeyValue);
        } else {
            headers.set('authorization', `Bearer ${apiKeyValue}`);
        }

        const requestInit: RequestInit = {
            method: requestClone.method,
            headers,
        };

        if (requestClone.body) {
            requestInit.body = requestClone.body;
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
