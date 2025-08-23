import { Context } from 'hono';
import { getSupabaseClient } from './supabase.service';
import type { HonoApp, ProxyApiFormat } from '../types';
import { DataSanitizer } from '../utils/sanitizer';
import { UsageMetadataParser } from '../utils/usage-metadata-parser';

export interface BatchLogOperation {
    type: 'request_log' | 'api_key_usage' | 'proxy_api_key_usage';
    data: any;
    timestamp: number;
}

export interface RequestLogData {
    requestId: string;
    apiKeyId: string;
    proxyKeyId: string;
    userId: string | null;
    apiFormat: ProxyApiFormat;
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
    responseBody?: Response; // Response object for async parsing
    retryAttempts?: any;
}

export interface ApiKeyUsageData {
    apiKeyId: string;
    isSuccessful: boolean;
    errorDetails?: any;
}

export interface ProxyApiKeyUsageData {
    proxyApiKeyId: string;
    isSuccessful: boolean;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export class BatchLoggerService {
    private static batchOperations: Map<string, BatchLogOperation[]> = new Map();
    private static batchTimeout: Map<string, NodeJS.Timeout> = new Map();
    private static readonly BATCH_DELAY_MS = 100; // 100ms delay to batch operations
    private static readonly MAX_BATCH_SIZE = 50; // Maximum operations per batch

    static async addRequestLog(c: Context<HonoApp>, data: RequestLogData): Promise<void> {
        const requestId = data.requestId;

        // Sanitize data before batching
        const sanitizedData = {
            ...data,
            requestData: DataSanitizer.sanitizeRequestData(data.requestData),
            responseData: data.responseData
                ? DataSanitizer.sanitizeResponseData(data.responseData)
                : null,
            errorDetails: data.errorDetails
                ? DataSanitizer.sanitizeObject(data.errorDetails)
                : null,
            retryAttempts: data.retryAttempts
                ? DataSanitizer.sanitizeObject(data.retryAttempts)
                : null,
        };

        const operation: BatchLogOperation = {
            type: 'request_log',
            data: sanitizedData,
            timestamp: Date.now(),
        };

        await this.addToBatch(requestId, operation);
    }

    static async addApiKeyUsage(c: Context<HonoApp>, data: ApiKeyUsageData): Promise<void> {
        const requestId = c.get('proxyRequestId');

        // Sanitize error details
        const sanitizedData = {
            ...data,
            errorDetails: data.errorDetails
                ? DataSanitizer.sanitizeObject(data.errorDetails)
                : undefined,
        };

        const operation: BatchLogOperation = {
            type: 'api_key_usage',
            data: sanitizedData,
            timestamp: Date.now(),
        };

        await this.addToBatch(requestId, operation);
    }

    private static async addToBatch(
        requestId: string,
        operation: BatchLogOperation,
    ): Promise<void> {
        // Get or create batch for this request
        if (!this.batchOperations.has(requestId)) {
            this.batchOperations.set(requestId, []);
        }

        const batch = this.batchOperations.get(requestId)!;
        batch.push(operation);

        // Clear existing timeout
        if (this.batchTimeout.has(requestId)) {
            clearTimeout(this.batchTimeout.get(requestId)!);
        }

        // If batch is full, execute immediately
        if (batch.length >= this.MAX_BATCH_SIZE) {
            await this.executeBatch(requestId);
            return;
        }

        // Set timeout to execute batch after delay
        const timeout = setTimeout(async () => {
            await this.executeBatch(requestId);
        }, this.BATCH_DELAY_MS);

        this.batchTimeout.set(requestId, timeout);
    }

    private static async executeBatch(requestId: string): Promise<void> {
        const batch = this.batchOperations.get(requestId);
        if (!batch || batch.length === 0) {
            return;
        }

        // Clear the batch and timeout
        this.batchOperations.delete(requestId);
        if (this.batchTimeout.has(requestId)) {
            clearTimeout(this.batchTimeout.get(requestId)!);
            this.batchTimeout.delete(requestId);
        }

        // Group operations by type
        const requestLogs = batch
            .filter((op) => op.type === 'request_log')
            .map((op) => op.data as RequestLogData);
        const apiKeyUsages = batch
            .filter((op) => op.type === 'api_key_usage')
            .map((op) => op.data as ApiKeyUsageData);
        const proxyApiKeyUsages = batch
            .filter((op) => op.type === 'proxy_api_key_usage')
            .map((op) => op.data as ProxyApiKeyUsageData);

        // Execute all operations in parallel
        const promises: Promise<any>[] = [];

        // Batch insert request logs
        if (requestLogs.length > 0) {
            promises.push(this.batchInsertRequestLogs(requestLogs));
        }

        // Batch update API key usages
        if (apiKeyUsages.length > 0) {
            promises.push(this.batchUpdateApiKeyUsages(apiKeyUsages));
        }

        // Batch update Proxy API key usages
        if (proxyApiKeyUsages.length > 0) {
            promises.push(this.batchUpdateProxyApiKeyUsages(proxyApiKeyUsages));
        }

        // Execute all operations
        try {
            await Promise.all(promises);
        } catch (error) {
            console.error('Failed to execute batch operations:', error);
        }
    }

    private static async batchInsertRequestLogs(logs: RequestLogData[]): Promise<void> {
        const supabase = getSupabaseClient({} as any); // We need to pass context, but for now using empty object

        // Process logs with async parsing
        const processedLogs = await Promise.all(
            logs.map(async (log) => {
                let usageMetadata = log.usageMetadata;

                // Parse usage metadata from response body if available and not already parsed
                if (log.responseBody && !usageMetadata && log.isSuccessful) {
                    try {
                        const parsedMetadata = await UsageMetadataParser.parseFromResponse(
                            log.responseBody,
                            log.apiFormat,
                        );

                        if (parsedMetadata) {
                            usageMetadata = {
                                promptTokens: parsedMetadata.promptTokens,
                                completionTokens: parsedMetadata.completionTokens,
                                totalTokens: parsedMetadata.totalTokens,
                                model: parsedMetadata.model,
                                responseId: parsedMetadata.responseId,
                                rawMetadata: parsedMetadata.metadata,
                            };

                            // Add proxy API key usage from the parsed metadata
                            if (log.proxyKeyId) {
                                this.addProxyApiKeyUsage({
                                    proxyApiKeyId: log.proxyKeyId,
                                    isSuccessful: true,
                                    promptTokens: usageMetadata.promptTokens,
                                    completionTokens: usageMetadata.completionTokens,
                                    totalTokens: usageMetadata.totalTokens,
                                });
                            }
                        }
                    } catch (error) {
                        console.warn('Failed to parse usage metadata from response body:', error);
                    }
                }

                return {
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
                    performance_metrics: log.performanceMetrics || null,
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
                    retry_attempts: log.retryAttempts || null,
                };
            }),
        );

        const { error } = await supabase.from('request_logs').upsert(processedLogs, {
            onConflict: 'request_id',
            ignoreDuplicates: false,
        });

        if (error) {
            console.error('Failed to batch insert request logs:', error);
        }
    }

    private static async batchUpdateApiKeyUsages(usages: ApiKeyUsageData[]): Promise<void> {
        const supabase = getSupabaseClient({} as any);

        // Group by API key ID for efficient updates
        const apiKeyGroups = new Map<string, { successCount: number; failureCount: number }>();
        for (const usage of usages) {
            if (!apiKeyGroups.has(usage.apiKeyId)) {
                apiKeyGroups.set(usage.apiKeyId, { successCount: 0, failureCount: 0 });
            }
            const group = apiKeyGroups.get(usage.apiKeyId)!;
            if (usage.isSuccessful) {
                group.successCount++;
            } else {
                group.failureCount++;
            }
        }

        // Update each API key's usage
        const updatePromises = Array.from(apiKeyGroups.entries()).map(
            async ([apiKeyId, { successCount, failureCount }]) => {
                // Fetch the current counts
                const { data: currentKey, error: fetchError } = await supabase
                    .from('api_keys')
                    .select('success_count, failure_count')
                    .eq('id', apiKeyId)
                    .single();

                if (fetchError) {
                    console.error(
                        `Failed to fetch API key for usage update ${apiKeyId}:`,
                        fetchError,
                    );
                    return;
                }

                const updateData: any = {
                    success_count: currentKey.success_count + successCount,
                    failure_count: currentKey.failure_count + failureCount,
                    last_used_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                if (failureCount > 0) {
                    updateData.last_error_at = new Date().toISOString();
                }

                const { error } = await supabase
                    .from('api_keys')
                    .update(updateData)
                    .eq('id', apiKeyId);

                if (error) {
                    console.error(`Failed to update API key usage for ${apiKeyId}:`, error);
                }
            },
        );

        await Promise.all(updatePromises);
    }

    private static async addProxyApiKeyUsage(data: ProxyApiKeyUsageData): Promise<void> {
        const operation: BatchLogOperation = {
            type: 'proxy_api_key_usage',
            data,
            timestamp: Date.now(),
        };

        // This is a simplified addToBatch that doesn't require the request ID,
        // as it's called from within the batch execution
        const requestId = 'proxy_api_key_updates';
        if (!this.batchOperations.has(requestId)) {
            this.batchOperations.set(requestId, []);
        }
        this.batchOperations.get(requestId)!.push(operation);

        // Set a timeout to execute this special batch
        if (!this.batchTimeout.has(requestId)) {
            const timeout = setTimeout(async () => {
                await this.executeBatch(requestId);
            }, this.BATCH_DELAY_MS);
            this.batchTimeout.set(requestId, timeout);
        }
    }

    private static async batchUpdateProxyApiKeyUsages(
        usages: ProxyApiKeyUsageData[],
    ): Promise<void> {
        const supabase = getSupabaseClient({} as any);

        // Group by Proxy API key ID for efficient updates
        const proxyApiKeyGroups = new Map<
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
            if (!proxyApiKeyGroups.has(usage.proxyApiKeyId)) {
                proxyApiKeyGroups.set(usage.proxyApiKeyId, {
                    successCount: 0,
                    failureCount: 0,
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                });
            }
            const group = proxyApiKeyGroups.get(usage.proxyApiKeyId)!;
            if (usage.isSuccessful) {
                group.successCount++;
            } else {
                group.failureCount++;
            }
            group.promptTokens += usage.promptTokens;
            group.completionTokens += usage.completionTokens;
            group.totalTokens += usage.totalTokens;
        }

        // Update each Proxy API key's usage
        const updatePromises = Array.from(proxyApiKeyGroups.entries()).map(
            async ([
                proxyApiKeyId,
                { successCount, failureCount, promptTokens, completionTokens, totalTokens },
            ]) => {
                // Fetch the current counts
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

                const updateData: any = {
                    success_count: currentKey.success_count + successCount,
                    failure_count: currentKey.failure_count + failureCount,
                    prompt_tokens: currentKey.prompt_tokens + promptTokens,
                    completion_tokens: currentKey.completion_tokens + completionTokens,
                    total_tokens: currentKey.total_tokens + totalTokens,
                    last_used_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                if (failureCount > 0) {
                    updateData.last_error_at = new Date().toISOString();
                }

                const { error } = await supabase
                    .from('proxy_api_keys')
                    .update(updateData)
                    .eq('id', proxyApiKeyId);

                if (error) {
                    console.error(
                        `Failed to update Proxy API key usage for ${proxyApiKeyId}:`,
                        error,
                    );
                }
            },
        );

        await Promise.all(updatePromises);
    }

    // Force execute all pending batches (useful for cleanup)
    static async flushAllBatches(): Promise<void> {
        console.log('Flushing all batches...', this?.batchOperations?.size);
        const requestIds = Array.from(this.batchOperations.keys());
        const promises = requestIds.map((requestId) => this.executeBatch(requestId));
        await Promise.all(promises);
    }

    // Get batch statistics
    static getBatchStats(): { pendingBatches: number; totalOperations: number } {
        let totalOperations = 0;
        for (const batch of this.batchOperations.values()) {
            totalOperations += batch.length;
        }

        return {
            pendingBatches: this.batchOperations.size,
            totalOperations,
        };
    }
}
