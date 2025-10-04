import { Context } from 'hono';

import { ApiKeyService } from './api-key.service';
import { ConfigService } from './config.service';
import { ResponseHandlerService } from './response-handler.service';
import { HonoApp } from '../types';
import type { ProxyRequestDataParsed, ProxyRequestOptions, LoadBalanceStrategy } from '../types';
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
import { getSupabaseClient } from './supabase.service';

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
    c: Context<HonoApp>;
    currentAttempt: number;
    options?: ProxyRequestOptions;
    proxyKeyId: string;
    apiFormat: ProxyRequestDataParsed['apiFormat'];
    model?: string;
    excludeIds?: string[];
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
    durationMs: number; // Individual API call duration
    totalResponseTimeMs: number; // Total response time from start to finish
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
    retryConfig: RetryConfig;
    requestId: string;
    proxyApiKeyData: Tables<'proxy_api_keys'>;
    proxyRequestDataParsed: ProxyRequestDataParsed;
    options?: ProxyRequestOptions;
    usedApiKeyIds: string[];
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
    retryConfig: RetryConfig;
    requestId: string;
    proxyApiKeyData: Tables<'proxy_api_keys'>;
    proxyRequestDataParsed: ProxyRequestDataParsed;
    options?: ProxyRequestOptions;
    usedApiKeyIds: string[];
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
        const requestStartTime = Date.now(); // Track full request duration
        c.set('requestStartTime', requestStartTime); // Store in context for later use
        const context = this.extractRequestContext(c);
        const {
            proxyRequestDataParsed,
            proxyApiKeyData,
            requestId,
            baseRequest,
            retryConfig,
            options,
        } = context;

        this.validateRequest({
            baseRequest,
            apiFormat: proxyRequestDataParsed.apiFormat,
            url: proxyRequestDataParsed.urlToProxy,
        });

        const usedApiKeyIds: string[] = [];
        const firstApiKey = await this.selectOptimalApiKey({
            c,
            currentAttempt: 0,
            options,
            proxyKeyId: proxyApiKeyData.id,
            apiFormat: proxyRequestDataParsed.apiFormat,
            model: proxyRequestDataParsed.model,
            excludeIds: usedApiKeyIds,
        });
        usedApiKeyIds.push(firstApiKey.id);
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
                    retryConfig,
                    requestId,
                    proxyApiKeyData,
                    proxyRequestDataParsed,
                    options,
                    usedApiKeyIds,
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
            retryConfig,
            requestId,
            proxyApiKeyData,
            proxyRequestDataParsed,
            options,
            usedApiKeyIds,
        });
    }

    // ===== CONTEXT EXTRACTION =====
    private static extractRequestContext(c: Context<HonoApp>): RequestContext {
        const proxyRequestDataParsed = c.get('proxyRequestDataParsed');
        const proxyApiKeyData = c.get('proxyApiKeyData');
        const requestId = c.get('proxyRequestId');
        const retryConfigBase = ConfigService.getRetryConfig(c);
        const options = c.get('proxyRequestOptions');
        const retryConfig: RetryConfig = {
            ...retryConfigBase,
            ...(options?.retry || {}),
        };

        // Always create a fresh clone of the original request for all retries
        // This ensures we have a consistent, unmodified request for every attempt
        let baseRequest: Request;
        try {
            baseRequest = c.req.raw.clone();
        } catch (error) {
            console.warn('Failed to clone original request, creating fallback:', error);
            // Build a fresh Request using the original stream if still usable
            try {
                const raw = c.req.raw;
                const headers = new Headers(raw.headers);
                const body = raw.bodyUsed ? undefined : raw.body;
                baseRequest = new Request(raw.url, {
                    method: raw.method,
                    headers,
                    body,
                });
            } catch (innerErr) {
                // Final minimal fallback without body
                const raw = c.req.raw;
                baseRequest = new Request(raw.url, {
                    method: raw.method,
                    headers: raw.headers,
                });
            }
        }

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

        // Validate content-length header consistency
        const contentLength = baseRequest.headers.get('content-length');
        const method = baseRequest.method.toUpperCase();

        if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
            // For methods that typically have bodies, validate content-length
            if (contentLength) {
                const length = parseInt(contentLength, 10);
                if (isNaN(length) || length < 0) {
                    throw new ProxyError(
                        'Invalid content-length header',
                        'validation_error',
                        400,
                        'invalid_request',
                        undefined,
                        false,
                    );
                }
            }
        } else if (method === 'GET' || method === 'HEAD' || method === 'DELETE') {
            // For methods that typically don't have bodies, content-length should be 0 or absent
            if (contentLength && contentLength !== '0') {
                console.warn(`Unexpected content-length for ${method} request: ${contentLength}`);
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

        return this.retryApiRequest({
            c,
            baseRequest,
            startAttemptIndex: 1,
            retryConfig,
            requestId,
            proxyApiKeyData,
            proxyRequestDataParsed,
            initialError: syntheticError,
            initialProviderError: this.extractProviderError(firstResponse),
            initialRetryAttempt: firstRetryAttempt,
            options,
            usedApiKeyIds: [firstApiKey.id], // Exclude the failed API key from retries
        });
    }

    private static async handleSuccessfulResponse(
        params: SuccessfulResponseParams,
    ): Promise<Response> {
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

        return ResponseHandlerService.handleSuccess({
            c,
            response: firstResponse,
            requestId,
            apiKeyId: firstApiKey.id,
            proxyApiKeyData,
            proxyRequestDataParsed,
            baseRequest,
            headers: firstHeaders,
            durationMs: firstAttemptDuration,
            retryAttempts: [],
        });
    }

    private static async handleInitialFailure(params: InitialFailureParams): Promise<Response> {
        const {
            c,
            firstResponse,
            firstApiKey,
            firstAttemptDuration,
            baseRequest,
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

        return this.retryApiRequest({
            c,
            baseRequest,
            startAttemptIndex: 1,
            retryConfig,
            requestId,
            proxyApiKeyData,
            proxyRequestDataParsed,
            initialError: firstError,
            initialProviderError: firstProviderError,
            initialRetryAttempt: firstRetryAttempt,
            options,
            usedApiKeyIds: [firstApiKey.id], // Exclude the failed API key from retries
        });
    }

    // ===== RETRY LOGIC =====
    private static async retryApiRequest(params: {
        c: Context<HonoApp>;
        baseRequest: Request;
        startAttemptIndex: number;
        retryConfig: RetryConfig;
        requestId: string;
        proxyApiKeyData: Tables<'proxy_api_keys'>;
        proxyRequestDataParsed: ProxyRequestDataParsed;
        initialError: ProxyError;
        initialProviderError?: ProviderErrorData;
        initialRetryAttempt?: RetryAttemptData;
        options?: ProxyRequestOptions;
        usedApiKeyIds?: string[];
    }): Promise<Response> {
        const {
            c,
            baseRequest,
            startAttemptIndex,
            retryConfig,
            requestId,
            proxyApiKeyData,
            proxyRequestDataParsed,
            initialError,
            initialProviderError,
            initialRetryAttempt,
            options,
            usedApiKeyIds: initialUsedApiKeyIds = [],
        } = params;

        let retryAttempts: RetryAttemptData[] = initialRetryAttempt ? [initialRetryAttempt] : [];
        let lastError: ProxyError = initialError;
        let lastProviderError: ProviderErrorData | null = initialProviderError
            ? { ...initialProviderError }
            : null;

        // Bound retries by dynamically available API keys for this user (including global keys)
        let availableKeys = 0;
        try {
            availableKeys = await ApiKeyService.countAvailableApiKeys(c, proxyApiKeyData.user_id);
        } catch (err) {
            availableKeys = 0;
        }
        const retriesTimes = this.calculateRetryAttempts(retryConfig.maxRetries, availableKeys);
        console.log(
            `Starting retry process: ${retriesTimes} attempts (maxRetries: ${retryConfig.maxRetries}, availableKeys: ${availableKeys})`,
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

        const usedApiKeyIds: string[] = [...initialUsedApiKeyIds];
        for (
            let currentAttempt = startAttemptIndex;
            currentAttempt <= retriesTimes;
            currentAttempt++
        ) {
            let selectedApiKey: ApiKeyWithStats | undefined;
            let attemptStart: number = Date.now();

            try {
                console.log(`Retry attempt ${currentAttempt} of ${retriesTimes}`);

                selectedApiKey = await this.selectOptimalApiKey({
                    c,
                    currentAttempt,
                    options,
                    proxyKeyId: proxyApiKeyData.id,
                    apiFormat: proxyRequestDataParsed.apiFormat,
                    model: proxyRequestDataParsed.model,
                    excludeIds: usedApiKeyIds,
                });
                usedApiKeyIds.push(selectedApiKey.id);
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

                return ResponseHandlerService.handleSuccess({
                    c,
                    response: response,
                    requestId,
                    apiKeyId: selectedApiKey.id,
                    proxyApiKeyData,
                    proxyRequestDataParsed,
                    baseRequest,
                    headers: headers,
                    durationMs: attemptDuration,
                    retryAttempts: retryAttempts.length > 0 ? retryAttempts : [],
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

        return ResponseHandlerService.handleError({
            c,
            requestId,
            proxyApiKeyData,
            proxyRequestDataParsed,
            baseRequest,
            lastError,
            lastProviderError: lastProviderError || undefined,
            retryAttempts,
        });
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
    private static async selectOptimalApiKey(
        params: ApiKeySelectionParams,
    ): Promise<ApiKeyWithStats> {
        const { c, currentAttempt, options, proxyKeyId, apiFormat, model, excludeIds } = params;

        const strategy = this.getLoadBalanceStrategy(c, options);

        let preferKeyId: string | null = null;
        if (strategy === 'sticky_until_error') {
            try {
                preferKeyId = await this.getLastSuccessfulApiKeyIdForProxyKey(c, {
                    proxyKeyId,
                    apiFormat,
                    model,
                });
            } catch (error) {
                console.warn('Sticky selection lookup failed, falling back:', error);
            }
        }

        const proxyApiKeyData = c.get('proxyApiKeyData');
        const selected = await ApiKeyService.reserveNextApiKey(c, {
            userId: proxyApiKeyData?.user_id ?? null,
            prioritizeLeastRecentlyUsed:
                options?.apiKeySelection?.prioritizeLeastRecentlyUsed ?? true,
            prioritizeLeastErrors: options?.apiKeySelection?.prioritizeLeastErrors ?? true,
            prioritizeNewer: options?.apiKeySelection?.prioritizeNewer ?? true,
            excludeIds: excludeIds || [],
            preferKeyId: preferKeyId,
        });

        if (!selected) {
            throw new InvalidKeyError('No API key found');
        }

        console.log(`${strategy} selection: reserved API key for attempt ${currentAttempt + 1}`);

        // Adapt to ApiKeyWithStats minimal shape used by the rest of the service
        return {
            id: selected.id,
            api_key_value: selected.api_key_value,
            created_at: selected.created_at,
            last_used_at: selected.last_used_at,
            last_error_at: selected.last_error_at,
            failure_count: selected.failure_count,
        } as unknown as ApiKeyWithStats;
    }

    private static getLoadBalanceStrategy(
        c: Context<HonoApp>,
        options?: ProxyRequestOptions,
    ): LoadBalanceStrategy {
        return options?.loadbalance?.strategy || ConfigService.getLoadBalanceStrategy(c);
    }

    private static hasRecentError(apiKey: ApiKeyWithStats): boolean {
        if (!apiKey.last_error_at) return false;
        const errorAt = new Date(apiKey.last_error_at as string).getTime();
        const lastUsedAt = apiKey.last_used_at
            ? new Date(apiKey.last_used_at as string).getTime()
            : 0;
        // Consider "recent" if the last error happened after or at the last usage
        return errorAt >= lastUsedAt;
    }

    private static async getLastSuccessfulApiKeyIdForProxyKey(
        c: Context<HonoApp>,
        params: {
            proxyKeyId: string;
            apiFormat: ProxyRequestDataParsed['apiFormat'];
            model?: string;
        },
    ): Promise<string | null> {
        const supabase = getSupabaseClient(c);

        // Build filters: match proxy key, api format, successful, and optionally model
        const { data, error } = await supabase
            .from('request_logs')
            .select('api_key_id, usage_metadata, created_at')
            .eq('proxy_key_id', params.proxyKeyId)
            .eq('is_successful', true)
            .eq('api_format', params.apiFormat)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.warn('Failed to query last successful api_key_id for proxy key:', error);
            return null;
        }
        if (!data || data.length === 0) {
            return null;
        }

        // Prefer same-model sticky if provided and still healthy; otherwise fallback to any healthy recent key
        const pickHealthy = async (apiKeyId: string | null) => {
            if (!apiKeyId) return null;
            const { data: key } = await supabase
                .from('api_keys')
                .select('id, is_active, last_used_at, last_error_at')
                .eq('id', apiKeyId)
                .single();
            if (!key || key.is_active === false) return null;
            const errAt = key.last_error_at ? new Date(key.last_error_at).getTime() : null;
            const usedAt = key.last_used_at ? new Date(key.last_used_at).getTime() : null;
            // Healthy if no error or last error before last use
            if (!errAt) return key.id as string;
            if (usedAt && errAt < usedAt) return key.id as string;
            return null;
        };

        // 1) Try exact model match first
        if (params.model) {
            try {
                for (const row of data) {
                    const meta = row.usage_metadata as unknown;
                    const modelValue =
                        meta &&
                        typeof meta === 'object' &&
                        'model' in (meta as Record<string, unknown>)
                            ? (meta as { model?: string }).model
                            : undefined;
                    if (row.api_key_id && modelValue && modelValue === params.model) {
                        const healthy = await pickHealthy(row.api_key_id);
                        if (healthy) return healthy;
                    }
                }
            } catch {
                // continue to fallback
            }
        }

        // 2) Fallback to any recent healthy key from the history
        for (const row of data) {
            if (!row.api_key_id) continue;
            const healthy = await pickHealthy(row.api_key_id);
            if (healthy) return healthy;
        }

        return null;
    }

    // ===== REQUEST PROCESSING =====
    private static async performAttempt(
        params: AttemptParams,
    ): Promise<{ response: Response; durationMs: number; headers: Headers }> {
        const { baseRequest, apiKeyValue, apiFormat, url, c } = params;

        // Always create a fresh clone from the original base request for this attempt
        // This ensures we never consume the original request body
        let attemptRequest: Request;
        try {
            attemptRequest = baseRequest.clone();
        } catch (error) {
            console.warn('Failed to clone base request for attempt, creating safe copy:', error);
            try {
                const headersCopy = new Headers(baseRequest.headers);
                const body = (baseRequest as unknown as { bodyUsed?: boolean }).bodyUsed
                    ? undefined
                    : baseRequest.body;
                attemptRequest = new Request(baseRequest.url, {
                    method: baseRequest.method,
                    headers: headersCopy,
                    body,
                });
            } catch (innerErr) {
                throw new ProxyError(
                    'Failed to create request for retry attempt',
                    'server_error',
                    500,
                    'request_clone_failed',
                    undefined,
                    true,
                );
            }
        }

        const headers = new Headers(attemptRequest.headers);

        // Remove internal control headers so they are not sent to the origin
        headers.forEach((_v, k) => {
            if (
                k.toLowerCase().startsWith('x-gproxy-') ||
                HEADERS_REMOVE_TO_ORIGIN.includes(k.toLowerCase())
            ) {
                headers.delete(k);
            }
        });

        // Set origin header properly using URL parsing
        try {
            const urlObj = new URL(url);
            headers.set('origin', `${urlObj.protocol}//${urlObj.host}`);
        } catch (error) {
            console.warn('Failed to parse URL for origin header:', error);
            // Fallback to original behavior
            headers.set('origin', url.split('/')[2]);
        }

        // Set API key header based on format
        if (apiFormat === 'gemini') {
            headers.set('x-goog-api-key', apiKeyValue);
        } else {
            headers.set('authorization', `Bearer ${apiKeyValue}`);
        }

        // Use the fresh clone's body directly - no need for complex fallback logic
        const requestInit: RequestInit = {
            method: attemptRequest.method,
            headers,
            body: attemptRequest.body,
        };

        // Add duplex mode for Node.js environments if body exists
        if (attemptRequest.body && typeof process !== 'undefined') {
            (requestInit as RequestInit & { duplex?: 'half' }).duplex = 'half';
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
