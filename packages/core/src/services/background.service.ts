import { Context } from 'hono';

import { getSupabaseClient } from './supabase.service';
import { DataSanitizer } from '../utils/sanitizer';
import {
    estimateCostFromParsedUsage,
    visibleCompletionTokensForKeys,
} from '../utils/cost-estimator';
import type { CustomModelPricingMap } from '../constants/gemini-pricing';
import type { ParsedUsageMetadata } from '../utils/usage-metadata-parser';
import { persistWithRetry } from '../utils/wait-until';
import { ApiKeyService } from './api-key.service';
import { ConfigService } from './config.service';
import type { HonoApp, ProxyRequestDataParsed } from '../types';
import type { Json } from '@gemini-proxy/database';
import type { ProxyError } from '../types/error.type';

// ===== UNIFIED INTERFACES =====

export interface RequestLogData {
    requestId: string;
    apiKeyId: string | null;
    proxyKeyId: string;
    userId: string | null;
    apiFormat: 'gemini' | 'openai';
    requestData: any;
    responseData?: any;
    isSuccessful: boolean;
    isStream: boolean;
    errorDetails?: any;
    performanceMetrics?: any;
    usageMetadata?: {
        promptTokens: number;
        completionTokens: number;
        thoughtsTokens: number;
        toolUsePromptTokens: number;
        totalTokens: number;
        cacheTokens: number;
        model: string;
        responseId?: string;
        estimatedCostUsd: number | null;
        pricingVersion: string | null;
        matchedModel: string | null;
        rawMetadata: Json;
    } | null;
    retryAttempts?: any;
    totalResponseTimeMs?: number;
}

type UserRequestSettings = {
    detailed_observability: boolean;
    save_request_body: boolean;
    save_response_body: boolean;
    custom_model_pricing: CustomModelPricingMap;
};

export interface ApiKeyUsageData {
    apiKeyId: string;
    isSuccessful: boolean;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    errorDetails?: any;
}

export interface ProxyApiKeyUsageData {
    proxyApiKeyId: string;
    isSuccessful: boolean;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface ApiKeyTouchData {
    apiKeyId: string;
    touchType: 'last_used' | 'last_error';
}

export interface ProxyApiKeyTouchData {
    proxyApiKeyId: string;
    touchType: 'last_used' | 'last_error';
}

// ===== UNIFIED BACKGROUND SERVICE =====

/**
 * Unified service that handles all background operations efficiently
 * Combines the best of BatchLoggerService and BackgroundCollectorService
 */
/**
 * BackgroundService
 *
 * Unified background post-processing for:
 *   - Per-request logging (with token usage)
 *   - API key and proxy API key total usage aggregation
 *   - Touching last_used/last_error for both API key types
 *
 * All flows (success, error, retries) must use ONLY handleRequestSuccess or handleRequestError.
 * No token usage or touch logic should be duplicated elsewhere.
 *
 * This ensures:
 *   - Fast response to user (all post-processing is async)
 *   - No code duplication or redundancy
 *   - Clean, maintainable architecture
 */
export class BackgroundService {
    private static operations: Map<
        string,
        {
            requestLog?: RequestLogData;
            apiKeyUsages: ApiKeyUsageData[];
            proxyApiKeyUsages: ProxyApiKeyUsageData[];
            apiKeyTouches: ApiKeyTouchData[];
            proxyApiKeyTouches: ProxyApiKeyTouchData[];
        }
    > = new Map();

    // ===== MAIN ENTRY POINTS =====

    /**
     * Handle successful request - collect all operations
     */
    /**
     * Main entry point for successful requests.
     * Extracts token usage, logs request, aggregates usage, and touches last_used.
     *
     * @param params - All required context for logging and aggregation
     */
    static async handleRequestSuccess(params: {
        c: Context<HonoApp>;
        requestId: string;
        apiKeyId: string | null;
        proxyKeyId: string;
        userId: string | null;
        apiFormat: ProxyRequestDataParsed['apiFormat'];
        baseRequest: Request;
        requestHeaders: Headers;
        responseStatus: number;
        responseHeaders: Headers;
        durationMs: number;
        proxyRequestDataParsed: ProxyRequestDataParsed;
        retryAttempts: any[];
        totalResponseTimeMs: number;
        usage: ParsedUsageMetadata | null;
        responseText: string | null;
    }): Promise<void> {
        const {
            c,
            requestId,
            apiKeyId,
            proxyKeyId,
            userId,
            apiFormat,
            baseRequest,
            requestHeaders,
            responseStatus,
            responseHeaders,
            durationMs,
            proxyRequestDataParsed,
            retryAttempts,
            totalResponseTimeMs,
            usage,
            responseText,
        } = params;

        this.initializeRequest(requestId);

        const tokenUsage: ParsedUsageMetadata = usage ?? {
            promptTokens: 0,
            completionTokens: 0,
            thoughtsTokens: 0,
            toolUsePromptTokens: 0,
            cacheTokens: 0,
            totalTokens: 0,
            model: '',
            parseError: true,
            raw: { parse_error: true },
        };
        const fallbackModel = proxyRequestDataParsed.model || 'unknown';
        const settings = await this.loadUserSettings(c, userId);
        const policyReservation = c.get('proxyPolicyReservation');
        const cost = estimateCostFromParsedUsage(
            { ...tokenUsage, model: tokenUsage.model || fallbackModel },
            fallbackModel,
            settings.custom_model_pricing,
        );
        const keyCompletionTokens = visibleCompletionTokensForKeys(tokenUsage);
        const requestText =
            settings.detailed_observability && settings.save_request_body
                ? await this.readRequestText(baseRequest)
                : null;

        // Always touch proxy API key last_used for successful requests
        this.addProxyApiKeyTouch(requestId, {
            proxyApiKeyId: proxyKeyId,
            touchType: 'last_used',
        });

        // If API key was used, aggregate its usage and touch last_used
        if (apiKeyId) {
            this.addApiKeyUsage(requestId, {
                apiKeyId,
                isSuccessful: true,
                promptTokens: tokenUsage.promptTokens,
                completionTokens: keyCompletionTokens,
                totalTokens: tokenUsage.totalTokens,
            });
            this.addApiKeyTouch(requestId, {
                apiKeyId,
                touchType: 'last_used',
            });
        }

        // Always aggregate proxy API key usage
        this.addProxyApiKeyUsage(requestId, {
            proxyApiKeyId: proxyKeyId,
            isSuccessful: true,
            promptTokens: tokenUsage.promptTokens,
            completionTokens: keyCompletionTokens,
            totalTokens: tokenUsage.totalTokens,
        });

        const requestData: Record<string, unknown> = {
            method: baseRequest.method,
            url: baseRequest.url,
            headers: Object.fromEntries(requestHeaders.entries()),
        };
        const responseData: Record<string, unknown> = {
            status: responseStatus,
            headers: Object.fromEntries(responseHeaders.entries()),
        };
        this.attachDetailedBodies({
            settings,
            requestData,
            responseData,
            requestText,
            responseText,
            extraFieldNames: ConfigService.getRedactJsonFields(c),
        });

        // Log request (with token usage and model)
        this.addRequestLog(requestId, {
            requestId,
            apiKeyId,
            proxyKeyId,
            userId,
            apiFormat,
            requestData,
            responseData,
            isStream: proxyRequestDataParsed.stream,
            isSuccessful: true,
            performanceMetrics: {
                duration_ms: durationMs,
                total_response_time_ms: totalResponseTimeMs,
                attempt_count: retryAttempts.length + 1,
                ...(policyReservation
                    ? {
                          policy_reserved_tokens: policyReservation.reserved_tokens,
                          policy_reserved_usd: policyReservation.reserved_usd,
                          policy_minute_start: policyReservation.window_starts.minute,
                          policy_day_start: policyReservation.window_starts.day,
                          policy_month_start: policyReservation.window_starts.month,
                      }
                    : {}),
            },
            retryAttempts,
            totalResponseTimeMs,
            usageMetadata: {
                promptTokens: tokenUsage.promptTokens,
                completionTokens: keyCompletionTokens,
                thoughtsTokens: tokenUsage.thoughtsTokens,
                toolUsePromptTokens: tokenUsage.toolUsePromptTokens,
                totalTokens: tokenUsage.totalTokens,
                cacheTokens: tokenUsage.cacheTokens,
                model: tokenUsage.model || fallbackModel,
                responseId: tokenUsage.responseId,
                estimatedCostUsd: cost?.usd ?? null,
                pricingVersion: cost?.pricingVersion ?? null,
                matchedModel: cost?.matchedModel ?? null,
                rawMetadata: (tokenUsage.raw as Json) ?? { parse_error: true },
            },
        });

        if (retryAttempts && retryAttempts.length > 0) {
            this.addRetryAttempts(requestId, retryAttempts);
        }
    }

    /**
     * Handle failed request - collect all operations
     */
    /**
     * Main entry point for failed requests.
     * Logs request, aggregates failed usage, and touches last_error.
     *
     * @param params - All required context for logging and aggregation
     */
    static async handleRequestError(params: {
        c: Context<HonoApp>;
        requestId: string;
        proxyKeyId: string;
        apiKeyId?: string | null;
        userId: string | null;
        apiFormat: ProxyRequestDataParsed['apiFormat'];
        baseRequest: Request;
        error: ProxyError;
        providerError?: {
            status: number;
            headers: Record<string, string>;
            body: string;
        };
        retryAttempts: any[];
        isStream: boolean;
        totalResponseTimeMs: number;
        model?: string;
    }): Promise<void> {
        const {
            c,
            requestId,
            proxyKeyId,
            apiKeyId,
            userId,
            apiFormat,
            baseRequest,
            error,
            providerError,
            retryAttempts,
            isStream,
            totalResponseTimeMs,
            model,
        } = params;

        // Initialize operations for this request
        this.initializeRequest(requestId);

        const settings = await this.loadUserSettings(c, userId);
        const policyReservation = c.get('proxyPolicyReservation');
        const requestText =
            settings.detailed_observability && settings.save_request_body
                ? await this.readRequestText(baseRequest)
                : null;

        // Always touch proxy API key last_error for failed requests
        this.addProxyApiKeyTouch(requestId, {
            proxyApiKeyId: proxyKeyId,
            touchType: 'last_error',
        });

        // Always aggregate failed proxy API key usage
        this.addProxyApiKeyUsage(requestId, {
            proxyApiKeyId: proxyKeyId,
            isSuccessful: false,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
        });

        const requestData: Record<string, unknown> = {
            method: baseRequest.method,
            url: baseRequest.url,
        };
        const responseData: Record<string, unknown> | undefined = providerError
            ? {
                  status: providerError.status,
                  headers: providerError.headers,
                  error_body: providerError.body,
              }
            : undefined;
        this.attachDetailedBodies({
            settings,
            requestData,
            responseData,
            requestText,
            responseText: null,
            extraFieldNames: ConfigService.getRedactJsonFields(c),
        });

        // Log failed request
        this.addRequestLog(requestId, {
            requestId,
            apiKeyId: apiKeyId ?? null,
            proxyKeyId,
            userId,
            apiFormat,
            requestData,
            responseData,
            isStream,
            isSuccessful: false,
            performanceMetrics: {
                duration_ms: 0,
                total_response_time_ms: totalResponseTimeMs,
                attempt_count: retryAttempts.length,
                ...(policyReservation
                    ? {
                          policy_reserved_tokens: policyReservation.reserved_tokens,
                          policy_reserved_usd: policyReservation.reserved_usd,
                          policy_minute_start: policyReservation.window_starts.minute,
                          policy_day_start: policyReservation.window_starts.day,
                          policy_month_start: policyReservation.window_starts.month,
                      }
                    : {}),
            },
            errorDetails: {
                message: error.message,
                type: error.type,
                status: error.status,
                code: error.code,
                provider_status: providerError?.status,
                provider_headers: providerError?.headers,
                provider_raw_body: providerError?.body,
            },
            retryAttempts,
            totalResponseTimeMs,
            usageMetadata: model
                ? {
                      promptTokens: 0,
                      completionTokens: 0,
                      thoughtsTokens: 0,
                      toolUsePromptTokens: 0,
                      totalTokens: 0,
                      cacheTokens: 0,
                      model: model,
                      estimatedCostUsd: null,
                      pricingVersion: null,
                      matchedModel: null,
                      rawMetadata: { model: model },
                  }
                : null,
        });

        if (retryAttempts && retryAttempts.length > 0) {
            this.addRetryAttempts(requestId, retryAttempts);
        }
    }

    static async finalizeAfterHandlerError(c: Context<HonoApp>): Promise<void> {
        if (!c.get('proxyPolicyReservation') && !c.get('proxyRequestId')) {
            return;
        }
        const requestId = c.get('proxyRequestId');
        try {
            await persistWithRetry(() => this.finalizeProxyRequest(c, requestId, undefined));
        } catch (error) {
            await this.recordReconciliationNeeded(c, requestId, error);
        }
    }

    /**
     * Execute all collected operations for a request
     */
    static async executeAllOperations(c: Context<HonoApp>, requestId: string): Promise<void> {
        const operations = this.operations.get(requestId);
        if (!operations) {
            return;
        }

        // Clear operations for this request
        this.operations.delete(requestId);

        try {
            const promises: Promise<void>[] = [];
            if (operations.requestLog || c.get('proxyPolicyReservation')) {
                promises.push(
                    persistWithRetry(() =>
                        this.finalizeProxyRequest(c, requestId, operations.requestLog),
                    ).catch((error) => this.recordReconciliationNeeded(c, requestId, error)),
                );
            }
            if (operations.apiKeyTouches.length > 0) {
                promises.push(this.touchApiKeys(c, operations.apiKeyTouches));
            }
            if (operations.proxyApiKeyTouches.length > 0) {
                promises.push(this.touchProxyApiKeys(c, operations.proxyApiKeyTouches));
            }
            await Promise.allSettled(promises);
            console.log(`Executed background operations for request ${requestId}`);
        } catch (error) {
            console.error(
                `Failed to execute background operations for request ${requestId}:`,
                error,
            );
        }
    }

    // ===== INTERNAL METHODS =====

    private static initializeRequest(requestId: string): void {
        if (!this.operations.has(requestId)) {
            this.operations.set(requestId, {
                apiKeyUsages: [],
                proxyApiKeyUsages: [],
                apiKeyTouches: [],
                proxyApiKeyTouches: [],
            });
        }
    }

    private static addRequestLog(requestId: string, data: RequestLogData): void {
        const operations = this.operations.get(requestId);
        if (operations) {
            // Sanitize data
            operations.requestLog = {
                ...data,
                requestData: DataSanitizer.sanitizeRequestData(data.requestData),
                responseData: data.responseData
                    ? DataSanitizer.sanitizeResponseData(data.responseData)
                    : undefined,
                errorDetails: data.errorDetails
                    ? DataSanitizer.sanitizeObject(data.errorDetails)
                    : undefined,
                retryAttempts: data.retryAttempts
                    ? DataSanitizer.sanitizeObject(data.retryAttempts)
                    : undefined,
            };
        }
    }

    private static addApiKeyUsage(requestId: string, data: ApiKeyUsageData): void {
        const operations = this.operations.get(requestId);
        if (operations) {
            operations.apiKeyUsages.push({
                ...data,
                errorDetails: data.errorDetails
                    ? DataSanitizer.sanitizeObject(data.errorDetails)
                    : undefined,
            });
        }
    }

    private static addApiKeyTouch(requestId: string, data: ApiKeyTouchData): void {
        const operations = this.operations.get(requestId);
        if (operations) {
            operations.apiKeyTouches.push(data);
        }
    }

    private static addProxyApiKeyUsage(requestId: string, data: ProxyApiKeyUsageData): void {
        const operations = this.operations.get(requestId);
        if (operations) {
            operations.proxyApiKeyUsages.push(data);
        }
    }

    private static addProxyApiKeyTouch(requestId: string, data: ProxyApiKeyTouchData): void {
        const operations = this.operations.get(requestId);
        if (operations) {
            operations.proxyApiKeyTouches.push(data);
        }
    }

    private static addRetryAttempts(requestId: string, retryAttempts: any[]): void {
        retryAttempts.forEach((attempt) => {
            if (attempt.api_key_id) {
                this.addApiKeyTouch(requestId, {
                    apiKeyId: attempt.api_key_id,
                    touchType: 'last_error',
                });
            }
        });
    }

    // ===== DATABASE OPERATIONS =====

    private static async finalizeProxyRequest(
        c: Context<HonoApp>,
        requestId: string,
        requestLog: RequestLogData | undefined,
    ): Promise<void> {
        const reservation = c.get('proxyPolicyReservation');
        const proxyKey = c.get('proxyApiKeyData');
        if (!requestLog && !reservation) {
            return;
        }
        const isSuccessful = requestLog?.isSuccessful === true;
        const usage = requestLog?.usageMetadata;
        const usageJson = {
            api_format: requestLog?.apiFormat ?? 'gemini',
            is_stream: Boolean(requestLog?.isStream),
            error_details: requestLog?.errorDetails ?? null,
            performance_metrics: requestLog?.performanceMetrics ?? {},
            retry_attempts: requestLog?.retryAttempts ?? [],
            prompt_tokens: usage?.promptTokens ?? 0,
            completion_tokens: usage?.completionTokens ?? 0,
            thoughts_tokens: usage?.thoughtsTokens ?? 0,
            tool_use_prompt_tokens: usage?.toolUsePromptTokens ?? 0,
            total_tokens: usage?.totalTokens ?? 0,
            cache_tokens: usage?.cacheTokens ?? 0,
            model: usage?.model ?? null,
            response_id: usage?.responseId ?? null,
            estimated_cost_usd: usage?.estimatedCostUsd ?? null,
            pricing_version: usage?.pricingVersion ?? null,
            matched_model: usage?.matchedModel ?? null,
            raw_metadata: usage?.rawMetadata ?? null,
        };
        const supabase = getSupabaseClient(c);
        const { error } = await supabase.rpc('finalize_proxy_request', {
            p_request_id: requestId,
            p_proxy_key_id: requestLog?.proxyKeyId ?? proxyKey.id,
            p_api_key_id: requestLog?.apiKeyId ?? null,
            p_user_id: requestLog?.userId ?? proxyKey.user_id,
            p_is_successful: isSuccessful,
            p_request_data: (requestLog?.requestData ?? {}) as Json,
            p_response_data: (requestLog?.responseData ?? null) as Json | null,
            p_usage: usageJson as Json,
            p_reserved_tokens: reservation?.reserved_tokens ?? 0,
            p_reserved_usd: reservation?.reserved_usd ?? 0,
            p_actual_tokens: isSuccessful ? (usage?.totalTokens ?? 0) : 0,
            p_actual_usd: isSuccessful ? (usage?.estimatedCostUsd ?? 0) : 0,
            p_minute_start: reservation?.window_starts.minute ?? null,
            p_day_start: reservation?.window_starts.day ?? null,
            p_month_start: reservation?.window_starts.month ?? null,
        });
        if (error) {
            throw error;
        }
    }

    private static async recordReconciliationNeeded(
        c: Context<HonoApp>,
        requestId: string,
        error: unknown,
    ): Promise<void> {
        const proxyKey = c.get('proxyApiKeyData');
        const lastError = error instanceof Error ? error.message : String(error);
        console.error(`Failed to finalize proxy request ${requestId}:`, error);
        const { error: insertError } = await getSupabaseClient(c)
            .from('proxy_reconciliation_needed')
            .upsert(
                {
                    request_id: requestId,
                    proxy_key_id: proxyKey.id,
                    user_id: proxyKey.user_id,
                    last_error: lastError,
                    resolved_at: null,
                },
                { onConflict: 'request_id' },
            );
        if (insertError) {
            console.error(
                `Failed to record reconciliation row for request ${requestId}:`,
                insertError,
            );
        }
    }

    private static async touchApiKeys(
        c: Context<HonoApp>,
        touches: ApiKeyTouchData[],
    ): Promise<void> {
        const touchPromises = touches.map(async (touch) => {
            try {
                if (touch.touchType === 'last_used') {
                    await ApiKeyService.touchApiKeyLastUsed(c, touch.apiKeyId);
                } else if (touch.touchType === 'last_error') {
                    await ApiKeyService.touchApiKeyLastError(c, touch.apiKeyId);
                }
            } catch (error) {
                console.error(`Failed to touch API key ${touch.apiKeyId}:`, error);
            }
        });

        await Promise.allSettled(touchPromises);
    }

    private static async touchProxyApiKeys(
        c: Context<HonoApp>,
        touches: ProxyApiKeyTouchData[],
    ): Promise<void> {
        const touchPromises = touches.map(async (touch) => {
            try {
                if (touch.touchType === 'last_used') {
                    await ApiKeyService.touchProxyApiKeyLastUsed(c, touch.proxyApiKeyId);
                } else if (touch.touchType === 'last_error') {
                    await ApiKeyService.touchProxyApiKeyLastError(c, touch.proxyApiKeyId);
                }
            } catch (error) {
                console.error(`Failed to touch proxy API key ${touch.proxyApiKeyId}:`, error);
            }
        });

        await Promise.allSettled(touchPromises);
    }

    // ===== UTILITY METHODS =====

    static getPendingCount(requestId: string): number {
        const operations = this.operations.get(requestId);
        if (!operations) return 0;

        let count = 0;
        if (operations.requestLog) count++;
        count += operations.apiKeyUsages.length;
        count += operations.proxyApiKeyUsages.length;
        count += operations.apiKeyTouches.length;
        return count;
    }

    static clear(requestId: string): void {
        this.operations.delete(requestId);
    }

    static clearAll(): void {
        this.operations.clear();
    }

    // ===== TOKEN EXTRACTION + OBSERVABILITY =====

    private static readonly DEFAULT_USER_SETTINGS: UserRequestSettings = {
        detailed_observability: false,
        save_request_body: false,
        save_response_body: false,
        custom_model_pricing: {},
    };

    private static parseCustomModelPricing(value: unknown): CustomModelPricingMap {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return {};
        }
        const parsed: Record<string, CustomModelPricingMap[string]> = {};
        for (const [modelId, rates] of Object.entries(value as Record<string, unknown>)) {
            if (!rates || typeof rates !== 'object' || Array.isArray(rates)) {
                continue;
            }
            const row = rates as Record<string, unknown>;
            const input =
                typeof row.inputPerMillion === 'number' ? row.inputPerMillion : Number.NaN;
            const output =
                typeof row.outputPerMillion === 'number' ? row.outputPerMillion : Number.NaN;
            if (!Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) {
                continue;
            }
            const cacheRaw = row.cachedInputPerMillion;
            const cache =
                typeof cacheRaw === 'number'
                    ? cacheRaw
                    : cacheRaw != null && cacheRaw !== ''
                      ? Number(cacheRaw)
                      : Number.NaN;
            parsed[modelId.trim().toLowerCase()] = {
                inputPerMillion: input,
                outputPerMillion: output,
                ...(Number.isFinite(cache) && cache >= 0 ? { cachedInputPerMillion: cache } : {}),
            };
        }
        return parsed;
    }

    private static async loadUserSettings(
        c: Context<HonoApp>,
        userId: string | null,
    ): Promise<UserRequestSettings> {
        if (!userId) {
            return { ...this.DEFAULT_USER_SETTINGS };
        }
        try {
            const supabase = getSupabaseClient(c);
            const { data, error } = await supabase
                .from('user_settings')
                .select(
                    'detailed_observability, save_request_body, save_response_body, custom_model_pricing',
                )
                .eq('id', userId)
                .maybeSingle();
            if (error || !data) {
                return { ...this.DEFAULT_USER_SETTINGS };
            }
            return {
                detailed_observability: Boolean(data.detailed_observability),
                save_request_body: Boolean(data.save_request_body),
                save_response_body: Boolean(data.save_response_body),
                custom_model_pricing: this.parseCustomModelPricing(data.custom_model_pricing),
            };
        } catch {
            return { ...this.DEFAULT_USER_SETTINGS };
        }
    }

    private static attachDetailedBodies(params: {
        settings: UserRequestSettings;
        requestData: Record<string, unknown>;
        responseData?: Record<string, unknown>;
        requestText: string | null;
        responseText: string | null;
        extraFieldNames?: string[];
    }): void {
        const { settings, requestData, responseData, requestText, responseText, extraFieldNames } =
            params;
        if (!settings.detailed_observability) {
            return;
        }
        if (settings.save_request_body && requestText) {
            Object.assign(
                requestData,
                DataSanitizer.sanitizePayloadBody(
                    requestText,
                    DataSanitizer.PAYLOAD_BODY_MAX_CHARS,
                    { extraFieldNames },
                ),
            );
        }
        if (settings.save_response_body && responseText && responseData) {
            Object.assign(
                responseData,
                DataSanitizer.sanitizePayloadBody(
                    responseText,
                    DataSanitizer.PAYLOAD_BODY_MAX_CHARS,
                    { extraFieldNames },
                ),
            );
        }
    }

    private static async readRequestText(request: Request): Promise<string | null> {
        try {
            const clone = request.clone();
            const text = await clone.text();
            return text || null;
        } catch {
            return null;
        }
    }
}
