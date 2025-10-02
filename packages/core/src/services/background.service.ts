import { Context } from 'hono';

import { getSupabaseClient } from './supabase.service';
import { DataSanitizer } from '../utils/sanitizer';
import { UsageMetadataParser } from '../utils/usage-metadata-parser';
import { ApiKeyService } from './api-key.service';
import type { HonoApp, ProxyRequestDataParsed } from '../types';
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
        totalTokens: number;
        model: string;
        responseId?: string;
        rawMetadata: any;
    } | null;
    responseBody?: Response;
    retryAttempts?: any;
    totalResponseTimeMs?: number;
}

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
        requestId: string;
        apiKeyId: string | null;
        proxyKeyId: string;
        userId: string | null;
        apiFormat: ProxyRequestDataParsed['apiFormat'];
        baseRequest: Request;
        response: Response;
        headers: Headers;
        durationMs: number;
        proxyRequestDataParsed: ProxyRequestDataParsed;
        retryAttempts: any[];
        totalResponseTimeMs: number;
    }): Promise<void> {
        const {
            requestId,
            apiKeyId,
            proxyKeyId,
            userId,
            apiFormat,
            baseRequest,
            response,
            headers,
            durationMs,
            proxyRequestDataParsed,
            retryAttempts,
            totalResponseTimeMs,
        } = params;

        // Initialize operations for this request
        this.initializeRequest(requestId);

        // Extract token usage from response (single source of truth)
        const tokenUsage = await this.extractTokenUsage(response, apiFormat);

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
                completionTokens: tokenUsage.completionTokens,
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
            completionTokens: tokenUsage.completionTokens,
            totalTokens: tokenUsage.totalTokens,
        });

        // Log request (with token usage and model)
        this.addRequestLog(requestId, {
            requestId,
            apiKeyId,
            proxyKeyId,
            userId,
            apiFormat,
            requestData: {
                method: baseRequest.method,
                url: baseRequest.url,
                headers: Object.fromEntries(headers.entries()),
            },
            responseData: {
                status: response.status,
                headers: Object.fromEntries(response.headers.entries()),
            },
            responseBody: response.clone(),
            isStream: proxyRequestDataParsed.stream,
            isSuccessful: true,
            performanceMetrics: {
                duration_ms: durationMs,
                total_response_time_ms: totalResponseTimeMs,
                attempt_count: retryAttempts.length + 1,
            },
            retryAttempts,
            totalResponseTimeMs,
            usageMetadata: {
                promptTokens: tokenUsage.promptTokens,
                completionTokens: tokenUsage.completionTokens,
                totalTokens: tokenUsage.totalTokens,
                model: tokenUsage.model || proxyRequestDataParsed.model || 'unknown',
                responseId: tokenUsage.responseId,
                rawMetadata: {
                    model: tokenUsage.model || proxyRequestDataParsed.model,
                    apiFormat: proxyRequestDataParsed.apiFormat,
                    responseId: tokenUsage.responseId,
                },
            },
        });

        // Add retry attempts (if any)
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
    static handleRequestError(params: {
        requestId: string;
        proxyKeyId: string;
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
    }): void {
        const {
            requestId,
            proxyKeyId,
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

        // Log failed request
        this.addRequestLog(requestId, {
            requestId,
            apiKeyId: null,
            proxyKeyId,
            userId,
            apiFormat,
            requestData: {
                method: baseRequest.method,
                url: baseRequest.url,
            },
            responseData: providerError
                ? {
                      status: providerError.status,
                      headers: providerError.headers,
                      error_body: providerError.body,
                  }
                : undefined,
            isStream,
            isSuccessful: false,
            performanceMetrics: {
                duration_ms: 0,
                total_response_time_ms: totalResponseTimeMs,
                attempt_count: retryAttempts.length,
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
                      totalTokens: 0,
                      model: model,
                      rawMetadata: { model: model },
                  }
                : null,
        });

        // Add retry attempts (if any)
        if (retryAttempts && retryAttempts.length > 0) {
            this.addRetryAttempts(requestId, retryAttempts);
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
            // Execute all operations in parallel
            const promises: Promise<void>[] = [];

            // 1. Insert request log
            if (operations.requestLog) {
                promises.push(this.insertRequestLog(c, operations.requestLog));
            }

            // 2. Update API key usages
            if (operations.apiKeyUsages.length > 0) {
                promises.push(this.updateApiKeyUsages(c, operations.apiKeyUsages));
            }

            // 3. Update proxy API key usages
            if (operations.proxyApiKeyUsages.length > 0) {
                promises.push(this.updateProxyApiKeyUsages(c, operations.proxyApiKeyUsages));
            }

            // 4. Touch API keys
            if (operations.apiKeyTouches.length > 0) {
                promises.push(this.touchApiKeys(c, operations.apiKeyTouches));
            }

            // 5. Touch proxy API keys
            if (operations.proxyApiKeyTouches.length > 0) {
                promises.push(this.touchProxyApiKeys(c, operations.proxyApiKeyTouches));
            }

            await Promise.allSettled(promises);
            console.log(
                `Executed ${promises.length} background operations for request ${requestId}`,
            );
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
                // Add API key usage for failed attempt
                this.addApiKeyUsage(requestId, {
                    apiKeyId: attempt.api_key_id,
                    isSuccessful: false,
                    promptTokens: 0, // Failed attempts don't consume tokens
                    completionTokens: 0,
                    totalTokens: 0,
                    errorDetails: {
                        message: attempt.error.message,
                        type: attempt.error.type,
                        status: attempt.error.status,
                        code: attempt.error.code,
                        provider_status: attempt.provider_error?.status,
                        provider_headers: attempt.provider_error?.headers,
                        provider_raw_body: attempt.provider_error?.raw_body,
                    },
                });

                // Schedule API key touch
                this.addApiKeyTouch(requestId, {
                    apiKeyId: attempt.api_key_id,
                    touchType: 'last_error',
                });
            }
        });

        // Note: We don't add proxy API key usage for retry attempts
        // because the proxy key is already tracked once per request (success/failure)
        // Adding it per retry would duplicate the usage count incorrectly
    }

    // ===== DATABASE OPERATIONS =====

    private static async insertRequestLog(c: Context<HonoApp>, log: RequestLogData): Promise<void> {
        const supabase = getSupabaseClient(c);

        // Use the provided usageMetadata (no need to re-extract from response)
        const usageMetadata = log.usageMetadata;

        const processedLog = {
            request_id: log.requestId,
            api_key_id: log.apiKeyId,
            proxy_key_id: log.proxyKeyId,
            user_id: log.userId,
            api_format: log.apiFormat,
            request_data: log.requestData,
            response_data: log.responseData || null,
            is_successful: log.isSuccessful,
            is_stream: Boolean(log.isStream),
            error_details: log.errorDetails || null,
            performance_metrics: log.performanceMetrics || {},
            usage_metadata: usageMetadata
                ? {
                      prompt_tokens: usageMetadata.promptTokens,
                      completion_tokens: usageMetadata.completionTokens,
                      total_tokens: usageMetadata.totalTokens,
                      model: usageMetadata.model,
                      response_id: usageMetadata.responseId,
                      raw_metadata: usageMetadata.rawMetadata,
                  }
                : null,
            retry_attempts: log.retryAttempts || [],
        };

        const { error } = await supabase.from('request_logs').upsert(processedLog, {
            onConflict: 'request_id',
            ignoreDuplicates: false,
        });

        if (error) {
            console.error('Failed to insert request log:', error);
        }
    }

    private static async updateApiKeyUsages(
        c: Context<HonoApp>,
        usages: ApiKeyUsageData[],
    ): Promise<void> {
        const supabase = getSupabaseClient(c);

        // Group by API key ID
        const groupedUsages = new Map<
            string,
            {
                successCount: number;
                failureCount: number;
                promptTokens: number;
                completionTokens: number;
                totalTokens: number;
            }
        >();

        for (const usage of usages) {
            const current = groupedUsages.get(usage.apiKeyId) || {
                successCount: 0,
                failureCount: 0,
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
            };
            if (usage.isSuccessful) {
                current.successCount++;
            } else {
                current.failureCount++;
            }
            current.promptTokens += usage.promptTokens;
            current.completionTokens += usage.completionTokens;
            current.totalTokens += usage.totalTokens;
            groupedUsages.set(usage.apiKeyId, current);
        }

        // Update each API key (now also updating token usage fields)
        const updatePromises = Array.from(groupedUsages.entries()).map(
            async ([apiKeyId, counts]) => {
                const { data: currentKey, error: fetchError } = await supabase
                    .from('api_keys')
                    .select(
                        'success_count, failure_count, prompt_tokens, completion_tokens, total_tokens',
                    )
                    .eq('id', apiKeyId)
                    .single();

                if (fetchError) {
                    console.error(
                        `Failed to fetch API key for usage update ${apiKeyId}:`,
                        fetchError,
                    );
                    return;
                }

                const updateData = {
                    success_count: currentKey.success_count + counts.successCount,
                    failure_count: currentKey.failure_count + counts.failureCount,
                    prompt_tokens: (currentKey.prompt_tokens || 0) + counts.promptTokens,
                    completion_tokens:
                        (currentKey.completion_tokens || 0) + counts.completionTokens,
                    total_tokens: (currentKey.total_tokens || 0) + counts.totalTokens,
                    last_used_at: counts.successCount > 0 ? new Date().toISOString() : undefined,
                    last_error_at: counts.failureCount > 0 ? new Date().toISOString() : undefined,
                    updated_at: new Date().toISOString(),
                };

                const { error } = await supabase
                    .from('api_keys')
                    .update(updateData)
                    .eq('id', apiKeyId);

                if (error) {
                    console.error(`Failed to update API key usage ${apiKeyId}:`, error);
                }
            },
        );

        await Promise.allSettled(updatePromises);
    }

    private static async updateProxyApiKeyUsages(
        c: Context<HonoApp>,
        usages: ProxyApiKeyUsageData[],
    ): Promise<void> {
        const supabase = getSupabaseClient(c);

        // Group by proxy API key ID
        const groupedUsages = new Map<
            string,
            {
                successCount: number;
                failureCount: number;
                promptTokens: number;
                completionTokens: number;
                totalTokens: number;
            }
        >();

        for (const usage of usages) {
            const current = groupedUsages.get(usage.proxyApiKeyId) || {
                successCount: 0,
                failureCount: 0,
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
            };

            if (usage.isSuccessful) {
                current.successCount++;
            } else {
                current.failureCount++;
            }

            current.promptTokens += usage.promptTokens;
            current.completionTokens += usage.completionTokens;
            current.totalTokens += usage.totalTokens;
            groupedUsages.set(usage.proxyApiKeyId, current);
        }

        // Update each proxy API key
        const updatePromises = Array.from(groupedUsages.entries()).map(
            async ([proxyApiKeyId, counts]) => {
                const { data: currentKey, error: fetchError } = await supabase
                    .from('proxy_api_keys')
                    .select(
                        'success_count, failure_count, prompt_tokens, completion_tokens, total_tokens',
                    )
                    .eq('id', proxyApiKeyId)
                    .single();

                if (fetchError) {
                    console.error(
                        `Failed to fetch Proxy API key for usage update ${proxyApiKeyId}:`,
                        fetchError,
                    );
                    return;
                }

                const updateData = {
                    success_count: currentKey.success_count + counts.successCount,
                    failure_count: currentKey.failure_count + counts.failureCount,
                    prompt_tokens: currentKey.prompt_tokens + counts.promptTokens,
                    completion_tokens: currentKey.completion_tokens + counts.completionTokens,
                    total_tokens: currentKey.total_tokens + counts.totalTokens,
                    last_used_at: counts.successCount > 0 ? new Date().toISOString() : undefined,
                    last_error_at: counts.failureCount > 0 ? new Date().toISOString() : undefined,
                    updated_at: new Date().toISOString(),
                };

                const { error } = await supabase
                    .from('proxy_api_keys')
                    .update(updateData)
                    .eq('id', proxyApiKeyId);

                if (error) {
                    console.error(`Failed to update Proxy API key usage ${proxyApiKeyId}:`, error);
                }
            },
        );

        await Promise.allSettled(updatePromises);
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

    // ===== TOKEN EXTRACTION =====

    /**
     * Extract token usage from response body
     */
    private static async extractTokenUsage(
        response: Response,
        apiFormat: 'gemini' | 'openai',
    ): Promise<{
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        responseId?: string;
        model?: string;
    }> {
        try {
            // Clone the response to avoid consuming the original
            const responseClone = response.clone();
            const responseText = await responseClone.text();

            // Use the existing UsageMetadataParser to extract tokens
            const parsed = UsageMetadataParser.parseFromResponseBody(responseText, apiFormat);

            if (parsed) {
                return {
                    promptTokens: parsed.promptTokens || 0,
                    completionTokens: parsed.completionTokens || 0,
                    totalTokens: parsed.totalTokens || 0,
                    responseId: parsed.responseId,
                    model: parsed.model,
                };
            }
        } catch (error) {
            console.warn('Failed to extract token usage from response:', error);
        }

        // Return zeros if extraction fails
        return {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            responseId: undefined,
            model: undefined,
        };
    }
}
