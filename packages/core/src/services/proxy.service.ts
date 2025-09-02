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

// ===== INTERFACES =====
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

interface RequestContext {
    proxyRequestDataParsed: ProxyRequestDataParsed;
    proxyApiKeyData: Tables<'proxy_api_keys'>;
    requestId: string;
    baseRequest: Request;
    retryConfig: RetryConfig;
    options?: ProxyRequestOptions;
}

interface RequestValidationParams {
    baseRequest: Request;
    apiFormat: ProxyRequestDataParsed['apiFormat'];
    url: string;
}

interface ApiKeySelectionParams {
    allApiKeys: ApiKeyWithStats[];
    currentAttempt: number;
    options?: ProxyRequestOptions;
}

interface AttemptParams {
    baseRequest: Request;
    apiKeyValue: string;
    apiFormat: ProxyRequestDataParsed['apiFormat'];
    url: string;
    c?: Context<HonoApp>;
}

interface RetryAttemptParams {
    attemptNumber: number;
    apiKeyId: string | null;
    error: ProxyError;
    durationMs: number;
    providerError: ProviderErrorData;
}

interface ApiKeyUsageParams {
    apiKeyId: string;
    isSuccessful: boolean;
    error?: ProxyError;
    providerError?: ProviderErrorData;
}

interface RequestSuccessParams {
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
}

interface ErrorResponseParams {
    requestId: string;
    proxyApiKeyData: Tables<'proxy_api_keys'>;
    proxyRequestDataParsed: ProxyRequestDataParsed;
    baseRequest: Request;
    lastError: ProxyError;
    lastProviderError: ProviderErrorData | null;
    retryAttempts: RetryAttemptData[];
}

interface ZeroCompletionParams {
    response: Response;
    apiFormat: ProxyRequestDataParsed['apiFormat'];
    options?: { retry?: { onZeroCompletionTokens?: boolean } };
}

interface SyntheticFailureParams {
    c: Context<HonoApp>;
    firstResponse: Response;
    firstApiKey: ApiKeyWithStats;
    firstAttemptDuration: number;
    baseRequest: Request;
    allApiKeys: ApiKeyWithStats[];
    retryConfig: RetryConfig;
    requestId: string;
    proxyApiKeyData: Tables<'proxy_api_keys'>;
    proxyRequestDataParsed: ProxyRequestDataParsed;
    options?: ProxyRequestOptions;
}

interface SuccessfulResponseParams {
    c: Context<HonoApp>;
    firstResponse: Response;
    firstApiKey: ApiKeyWithStats;
    firstAttemptDuration: number;
    firstHeaders: Headers;
    baseRequest: Request;
    proxyRequestDataParsed: ProxyRequestDataParsed;
    proxyApiKeyData: Tables<'proxy_api_keys'>;
    requestId: string;
}

interface InitialFailureParams {
    c: Context<HonoApp>;
    firstResponse: Response;
    firstApiKey: ApiKeyWithStats;
    firstAttemptDuration: number;
    baseRequest: Request;
    allApiKeys: ApiKeyWithStats[];
    retryConfig: RetryConfig;
    requestId: string;
    proxyApiKeyData: Tables<'proxy_api_keys'>;
    proxyRequestDataParsed: ProxyRequestDataParsed;
    options?: ProxyRequestOptions;
}

export class ProxyService {
    // ===== CONSTANTS =====
    private static readonly MAX_RETRIES_SAFETY_CAP = 50;
    private static readonly ERROR_BODY_MAX_LENGTH = 4000;
    private static readonly VALID_HTTP_METHODS = [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'HEAD',
        'OPTIONS',
    ];
    private static readonly BLOCKED_RESPONSE_HEADERS = [
        'content-encoding',
        'transfer-encoding',
        'connection',
        'keep-alive',
        'set-cookie',
        'alt-svc',
        'server-timing',
        'vary',
    ];

    // High availability: Only retry errors that can be fixed by retrying
    private static readonly RETRYABLE_STATUS_CODES = new Set([
        401, // Unauthorized - API key issue
        403, // Forbidden - API key permissions
        408, // Request timeout - temporary network issue
        409, // Conflict - temporary resource conflict
        423, // Locked - resource might unlock
        429, // Rate limit - definitely retry with different API key
        500, // Internal server error - server down/issue, try different API key
        502, // Bad gateway - upstream server issue, try different API key
        503, // Service unavailable - server temporarily down, try different API key
        504, // Gateway timeout - server timeout, try different API key
        507, // Insufficient storage - server resource issue, try different API key
        508, // Loop detected - server configuration issue, try different API key
        509, // Bandwidth limit exceeded - server resource issue, try different API key
        598, // Network read timeout - server network issue, try different API key
        599, // Network connect timeout - server connection issue, try different API key
    ]);

    // Client errors that should NOT be retried
    private static readonly NON_RETRYABLE_STATUS_CODES = new Set([
        400, // Bad request - client error
    ]);

    // ===== MAIN ENTRY POINT =====
    static async makeApiRequest(params: { c: Context<HonoApp> }): Promise<Response> {
        const { c } = params;
        const context = this.extractRequestContext(c);
        const {
            proxyRequestDataParsed,
            proxyApiKeyData,
            requestId,
            baseRequest,
            retryConfig,
            options,
        } = context;

        const allApiKeys = await this.fetchApiKeys(c, proxyApiKeyData, options);
        this.validateRequest({
            baseRequest,
            apiFormat: proxyRequestDataParsed.apiFormat,
            url: proxyRequestDataParsed.urlToProxy,
        });

        const firstApiKey = allApiKeys[0];
        const attemptResult = await this.performAttempt({
            baseRequest,
            apiKeyValue: firstApiKey.api_key_value,
            apiFormat: proxyRequestDataParsed.apiFormat,
            url: proxyRequestDataParsed.urlToProxy,
            c,
        });
        const {
            response: firstResponse,
            headers: firstHeaders,
            durationMs: firstAttemptDuration,
        } = attemptResult;

        if (firstResponse.ok) {
            const shouldTreatAsFailure = await this.shouldTreatOkAsFailure({
                response: firstResponse.clone(),
                apiFormat: proxyRequestDataParsed.apiFormat,
                options,
            });

            if (shouldTreatAsFailure) {
                return this.handleSyntheticFailure({
                    c,
                    firstResponse,
                    firstApiKey,
                    firstAttemptDuration,
                    baseRequest,
                    allApiKeys,
                    retryConfig,
                    requestId,
                    proxyApiKeyData,
                    proxyRequestDataParsed,
                    options,
                });
            } else {
                return this.handleSuccessfulResponse({
                    c,
                    firstResponse,
                    firstApiKey,
                    firstAttemptDuration,
                    firstHeaders,
                    baseRequest,
                    proxyRequestDataParsed,
                    proxyApiKeyData,
                    requestId,
                });
            }
        }

        return this.handleInitialFailure({
            c,
            firstResponse,
            firstApiKey,
            firstAttemptDuration,
            baseRequest,
            allApiKeys,
            retryConfig,
            requestId,
            proxyApiKeyData,
            proxyRequestDataParsed,
            options,
        });
    }

    // ===== CONTEXT EXTRACTION =====
    private static extractRequestContext(c: Context<HonoApp>): RequestContext {
        const proxyRequestDataParsed = c.get('proxyRequestDataParsed');
        const proxyApiKeyData = c.get('proxyApiKeyData');
        const requestId = c.get('proxyRequestId');
        const rawBodyText = c.get('rawBodyText');
        const baseRequest = createRetryRequest(c.req.raw, rawBodyText);
        const retryConfigBase = ConfigService.getRetryConfig(c);
        const options = c.get('proxyRequestOptions');
        const retryConfig: RetryConfig = {
            ...retryConfigBase,
            ...(options?.retry || {}),
        };

        return {
            proxyRequestDataParsed,
            proxyApiKeyData,
            requestId,
            baseRequest,
            retryConfig,
            options,
        };
    }

    // ===== API KEY MANAGEMENT =====
    private static async fetchApiKeys(
        c: Context<HonoApp>,
        proxyApiKeyData: Tables<'proxy_api_keys'>,
        options?: ProxyRequestOptions,
    ): Promise<ApiKeyWithStats[]> {
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
        return allApiKeys;
    }

    // ===== REQUEST VALIDATION =====
    private static validateRequest(params: RequestValidationParams): void {
        const { baseRequest, apiFormat, url } = params;

        // Check if URL is valid
        try {
            new URL(url);
        } catch {
            throw new ProxyError(
                'Invalid URL format',
                'validation_error',
                400,
                'invalid_request',
                undefined,
                false,
            );
        }

        // Check if method is valid
        if (!this.VALID_HTTP_METHODS.includes(baseRequest.method.toUpperCase())) {
            throw new ProxyError(
                `Invalid HTTP method: ${baseRequest.method}`,
                'validation_error',
                400,
                'invalid_request',
                undefined,
                false,
            );
        }

        // Check if request has required headers for the API format
        if (apiFormat === 'openai' && !baseRequest.headers.get('content-type')) {
            if (baseRequest.method.toUpperCase() === 'POST') {
                throw new ProxyError(
                    'Missing content-type header for OpenAI API',
                    'validation_error',
                    400,
                    'invalid_request',
                    undefined,
                    false,
                );
            }
        }
    }

    // ===== RESPONSE HANDLING =====
    private static async handleSyntheticFailure(params: SyntheticFailureParams): Promise<Response> {
        const {
            c,
            firstResponse,
            firstApiKey,
            firstAttemptDuration,
            baseRequest,
            allApiKeys,
            retryConfig,
            requestId,
            proxyApiKeyData,
            proxyRequestDataParsed,
            options,
        } = params;

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
    }

    private static handleSuccessfulResponse(params: SuccessfulResponseParams): Response {
        const {
            c,
            firstResponse,
            firstApiKey,
            firstAttemptDuration,
            firstHeaders,
            baseRequest,
            proxyRequestDataParsed,
            proxyApiKeyData,
            requestId,
        } = params;

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

    private static async handleInitialFailure(params: InitialFailureParams): Promise<Response> {
        const {
            c,
            firstResponse,
            firstApiKey,
            firstAttemptDuration,
            baseRequest,
            allApiKeys,
            retryConfig,
            requestId,
            proxyApiKeyData,
            proxyRequestDataParsed,
            options,
        } = params;

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

    // ===== RETRY LOGIC =====
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

                selectedApiKey = this.selectOptimalApiKey({ allApiKeys, currentAttempt, options });
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

    // ===== HELPER METHODS =====
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

    private static createRetryAttempt(params: RetryAttemptParams): RetryAttemptData {
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

    private static logApiKeyUsage(c: Context<HonoApp>, params: ApiKeyUsageParams): void {
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

    private static logRequestSuccess(c: Context<HonoApp>, params: RequestSuccessParams): void {
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

    private static createErrorResponse(c: Context<HonoApp>, params: ErrorResponseParams): Response {
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

    // ===== ERROR HANDLING =====
    private static createProxyError(response: Response, durationMs: number): ProxyError {
        const status = response.status;

        // High availability: Only retry errors that can be fixed by retrying
        if (this.RETRYABLE_STATUS_CODES.has(status)) {
            return this.createRetryableError(status, response);
        }

        if (this.NON_RETRYABLE_STATUS_CODES.has(status)) {
            return this.createNonRetryableError(status);
        }

        // All 5xx server errors are retryable for high availability
        // Even if not in our specific list, they indicate server issues that might be resolved with different API keys
        if (status >= 500) {
            return new ServerError('Server error - retry with different API key', status);
        }

        if (status >= 400 && status < 500) {
            return this.createNonRetryableError(status);
        }

        return new NetworkError('Network error');
    }

    private static createRetryableError(status: number, response: Response): ProxyError {
        switch (status) {
            case 401:
                return new InvalidKeyError('Invalid API key');
            case 403:
                return new ProxyError(
                    'Forbidden - insufficient permissions',
                    'invalid_key',
                    status,
                    undefined,
                    undefined,
                    true,
                );
            case 408:
                return new ProxyError(
                    'Request timeout',
                    'network_error',
                    status,
                    undefined,
                    undefined,
                    true,
                );
            case 409:
                return new ProxyError(
                    'Resource conflict',
                    'server_error',
                    status,
                    undefined,
                    undefined,
                    true,
                );
            case 423:
                return new ProxyError(
                    'Resource locked',
                    'server_error',
                    status,
                    undefined,
                    undefined,
                    true,
                );
            case 429:
                return new RateLimitError(
                    'Rate limit exceeded',
                    response.headers.get('retry-after')
                        ? parseInt(response.headers.get('retry-after')!)
                        : undefined,
                );
            case 500:
                return new ProxyError(
                    'Internal server error - server down/issue',
                    'server_error',
                    status,
                    undefined,
                    undefined,
                    true,
                );
            case 502:
                return new ProxyError(
                    'Bad gateway - upstream server issue',
                    'server_error',
                    status,
                    undefined,
                    undefined,
                    true,
                );
            case 503:
                return new ProxyError(
                    'Service unavailable - server temporarily down',
                    'server_error',
                    status,
                    undefined,
                    undefined,
                    true,
                );
            case 504:
                return new ProxyError(
                    'Gateway timeout - server timeout',
                    'server_error',
                    status,
                    undefined,
                    undefined,
                    true,
                );
            case 507:
                return new ProxyError(
                    'Insufficient storage - server resource issue',
                    'server_error',
                    status,
                    undefined,
                    undefined,
                    true,
                );
            case 508:
                return new ProxyError(
                    'Loop detected - server configuration issue',
                    'server_error',
                    status,
                    undefined,
                    undefined,
                    true,
                );
            case 509:
                return new ProxyError(
                    'Bandwidth limit exceeded - server resource issue',
                    'server_error',
                    status,
                    undefined,
                    undefined,
                    true,
                );
            case 598:
                return new ProxyError(
                    'Network read timeout - server network issue',
                    'server_error',
                    status,
                    undefined,
                    undefined,
                    true,
                );
            case 599:
                return new ProxyError(
                    'Network connect timeout - server connection issue',
                    'server_error',
                    status,
                    undefined,
                    undefined,
                    true,
                );
            default:
                return new NetworkError('Network error');
        }
    }

    private static createNonRetryableError(status: number): ProxyError {
        const messages = {
            400: 'Bad request - malformed request',
        };

        return new ProxyError(
            messages[status as keyof typeof messages] || `Client error: ${status}`,
            'validation_error',
            status,
            undefined,
            undefined,
            false,
        );
    }

    private static shouldRetry(error: ProxyError): boolean {
        const shouldRetry = error.retryable;

        if (shouldRetry) {
            console.log(`Will retry error: ${error.type} (${error.status}) - ${error.message}`);
        } else {
            console.log(
                `Will NOT retry error: ${error.type} (${error.status}) - ${error.message} - Client error or non-retryable`,
            );
        }

        return shouldRetry;
    }

    // ===== API KEY SELECTION =====
    private static selectOptimalApiKey(params: ApiKeySelectionParams): ApiKeyWithStats {
        const { allApiKeys, currentAttempt } = params;
        const index = currentAttempt % allApiKeys.length;
        const selectedKey = allApiKeys[index];

        console.log(
            `Selected API key ${index + 1}/${allApiKeys.length} for attempt ${currentAttempt + 1}`,
        );

        return selectedKey;
    }

    // ===== REQUEST PROCESSING =====
    private static async performAttempt(
        params: AttemptParams,
    ): Promise<{ response: Response; durationMs: number; headers: Headers }> {
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
            const requestClone = baseRequest.clone();
            if (requestClone.body) {
                bodyToUse = requestClone.body;
            }
        } catch (error) {
            console.warn('Cannot clone original request body:', error);

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

    // ===== RESPONSE FILTERING =====
    private static filterResponseHeaders(headers: Headers): Headers {
        const filteredHeaders = new Headers();

        headers.forEach((value, key) => {
            const lowerKey = key.toLowerCase();
            if (!this.BLOCKED_RESPONSE_HEADERS.includes(lowerKey)) {
                filteredHeaders.set(key, value);
            }
        });

        return filteredHeaders;
    }

    // ===== ZERO COMPLETION DETECTION =====
    private static async shouldTreatOkAsFailure(params: ZeroCompletionParams): Promise<boolean> {
        const { response, apiFormat, options } = params;
        const retryOpts = options?.retry || {};
        if (!retryOpts.onZeroCompletionTokens) return false;

        try {
            const cloned = response.clone();
            const text = await cloned.text();

            const parsed = UsageMetadataParser.parseFromResponseBody(text, apiFormat);
            if (!parsed) {
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
