import { Context } from 'hono';

import { ApiKeyService } from './api-key.service';
import { ConfigService } from './config.service';
import { ResponseHandlerService } from './response-handler.service';
import { HonoApp } from '../types';
import type { ProxyRequestDataParsed, LoadBalanceStrategy } from '../types';
import type { RetryConfig } from './config.service';
import type { ApiKeyWithStats } from './api-key.service';
import type { Tables } from '@gemini-proxy/database';
import { ProxyError, InvalidKeyError } from '../types/error.type';
import { HEADERS_REMOVE_TO_ORIGIN } from '../constants/headers-to-remove.constant';
import { getSupabaseClient } from './supabase.service';
import { classifyUpstreamError } from '../retry/classify-upstream-error';
import {
    cancelTimeoutSignal,
    createTimeoutSignal,
    mergeAbortSignals,
} from '../retry/create-timeout-signal';
import { computeRetryDelayMs } from '../retry/retry-delay';
import { recordApiKeyFailure, recordApiKeySuccess } from '../retry/record-key-outcome';
import { UPSTREAM_FAILURE_CLASS, type ClassifiedUpstreamFailure } from '../retry/types';

// ===== INTERFACES =====
interface RetryAttemptData {
    attempt_number: number;
    api_key_id: string | null;
    api_key_name?: string | null;
    error: { message: string; type: string; status?: number; code?: string };
    duration_ms: number;
    status: number;
    waited_ms: number;
    class: ClassifiedUpstreamFailure['class'];
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
}

interface RequestValidationParams {
    baseRequest: Request;
    apiFormat: ProxyRequestDataParsed['apiFormat'];
    url: string;
}

interface ApiKeySelectionParams {
    c: Context<HonoApp>;
    currentAttempt: number;
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
    timeoutMs: number;
}

interface RetryAttemptParams {
    attemptNumber: number;
    apiKeyId: string | null;
    apiKeyName?: string | null;
    error: ProxyError;
    durationMs: number;
    providerError: ProviderErrorData;
    waitedMs: number;
    failureClass: ClassifiedUpstreamFailure['class'];
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
    usedApiKeyIds: string[];
    retryBudget: number;
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
    // ===== MAIN ENTRY POINT =====
    static async makeApiRequest(params: { c: Context<HonoApp> }): Promise<Response> {
        const { c } = params;
        const requestStartTime = Date.now(); // Track full request duration
        c.set('requestStartTime', requestStartTime); // Store in context for later use
        const context = this.extractRequestContext(c);
        const { proxyRequestDataParsed, proxyApiKeyData, requestId, baseRequest, retryConfig } =
            context;

        this.validateRequest({
            baseRequest,
            apiFormat: proxyRequestDataParsed.apiFormat,
            url: proxyRequestDataParsed.urlToProxy,
        });

        let availableKeysAtStart = 0;
        try {
            availableKeysAtStart = await ApiKeyService.countAvailableApiKeys(
                c,
                proxyApiKeyData.user_id,
            );
        } catch {
            availableKeysAtStart = 0;
        }
        const retryBudget = this.calculateRetryAttempts(
            retryConfig.maxRetries,
            availableKeysAtStart,
        );
        const usedApiKeyIds: string[] = [];
        const firstApiKey = await this.selectOptimalApiKey({
            c,
            currentAttempt: 0,
            proxyKeyId: proxyApiKeyData.id,
            apiFormat: proxyRequestDataParsed.apiFormat,
            model: proxyRequestDataParsed.model,
            excludeIds: usedApiKeyIds,
        });
        usedApiKeyIds.push(firstApiKey.id);
        const firstAttemptStartedAt = Date.now();
        let attemptResult: { response: Response; durationMs: number; headers: Headers };
        try {
            attemptResult = await this.performAttempt({
                baseRequest,
                apiKeyValue: firstApiKey.api_key_value,
                apiFormat: proxyRequestDataParsed.apiFormat,
                url: proxyRequestDataParsed.urlToProxy,
                timeoutMs: retryConfig.upstreamTimeoutMs,
            });
        } catch (error) {
            return this.handleInitialAttemptException({
                c,
                error,
                firstApiKey,
                firstAttemptDuration: Date.now() - firstAttemptStartedAt,
                baseRequest,
                retryConfig,
                requestId,
                proxyApiKeyData,
                proxyRequestDataParsed,
                usedApiKeyIds,
                retryBudget,
            });
        }
        const {
            response: firstResponse,
            headers: firstHeaders,
            durationMs: firstAttemptDuration,
        } = attemptResult;

        if (firstResponse.ok) {
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
            usedApiKeyIds,
            retryBudget,
        });
    }

    // ===== CONTEXT EXTRACTION =====
    private static extractRequestContext(c: Context<HonoApp>): RequestContext {
        const proxyRequestDataParsed = c.get('proxyRequestDataParsed');
        const proxyApiKeyData = c.get('proxyApiKeyData');
        const requestId = c.get('proxyRequestId');
        const retryConfigBase = ConfigService.getRetryConfig(c);
        const retryConfig: RetryConfig = {
            ...retryConfigBase,
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

        await recordApiKeySuccess(c, firstApiKey.id);
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
            retryBudget,
        } = params;

        const firstProviderError = await this.extractProviderErrorWithBody(firstResponse.clone());
        const firstFailure = classifyUpstreamError({
            status: firstProviderError.status,
            headers: firstProviderError.headers,
            bodyText: firstProviderError.body,
        });
        const firstError = this.createClassifiedProxyError(firstFailure);
        if (firstFailure.class !== UPSTREAM_FAILURE_CLASS.client_invalid) {
            await recordApiKeyFailure(c, {
                apiKeyId: firstApiKey.id,
                failure: firstFailure,
                consecutiveFailures: firstApiKey.consecutive_failures,
            });
        }
        const firstRetryAttempt = this.createRetryAttempt({
            attemptNumber: 1,
            apiKeyId: firstApiKey.id,
            apiKeyName: firstApiKey.name,
            error: firstError,
            durationMs: firstAttemptDuration,
            providerError: firstProviderError,
            waitedMs: 0,
            failureClass: firstFailure.class,
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
            usedApiKeyIds: [firstApiKey.id], // Exclude the failed API key from retries
            retryBudget,
        });
    }

    private static async handleInitialAttemptException(params: {
        c: Context<HonoApp>;
        error: unknown;
        firstApiKey: ApiKeyWithStats;
        firstAttemptDuration: number;
        baseRequest: Request;
        retryConfig: RetryConfig;
        requestId: string;
        proxyApiKeyData: Tables<'proxy_api_keys'>;
        proxyRequestDataParsed: ProxyRequestDataParsed;
        usedApiKeyIds: string[];
        retryBudget: number;
    }): Promise<Response> {
        const isTimeout =
            params.error instanceof DOMException && params.error.name === 'TimeoutError';
        const isClientAbort =
            params.baseRequest.signal.aborted ||
            (params.error instanceof DOMException &&
                params.error.name === 'AbortError' &&
                !isTimeout);
        const failureBase = classifyUpstreamError({
            status: undefined,
            headers: {},
            bodyText: isClientAbort
                ? 'client_aborted'
                : isTimeout
                  ? 'upstream_timeout'
                  : 'network_error',
        });
        const failure: ClassifiedUpstreamFailure = isClientAbort
            ? { ...failureBase, retryable: false, message: 'client_aborted' }
            : failureBase;
        if (!isClientAbort) {
            await recordApiKeyFailure(params.c, {
                apiKeyId: params.firstApiKey.id,
                failure,
                consecutiveFailures: params.firstApiKey.consecutive_failures,
            });
        }
        const proxyError = this.createClassifiedProxyError(failure);
        const retryAttempt = this.createRetryAttempt({
            attemptNumber: 1,
            apiKeyId: params.firstApiKey.id,
            apiKeyName: params.firstApiKey.name,
            error: proxyError,
            durationMs: params.firstAttemptDuration,
            providerError: { status: 0, headers: {}, body: '' },
            waitedMs: 0,
            failureClass: failure.class,
        });
        return this.retryApiRequest({
            c: params.c,
            baseRequest: params.baseRequest,
            startAttemptIndex: 1,
            retryConfig: params.retryConfig,
            requestId: params.requestId,
            proxyApiKeyData: params.proxyApiKeyData,
            proxyRequestDataParsed: params.proxyRequestDataParsed,
            initialError: proxyError,
            initialRetryAttempt: retryAttempt,
            usedApiKeyIds: params.usedApiKeyIds,
            retryBudget: params.retryBudget,
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
        usedApiKeyIds?: string[];
        retryBudget: number;
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
            usedApiKeyIds: initialUsedApiKeyIds = [],
            retryBudget,
        } = params;

        let retryAttempts: RetryAttemptData[] = initialRetryAttempt ? [initialRetryAttempt] : [];
        let lastError: ProxyError = initialError;
        let lastProviderError: ProviderErrorData | null = initialProviderError
            ? { ...initialProviderError }
            : null;

        if (!initialError.retryable) {
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

        console.log(
            `Starting retry process: ${retryBudget} attempts (maxRetries: ${retryConfig.maxRetries})`,
        );

        if (retryBudget === 0) {
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
        let pendingWaitedMs = 0;
        for (
            let currentAttempt = startAttemptIndex;
            currentAttempt <= retryBudget;
            currentAttempt++
        ) {
            let selectedApiKey: ApiKeyWithStats | undefined;
            let attemptStart = Date.now();

            try {
                console.log(`Retry attempt ${currentAttempt} of ${retryBudget}`);
                const selectionParams = {
                    c,
                    currentAttempt,
                    proxyKeyId: proxyApiKeyData.id,
                    apiFormat: proxyRequestDataParsed.apiFormat,
                    model: proxyRequestDataParsed.model,
                    excludeIds: usedApiKeyIds,
                };
                try {
                    selectedApiKey = await this.selectOptimalApiKey(selectionParams);
                } catch (selectionError) {
                    if (baseRequest.signal.aborted) {
                        break;
                    }
                    const availableNow = await ApiKeyService.countAvailableApiKeys(
                        c,
                        proxyApiKeyData.user_id,
                    );
                    if (availableNow > 0) {
                        try {
                            selectedApiKey = await this.selectOptimalApiKey(selectionParams);
                        } catch {
                            selectedApiKey = undefined;
                        }
                    }
                    if (!selectedApiKey) {
                        const remainingCooldownMs =
                            await ApiKeyService.getSoonestRemainingCooldownMs(
                                c,
                                proxyApiKeyData.user_id,
                                usedApiKeyIds,
                            );
                        if (remainingCooldownMs === null) {
                            break;
                        }
                        pendingWaitedMs = Math.min(
                            remainingCooldownMs,
                            computeRetryDelayMs({
                                attempt: currentAttempt,
                                baseDelayMs: retryConfig.baseDelayMs,
                                maxDelayMs: retryConfig.maxDelayMs,
                                random: Math.random,
                            }),
                        );
                        const didCompleteWait = await this.waitForRetryDelay(
                            pendingWaitedMs,
                            baseRequest.signal,
                        );
                        if (!didCompleteWait || baseRequest.signal.aborted) {
                            break;
                        }
                        try {
                            selectedApiKey = await this.selectOptimalApiKey(selectionParams);
                        } catch {
                            console.warn(
                                'No API key became eligible after retry delay:',
                                selectionError,
                            );
                            break;
                        }
                    }
                }
                if (!selectedApiKey) {
                    break;
                }
                usedApiKeyIds.push(selectedApiKey.id);
                attemptStart = Date.now();

                const { response, headers } = await this.performAttempt({
                    baseRequest,
                    apiKeyValue: selectedApiKey.api_key_value,
                    apiFormat: proxyRequestDataParsed.apiFormat,
                    url: proxyRequestDataParsed.urlToProxy,
                    timeoutMs: retryConfig.upstreamTimeoutMs,
                });
                const attemptDuration = Date.now() - attemptStart;

                if (!response.ok) {
                    const providerError = await this.extractProviderErrorWithBody(response.clone());
                    const failure = classifyUpstreamError({
                        status: providerError.status,
                        headers: providerError.headers,
                        bodyText: providerError.body,
                    });
                    const error = this.createClassifiedProxyError(failure);
                    if (failure.class !== UPSTREAM_FAILURE_CLASS.client_invalid) {
                        await recordApiKeyFailure(c, {
                            apiKeyId: selectedApiKey.id,
                            failure,
                            consecutiveFailures: selectedApiKey.consecutive_failures,
                        });
                    }

                    const retryAttempt = this.createRetryAttempt({
                        attemptNumber: currentAttempt + 1,
                        apiKeyId: selectedApiKey.id,
                        apiKeyName: selectedApiKey.name,
                        error,
                        durationMs: attemptDuration,
                        providerError,
                        waitedMs: pendingWaitedMs,
                        failureClass: failure.class,
                    });
                    retryAttempts.push(retryAttempt);
                    pendingWaitedMs = 0;
                    lastError = error;
                    lastProviderError = providerError;

                    if (currentAttempt >= retryBudget || !failure.retryable) {
                        break;
                    }
                    continue;
                }

                await recordApiKeySuccess(c, selectedApiKey.id);
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
                const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';
                const isClientAbort =
                    baseRequest.signal.aborted ||
                    (error instanceof DOMException && error.name === 'AbortError' && !isTimeout);
                const failureBase = classifyUpstreamError({
                    status: undefined,
                    headers: {},
                    bodyText: isClientAbort
                        ? 'client_aborted'
                        : isTimeout
                          ? 'upstream_timeout'
                          : 'network_error',
                });
                const failure: ClassifiedUpstreamFailure = isClientAbort
                    ? { ...failureBase, retryable: false, message: 'client_aborted' }
                    : failureBase;
                const errorObj = this.createClassifiedProxyError(failure);
                if (selectedApiKey && !isClientAbort) {
                    await recordApiKeyFailure(c, {
                        apiKeyId: selectedApiKey.id,
                        failure,
                        consecutiveFailures: selectedApiKey.consecutive_failures,
                    });
                }

                const retryAttempt = this.createRetryAttempt({
                    attemptNumber: currentAttempt + 1,
                    apiKeyId: selectedApiKey?.id || null,
                    apiKeyName: selectedApiKey?.name || null,
                    error: errorObj,
                    durationMs: Date.now() - attemptStart,
                    providerError: { status: 0, headers: {}, body: '' },
                    waitedMs: pendingWaitedMs,
                    failureClass: failure.class,
                });
                retryAttempts.push(retryAttempt);
                pendingWaitedMs = 0;

                lastError = errorObj;
                lastProviderError = null;
                if (currentAttempt >= retryBudget || !failure.retryable) {
                    break;
                }
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

    private static async waitForRetryDelay(
        delayMs: number,
        clientSignal: AbortSignal,
    ): Promise<boolean> {
        if (clientSignal.aborted) {
            return false;
        }
        if (delayMs <= 0) {
            return true;
        }
        return new Promise<boolean>((resolve) => {
            let timeoutId: ReturnType<typeof setTimeout> | undefined;
            const finishWait = (didComplete: boolean): void => {
                if (timeoutId === undefined) {
                    return;
                }
                clearTimeout(timeoutId);
                timeoutId = undefined;
                clientSignal.removeEventListener('abort', handleAbort);
                resolve(didComplete);
            };
            const handleAbort = (): void => finishWait(false);
            timeoutId = setTimeout(() => finishWait(true), delayMs);
            clientSignal.addEventListener('abort', handleAbort, { once: true });
        });
    }

    private static createRetryAttempt(params: RetryAttemptParams): RetryAttemptData {
        return {
            attempt_number: params.attemptNumber,
            api_key_id: params.apiKeyId,
            api_key_name: params.apiKeyName ?? null,
            error: {
                message: params.error.message,
                type: params.error.type,
                status: params.error.status,
                code: params.error.code,
            },
            duration_ms: params.durationMs,
            status: params.error.status ?? params.providerError.status,
            waited_ms: params.waitedMs,
            class: params.failureClass,
            timestamp: new Date().toISOString(),
            provider_error: {
                status: params.providerError.status,
                headers: params.providerError.headers,
                raw_body: params.providerError.body,
            },
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

    private static async createErrorResponse(
        c: Context<HonoApp>,
        params: ErrorResponseParams,
    ): Promise<Response> {
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
    private static createClassifiedProxyError(failure: ClassifiedUpstreamFailure): ProxyError {
        const errorType =
            failure.class === UPSTREAM_FAILURE_CLASS.client_invalid
                ? 'validation_error'
                : failure.class === UPSTREAM_FAILURE_CLASS.key_invalid ||
                    failure.class === UPSTREAM_FAILURE_CLASS.key_permission
                  ? 'invalid_key'
                  : failure.class === UPSTREAM_FAILURE_CLASS.rate_limit ||
                      failure.class === UPSTREAM_FAILURE_CLASS.spend_limit
                    ? 'rate_limit'
                    : failure.class === UPSTREAM_FAILURE_CLASS.transient
                      ? 'network_error'
                      : 'unknown';
        return new ProxyError(
            failure.message,
            errorType,
            failure.status,
            undefined,
            undefined,
            failure.retryable,
        );
    }

    // ===== API KEY SELECTION =====
    private static async selectOptimalApiKey(
        params: ApiKeySelectionParams,
    ): Promise<ApiKeyWithStats> {
        const { c, currentAttempt, proxyKeyId, apiFormat, model, excludeIds } = params;

        const strategy = this.getLoadBalanceStrategy(c);

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
        if (!proxyApiKeyData?.user_id) {
            throw new InvalidKeyError('Proxy API key is missing owner');
        }
        const selected = await ApiKeyService.reserveNextApiKey(c, {
            userId: proxyApiKeyData.user_id,
            prioritizeLeastRecentlyUsed: true,
            prioritizeLeastErrors: true,
            prioritizeNewer: true,
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
            name: selected.name,
            created_at: selected.created_at,
            last_used_at: selected.last_used_at,
            last_error_at: selected.last_error_at,
            failure_count: selected.failure_count,
            consecutive_failures: selected.consecutive_failures,
            cooldown_until: selected.cooldown_until,
        } as unknown as ApiKeyWithStats;
    }

    private static getLoadBalanceStrategy(c: Context<HonoApp>): LoadBalanceStrategy {
        return ConfigService.getLoadBalanceStrategy(c);
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
        const { baseRequest, apiKeyValue, apiFormat, url, timeoutMs } = params;

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

        const hopByHopKeys: string[] = [];
        headers.forEach((_value, key) => {
            if (
                key.toLowerCase().startsWith('x-gproxy-') ||
                HEADERS_REMOVE_TO_ORIGIN.includes(key.toLowerCase())
            ) {
                hopByHopKeys.push(key);
            }
        });
        for (const key of hopByHopKeys) {
            headers.delete(key);
        }

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
        const timeoutSignal = createTimeoutSignal(timeoutMs);
        const signal = mergeAbortSignals([timeoutSignal, baseRequest.signal]);
        const requestInit: RequestInit = {
            method: attemptRequest.method,
            headers,
            body: attemptRequest.body,
            signal,
        };

        // Add duplex mode for Node.js environments if body exists
        if (attemptRequest.body && typeof process !== 'undefined') {
            (requestInit as RequestInit & { duplex?: 'half' }).duplex = 'half';
        }

        const start = Date.now();
        let response: Response;
        try {
            response = await fetch(new Request(url, requestInit));
        } catch (error) {
            if (signal.aborted && signal.reason !== undefined) {
                throw signal.reason;
            }
            throw error;
        } finally {
            cancelTimeoutSignal(timeoutSignal);
        }
        const durationMs = Date.now() - start;

        return { response, durationMs, headers };
    }
}
