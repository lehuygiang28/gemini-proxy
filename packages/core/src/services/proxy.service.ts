import { Context } from 'hono';
import { ApiKeyService } from './api-key.service';
import { BatchLoggerService } from './batch-logger.service';
import { ConfigService } from './config.service';
import { HonoApp } from '../types';
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
        const clonedRequest = c.req.raw.clone();

        const retryConfig = ConfigService.getRetryConfig(c);
        let currentAttempt = 0;
        let lastError: ProxyError | null = null;
        let retryAttempts: any[] = [];
        let finalApiKeyId = 'unknown';
        let finalResponse: Response | null = null;
        let finalAttemptDuration = 0;

        // Get all available API keys upfront to avoid multiple database calls
        const allApiKeys = await ApiKeyService.getSmartApiKeys(c, {
            userId: proxyApiKeyData.user_id,
            prioritizeLeastRecentlyUsed: true,
            prioritizeLeastErrors: true,
            prioritizeNewer: true,
            count: retryConfig.maxRetries, // Get enough keys for all retry attempts
        });

        if (!allApiKeys || allApiKeys.length === 0) {
            throw new InvalidKeyError('No API key found');
        }

        while (currentAttempt <= Math.max(retryConfig.maxRetries, allApiKeys?.length)) {
            try {
                // Select the next available API key
                const selectedApiKey = allApiKeys[currentAttempt];
                if (!selectedApiKey) {
                    throw new InvalidKeyError('No more API keys available for retry');
                }

                const attemptStart = Date.now();

                // Clone the request for each attempt to avoid "already used" issues
                const requestClone = clonedRequest.clone();

                // Create a new headers object to avoid immutable header issues
                const headers = new Headers(requestClone.headers);

                // Add the appropriate API key header based on format
                if (proxyRequestDataParsed.apiFormat === 'gemini') {
                    headers.set('x-goog-api-key', selectedApiKey.api_key_value);
                } else {
                    headers.set('authorization', `Bearer ${selectedApiKey.api_key_value}`);
                }

                const requestInit: RequestInit = {
                    method: requestClone.method,
                    headers,
                };

                // Add body if it exists
                if (requestClone.body) {
                    requestInit.body = requestClone.body;
                    // Node.js requires duplex option when sending a body
                    if (typeof process !== 'undefined') {
                        requestInit.duplex = 'half';
                    }
                }

                const response = await fetch(
                    new Request(proxyRequestDataParsed.urlToProxy, requestInit),
                );
                const attemptDuration = Date.now() - attemptStart;

                if (!response.ok) {
                    const error = this.createProxyError(response, attemptDuration);

                    // Add API key usage to batch (non-blocking)
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

                    // Log the failed attempt
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

                    // Check if we should retry
                    if (currentAttempt >= retryConfig.maxRetries || !this.shouldRetry(error)) {
                        throw error;
                    }

                    lastError = error;
                    currentAttempt++;
                    continue; // No delay, retry immediately
                }

                // Success - add API key usage to batch (non-blocking)
                BatchLoggerService.addApiKeyUsage(c, {
                    apiKeyId: selectedApiKey.id,
                    isSuccessful: true,
                });

                finalApiKeyId = selectedApiKey.id;
                finalResponse = response;
                finalAttemptDuration = attemptDuration;

                // Clone the response to avoid "already used" issues
                const responseClone = response.clone();
                const filteredResponseHeaders = this.filterResponseHeaders(responseClone.headers);

                // Add successful request log to batch (non-blocking) - parsing will be done in batch logger
                BatchLoggerService.addRequestLog(c, {
                    requestId,
                    apiKeyId: finalApiKeyId,
                    proxyKeyId: proxyApiKeyData.id,
                    userId: proxyApiKeyData.user_id,
                    apiFormat: proxyRequestDataParsed.apiFormat,
                    requestData: {
                        method: requestClone.method,
                        url: proxyRequestDataParsed.urlToProxy,
                        headers: Object.fromEntries(headers.entries()),
                    },
                    responseData: {
                        status: response.status,
                        headers: Object.fromEntries(response.headers.entries()),
                    },
                    isSuccessful: true,
                    performanceMetrics: {
                        duration_ms: finalAttemptDuration,
                        attempt_count: currentAttempt + 1,
                    },
                    responseBody: responseClone.clone(), // Pass the response for async parsing
                    retryAttempts: retryAttempts.length > 0 ? retryAttempts : null,
                });

                // Return the cloned response to preserve streaming
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

                // Add failed request log to batch (non-blocking)
                BatchLoggerService.addRequestLog(c, {
                    requestId,
                    apiKeyId: finalApiKeyId,
                    proxyKeyId: proxyApiKeyData.id,
                    userId: proxyApiKeyData.user_id,
                    apiFormat: proxyRequestDataParsed.apiFormat,
                    requestData: {
                        method: clonedRequest.method,
                        url: proxyRequestDataParsed.urlToProxy,
                    },
                    isSuccessful: false,
                    errorDetails: {
                        message: errorObj.message,
                        type: errorObj.type,
                        status: errorObj.status,
                        code: errorObj.code,
                    },
                    retryAttempts: retryAttempts.length > 0 ? retryAttempts : null,
                });

                // Return error response
                return c.json(
                    {
                        error: errorObj.type,
                        message: errorObj.message,
                        code: errorObj.code,
                    },
                    (errorObj.status as any) || 500,
                );
            }
        }

        // This should never be reached, but just in case
        return c.json(
            {
                error: 'server_error',
                message: lastError?.message || 'Max retries exceeded',
            },
            500,
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
}
