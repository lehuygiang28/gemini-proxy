# Gemini Proxy Monorepo

With hono framework, and monorepo pnpm.

I want to create a core logic in packages/core for all main logic of proxy services, then using it in apps/api. The idea is main apps/api we using node hono server but in others like packages/cf-worker we will using Cloudflare Workers or netlify so the idea is keep business logic in package/core and can be export and import to use in different hono app for each different platform with some others config platforms each others.

With supabase for auth and postgres database, with Hono we should to using service role for database access, but still keep using @supabase/supabase-js for access database by the rest api to make best compatible with @supabase/supabase-js and with any platform.

The ours mainly features is proxy request to Google Gemini API and Google still have support for OpenAI compatible API, so we will still can call Gemini with OpenAI API format.

We will proxy any request to Google Gemini API, with the server in the middle, we will catch and parse it to get some usage metadata to write log to database, then response to the client. The log must very good, hide all sensitive data, and keep data can be traceable and debug-able, save the error if have, and retries if Google API Keys is rate limit, or google server is error.

See below code form others project but it same idea, we will use it and port it to our project, when they using mongodb but we using postgres with supabase.

```ts
import { ApiKeyManager } from './key-manager';
import { LoggingService } from './logging';
import { ProxyApiKeyRepository, DatabaseConnection } from './database';
import { usageParser, streamParser, requestParser, streamUsageExtractor } from './parsers';
import {
    CoreConfig,
    ProxyRequest,
    ProxyResponse,
    ProxyError,
    KeySelectionError,
    RetryExhaustedError,
    StreamChunk,
    KeySelectionCriteria,
    RetryAttempt,
    UsageMetadata,
} from './types';

// Parameter interfaces for single parameter objects

interface CreateErrorResponseParams {
    error: ProxyError;
    requestId?: string;
}

interface MakeRequestWithRetriesParams {
    proxyRequest: ProxyRequest;
    apiFormat: 'gemini' | 'openai-compatible';
    initialApiKeyId: string;
    initialApiKey: string;
    requestId: string;
}

interface MakeApiRequestParams {
    proxyRequest: ProxyRequest;
    apiFormat: 'gemini' | 'openai-compatible';
    apiKey: string;
}

interface BuildTargetUrlParams {
    path: string;
    apiFormat: 'gemini' | 'openai-compatible';
}

interface BuildHeadersParams {
    originalHeaders: Record<string, string>;
    apiFormat: 'gemini' | 'openai-compatible';
    apiKey: string;
}

interface FilterResponseHeadersParams {
    headers: Headers;
}

interface HeadersToRecordParams {
    headers: Headers;
}

interface DetermineApiFormatParams {
    path: string;
}

interface ValidateProxyKeyParams {
    proxyKeyId: string;
}

interface CategorizeHttpErrorParams {
    status: number;
}

interface ShouldRetryParams {
    error: ProxyError;
}

interface IsStreamingResponseParams {
    response: Response;
}

interface CollectStreamChunksParams {
    response: ProxyResponse;
}

/**
 * Helper class for web standard utilities
 */
export class WebStandardUtils {
    /**
     * Create an error response that's compatible with web standards
     */
    static createErrorResponse(params: CreateErrorResponseParams): Response {
        const { error, requestId } = params;

        const errorBody = {
            error: {
                message: error.message,
                type: error.type,
                code: error.code,
            },
            proxy: {
                service: 'gemini-proxy',
                requestId,
                timestamp: new Date().toISOString(),
            },
        };

        return new Response(JSON.stringify(errorBody), {
            status: error.status || 500,
            headers: {
                'content-type': 'application/json',
                'x-proxy-error': 'true',
            },
        });
    }
}

export class ProxyService {
    private keyManager: ApiKeyManager;
    private loggingService: LoggingService;
    private proxyKeyRepo: ProxyApiKeyRepository;
    private config: CoreConfig;
    private dbConnection: DatabaseConnection;

    constructor(config: CoreConfig) {
        this.config = config;
        this.keyManager = new ApiKeyManager();
        this.loggingService = new LoggingService();
        this.proxyKeyRepo = new ProxyApiKeyRepository();
        this.dbConnection = DatabaseConnection.getInstance();
    }

    /**
     * Initialize the service (connect to database)
     */
    async initialize(): Promise<void> {
        await this.dbConnection.connect(this.config.database.mongoUrl);
    }

    /**
     * Main proxy handler - processes requests with retry logic
     */
    async handleRequest(proxyRequest: ProxyRequest): Promise<ProxyResponse> {
        const startTime = Date.now();
        let requestId: string | null = null;
        let selectedApiKey: string | null = null;
        let selectedApiKeyId: string | null = null;

        try {
            // Validate proxy key
            await this.validateProxyKey({ proxyKeyId: proxyRequest.proxyKeyId });

            // Determine API format from path (both use Gemini API keys)
            const apiFormat = this.determineApiFormat({ path: proxyRequest.url });

            // Get initial API key (always use Gemini provider since both formats use Gemini keys)
            const keySelection = await this.keyManager.selectBestKey({ provider: 'gemini' });
            selectedApiKey = keySelection.apiKey;
            selectedApiKeyId = keySelection.key._id!.toString();

            // Start request logging
            requestId = await this.loggingService.startRequestLog({
                proxyKeyId: proxyRequest.proxyKeyId,
                apiKeyId: selectedApiKeyId,
                apiFormat,
                request: proxyRequest,
            });

            // Build target URL and make request with retry logic
            const result = await this.makeRequestWithRetries({
                proxyRequest,
                apiFormat,
                initialApiKeyId: selectedApiKeyId,
                initialApiKey: selectedApiKey,
                requestId,
            });

            // Detect if the response is streaming by checking headers and body type
            const isResponseStreaming = this.isStreamingResponse({ response: result.response });

            let usage: UsageMetadata | null = null;

            if (!isResponseStreaming) {
                try {
                    // For non-streaming responses, use the stored response text from makeApiRequest
                    // This avoids reading the response body again which could cause consumption issues
                    const responseText = (result.response as any).responseText;

                    if (responseText) {
                        const parsed = JSON.parse(responseText);
                        usage = usageParser.parseUnifiedUsage({ responseBody: parsed });
                    }
                } catch (error) {
                    // Silently handle usage parsing errors
                    usage = null;
                }
            }

            if (isResponseStreaming) {
                const cloneResponse = result.response.clone();
                const streamChunks = await this.collectStreamChunks({ response: cloneResponse });

                // Extract usage from stream chunks
                const streamUsage = streamUsageExtractor.extractUsageFromStreamChunks(streamChunks);

                await this.loggingService.logResponse({
                    requestId,
                    response: cloneResponse,
                    apiCallDurationMs: result.apiCallDurationMs,
                    streamChunks,
                    usage: streamUsage || undefined,
                });

                // Update usage for streaming if we extracted it
                if (streamUsage) {
                    usage = streamUsage;
                }

                // Clear stream chunks to free memory
                streamChunks.length = 0;
            } else {
                await this.loggingService.logResponse({
                    requestId,
                    response: result.response,
                    apiCallDurationMs: result.apiCallDurationMs,
                    usage: usage || undefined,
                });
            }

            // Update API key usage
            if (usage) {
                await this.keyManager.recordKeyUsage({
                    keyId: result.finalApiKeyId,
                    tokenUsage: usage.totalTokens,
                });
            }

            // Finalize logging
            const totalDurationMs = Date.now() - startTime;
            await this.loggingService.finalizeRequestLog({
                requestId,
                success: true,
                totalDurationMs,
                usage: usage || undefined,
                retryDurationMs: result.retryDurationMs,
            });

            return result.response;
        } catch (error) {
            const totalDurationMs = Date.now() - startTime;

            // Prepare error information
            let proxyError: ProxyError;
            if (error instanceof ProxyError) {
                proxyError = error;
            } else if (error instanceof KeySelectionError) {
                proxyError = new ProxyError(error.message, 'server_error', 503);
            } else if (error instanceof RetryExhaustedError) {
                proxyError = new ProxyError(error.message, 'server_error', 502);
            } else {
                proxyError = new ProxyError(
                    error instanceof Error ? error.message : 'Unknown error',
                    'server_error',
                    500,
                );
            }

            // Record error in API key if we had one selected
            if (selectedApiKeyId) {
                await this.keyManager.recordKeyError({
                    keyId: selectedApiKeyId,
                    errorReason: proxyError.message,
                });
            }

            // Finalize error logging
            if (requestId) {
                await this.loggingService.finalizeRequestLog({
                    requestId,
                    success: false,
                    totalDurationMs,
                    error: {
                        message: proxyError.message,
                        type: proxyError.type,
                        code: proxyError.code,
                    },
                });
            }

            // Return error response using web standard helper
            return WebStandardUtils.createErrorResponse({
                error: proxyError,
                requestId: requestId || undefined,
            });
        }
    }

    /**
     * Make request with retry logic
     */
    private async makeRequestWithRetries(params: MakeRequestWithRetriesParams): Promise<{
        response: ProxyResponse;
        apiCallDurationMs: number;
        retryDurationMs?: number;
        finalApiKeyId: string;
    }> {
        const { proxyRequest, apiFormat, initialApiKeyId, initialApiKey, requestId } = params;

        const maxRetries = this.config.proxy.maxRetries;
        const retryDelay = this.config.proxy.retryDelayMs;
        let currentApiKey = initialApiKey;
        let currentApiKeyId = initialApiKeyId;
        let excludeKeys: string[] = [];
        let totalRetryDuration = 0;

        // If maxRetries is -1, we'll try all available keys
        let attempt = 0;
        while (maxRetries === -1 || attempt <= maxRetries) {
            const attemptStart = Date.now();

            try {
                const response = await this.makeApiRequest({
                    proxyRequest,
                    apiFormat,
                    apiKey: currentApiKey,
                });

                const apiCallDuration = Date.now() - attemptStart;

                return {
                    response,
                    apiCallDurationMs: apiCallDuration,
                    retryDurationMs: totalRetryDuration > 0 ? totalRetryDuration : undefined,
                    finalApiKeyId: currentApiKeyId,
                };
            } catch (error) {
                const attemptDuration = Date.now() - attemptStart;
                totalRetryDuration += attemptDuration;

                const proxyError =
                    error instanceof ProxyError
                        ? error
                        : new ProxyError(
                              error instanceof Error ? error.message : 'Unknown error',
                              'server_error',
                          );

                // Record the retry attempt
                if (attempt > 0) {
                    await this.loggingService.logRetryAttempt({
                        requestId,
                        attemptNumber: attempt,
                        apiKeyId: currentApiKeyId,
                        error: {
                            message: proxyError.message,
                            type: proxyError.type,
                            status: proxyError.status,
                            code: proxyError.code,
                        },
                        durationMs: attemptDuration,
                    });
                }

                // Check if we should retry
                if (attempt >= maxRetries || !this.shouldRetry({ error: proxyError })) {
                    throw error;
                }

                // Mark current key as problematic and get a new one
                await this.keyManager.recordKeyError({
                    keyId: currentApiKeyId,
                    errorReason: proxyError.message,
                });
                excludeKeys.push(currentApiKeyId);

                try {
                    const newKeySelection = await this.keyManager.selectBestKey({
                        provider: 'gemini',
                        excludeKeys,
                        maxErrorRate: 0.5, // Allow keys with up to 50% error rate in retries
                    });

                    currentApiKey = newKeySelection.apiKey;
                    currentApiKeyId = newKeySelection.key._id!.toString();

                    // Wait before retry
                    if (retryDelay > 0) {
                        await new Promise((resolve) => setTimeout(resolve, retryDelay));
                    }
                } catch (keyError) {
                    // No more keys available
                    throw new RetryExhaustedError(
                        `No more API keys available for retry after ${attempt + 1} attempts`,
                        [], // Would need to collect retry attempts from logging
                    );
                }

                attempt++;
            }
        }

        throw new RetryExhaustedError(
            `Maximum retries (${maxRetries}) exceeded`,
            [], // Would need to collect retry attempts from logging
        );
    }

    /**
     * Make actual API request to Gemini API (native or OpenAI-compatible format)
     */
    private async makeApiRequest(params: MakeApiRequestParams): Promise<ProxyResponse> {
        const { proxyRequest, apiFormat, apiKey } = params;

        const targetUrl = this.buildTargetUrl({ path: proxyRequest.url, apiFormat });
        const headers = this.buildHeaders({
            originalHeaders: this.headersToRecord({ headers: proxyRequest.headers }),
            apiFormat,
            apiKey,
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, this.config.proxy.timeoutMs);

        try {
            // Prepare the request body based on its type
            // IMPORTANT: Always create fresh body for each retry to avoid "Body already read" errors

            const freshRequest = proxyRequest.clone();
            // Prepare fetch options
            const fetchOptions: RequestInit = {
                method: proxyRequest.method,
                headers,
                body: freshRequest.body, // Use the body directly
                signal: controller.signal,
            };

            // Add duplex option for Node.js when using ReadableStream
            if (proxyRequest.body instanceof ReadableStream && typeof process !== 'undefined') {
                (fetchOptions as any).duplex = 'half';
            }

            const response = await fetch(new Request(targetUrl, fetchOptions));

            clearTimeout(timeoutId);

            // Check for HTTP errors
            if (!response.ok) {
                // Clone response before reading to avoid "body already read" errors
                const errorBody = await response
                    .clone()
                    .text()
                    .catch(() => 'Unknown error');
                const errorType = this.categorizeHttpError({ status: response.status });

                throw new ProxyError(
                    `HTTP ${response.status}: ${errorBody}`,
                    errorType,
                    response.status,
                );
            }

            // Handle streaming responses
            const isStreaming = this.isStreamingResponse({ response });

            if (isStreaming) {
                // Convert headers to plain object with filtering
                const responseHeaders = new Headers(
                    this.filterResponseHeaders({ headers: response.headers }),
                );

                if (response.body) {
                    const [streamForClient, streamForLogging] = (
                        response.body as ReadableStream
                    ).tee();

                    // Create a new Response with the stream and extend it with proxy properties
                    const proxyResponse = new Response(streamForClient, {
                        status: response.status,
                        headers: responseHeaders,
                    }) as ProxyResponse;

                    proxyResponse.streaming = true;
                    return proxyResponse;
                }

                // Create a new Response and extend it with proxy properties
                const proxyResponse = new Response(response.body, {
                    status: response.status,
                    headers: responseHeaders,
                }) as ProxyResponse;

                proxyResponse.streaming = true;
                return proxyResponse;
            }

            // For non-streaming responses, we need to read the body content and create a fresh response
            // This ensures the response body is not consumed and can be properly returned to the client

            // Convert headers to plain object with minimal filtering
            const responseHeaders = this.filterResponseHeaders({ headers: response.headers });

            // Read the response body content
            const responseText = await response.text();

            // Create a new Response with the actual content (not the original body)
            const proxyResponse = new Response(responseText, {
                status: response.status,
                headers: new Headers(responseHeaders),
            }) as ProxyResponse;

            // Store the response text content for later use (to avoid body consumption issues)
            (proxyResponse as any).responseText = responseText;

            proxyResponse.streaming = false;
            return proxyResponse;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof ProxyError) {
                throw error;
            }

            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new ProxyError('Network error: Failed to connect to API', 'network_error', 0);
            }

            if (error instanceof Error && error.name === 'AbortError') {
                throw new ProxyError(
                    `Request timeout after ${this.config.proxy.timeoutMs}ms`,
                    'network_error',
                    408,
                );
            }

            throw new ProxyError(
                error instanceof Error ? error.message : 'Unknown error',
                'server_error',
            );
        }
    }

    /**
     * Convert Headers object to Record<string, string>
     */
    private headersToRecord(params: HeadersToRecordParams): Record<string, string> {
        const { headers } = params;

        const record: Record<string, string> = {};
        headers.forEach((value, key) => {
            record[key] = value;
        });
        return record;
    }

    /**
     * Build target URL for API request
     */
    private buildTargetUrl(params: BuildTargetUrlParams): string {
        const { path } = params;

        // Select the appropriate API format configuration
        const providerConfig = path.includes('/openai')
            ? this.config.providers.openaiCompatible
            : this.config.providers.gemini;
        let baseUrl = providerConfig.baseUrl;

        // Simple path parsing: /api/gproxy/{format}/{actual-path}
        // Find /api/gproxy and get everything after the format
        const gproxyIndex = path.indexOf('/api/gproxy');
        if (gproxyIndex !== -1) {
            // Remove /api/gproxy from the path
            const pathAfterGproxy = path.substring(gproxyIndex + '/api/gproxy'.length);

            // Split by '/' to get format and actual path
            const parts = pathAfterGproxy.split('/').filter((part) => part.length > 0);

            if (parts.length >= 2) {
                // parts[0] = format (gemini/openai), parts[1:] = actual path
                const actualPath = parts.slice(1).join('/');
                return `${baseUrl}/${actualPath}`;
            }
        }

        // Fallback: if we can't parse the path properly, use the original logic
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${baseUrl}/${cleanPath}`;
    }

    /**
     * Filter response headers to remove problematic ones
     */
    private filterResponseHeaders(params: FilterResponseHeadersParams): Record<string, string> {
        const { headers } = params;

        const responseHeaders: Record<string, string> = {};

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

            // Skip problematic headers
            if (blockedResponseHeaders.includes(lowerKey)) {
                return;
            }

            // Preserve all other headers including content-type, content-length, etc.
            responseHeaders[key] = value;
        });
        return responseHeaders;
    }

    /**
     * Build headers for API request
     */
    private buildHeaders(params: BuildHeadersParams): Record<string, string> {
        const { originalHeaders, apiFormat, apiKey } = params;

        const headers: Record<string, string> = {
            'content-type': 'application/json',
            'user-agent': 'gemini-proxy/1.0',
        };

        // Headers that are safe to copy from original request
        const allowedHeaders = [
            'accept',
            'accept-language',
            'content-type',
            'x-request-id',
            'x-client-id',
            'x-client-version',
            'x-model-version',
            'x-request-source',
        ];

        // Headers that should be skipped (can cause proxy issues)
        const blockedHeaders = [
            'host',
            'content-length',
            'transfer-encoding',
            'connection',
            'origin',
            'referer',
            'authorization',
            'x-api-key',
            'x-goog-api-key',
            'cookie',
            'set-cookie',
            'cf-connecting-ip',
            'x-forwarded-for',
            'x-real-ip',
            'x-forwarded-proto',
            'x-forwarded-host',
            'x-forwarded-port',
            'accept-encoding', // Let the target decide encoding
        ];

        for (const [key, value] of Object.entries(originalHeaders)) {
            const lowerKey = key.toLowerCase();

            // Skip blocked headers
            if (blockedHeaders.includes(lowerKey)) {
                continue;
            }

            // Copy allowed headers
            if (allowedHeaders.includes(lowerKey)) {
                headers[key] = value;
            }
        }

        // Set specific encoding preferences
        headers['Accept-Encoding'] = 'identity';

        // Add format-specific authentication
        if (apiFormat === 'openai-compatible') {
            headers['authorization'] = `Bearer ${apiKey}`;
        } else {
            headers['x-goog-api-key'] = apiKey;
        }

        return headers;
    }

    /**
     * Determine API format from request path (both use Gemini API keys)
     */
    private determineApiFormat(params: DetermineApiFormatParams): 'gemini' | 'openai-compatible' {
        const { path } = params;

        // Extract format from path structure: /api/gproxy/{format}/{actual-path}
        const pathParts = path.split('/');
        const proxyIndex = pathParts.findIndex((part) => part === 'gproxy');

        if (proxyIndex !== -1 && proxyIndex + 1 < pathParts.length) {
            const formatSegment = pathParts[proxyIndex + 1];

            // Direct format mapping from path
            if (formatSegment === 'openai') {
                return 'openai-compatible';
            }
            if (formatSegment === 'gemini') {
                return 'gemini';
            }
        }

        // Fallback logic for backward compatibility
        // OpenAI Compatible paths (chat completions, embeddings, etc.)
        if (
            path.includes('/chat/completions') ||
            path.includes('/completions') ||
            path.includes('/embeddings') ||
            path.includes('openai')
        ) {
            return 'openai-compatible';
        }

        // Gemini native paths
        if (
            path.includes('generateContent') ||
            path.includes('streamGenerateContent') ||
            path.includes('countTokens')
        ) {
            return 'gemini';
        }

        // Default based on v1 vs v1beta
        if (path.includes('/v1/')) {
            return 'openai-compatible';
        }

        if (path.includes('/v1beta/')) {
            return 'gemini';
        }

        // Default to gemini if can't determine
        return 'gemini';
    }

    /**
     * Validate proxy API key
     */
    private async validateProxyKey(params: ValidateProxyKeyParams) {
        const { proxyKeyId } = params;

        const proxyKey = await this.proxyKeyRepo.findByKeyId(proxyKeyId);

        if (!proxyKey) {
            throw new ProxyError('Invalid proxy API key', 'auth_error', 401);
        }

        if (!proxyKey.isActive) {
            throw new ProxyError('Proxy API key is inactive', 'auth_error', 401);
        }

        return proxyKey;
    }

    /**
     * Categorize HTTP error for retry logic
     */
    private categorizeHttpError(
        params: CategorizeHttpErrorParams,
    ): 'client_error' | 'server_error' | 'auth_error' {
        const { status } = params;

        if (status === 401 || status === 403) {
            return 'auth_error';
        }
        if (status === 429) {
            return 'server_error'; // Rate limit - retry with different key
        }
        if (status >= 400 && status < 500) {
            return 'client_error';
        }
        return 'server_error';
    }

    /**
     * Determine if we should retry based on error type
     */
    private shouldRetry(params: ShouldRetryParams): boolean {
        const { error } = params;

        // Don't retry client errors (400-499) except for auth errors
        if (error.type === 'client_error') {
            return false;
        }

        // Retry auth errors (might be a bad key)
        if (error.type === 'auth_error') {
            return true;
        }

        // Retry server errors (500+) and rate limits (429)
        return error.type === 'server_error' || error.type === 'network_error';
    }

    /**
     * Check if response is streaming
     */
    private isStreamingResponse(params: IsStreamingResponseParams): boolean {
        const { response } = params;

        const contentType = response.headers.get('content-type') || '';
        const transferEncoding = response.headers.get('transfer-encoding') || '';

        // Check content type for streaming indicators
        const isStreamingContentType =
            contentType.includes('text/event-stream') ||
            contentType.includes('application/x-ndjson') ||
            (contentType.includes('text/plain') && !contentType.includes('application/json'));

        // Check transfer encoding
        const isChunkedEncoding = transferEncoding.includes('chunked');

        // Check if body is a ReadableStream AND content type suggests streaming
        // Note: Regular JSON responses can also have ReadableStream bodies
        const hasStreamBody = response.body instanceof ReadableStream;

        // Only consider it streaming if we have explicit streaming indicators
        // Don't rely solely on ReadableStream or chunked encoding for JSON responses
        const isActuallyStreaming = isStreamingContentType && (hasStreamBody || isChunkedEncoding);

        return isActuallyStreaming;
    }

    /**
     * Collect stream chunks from streaming response
     */
    private async collectStreamChunks(params: CollectStreamChunksParams): Promise<StreamChunk[]> {
        const { response } = params;

        const chunks: StreamChunk[] = [];

        if (
            !response.body ||
            typeof response.body !== 'object' ||
            !('getReader' in response.body)
        ) {
            return chunks;
        }

        const reader = (response.body as ReadableStream).getReader();
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                chunks.push({
                    data: chunk,
                    timestamp: new Date(),
                });

                // Limit the number of chunks to prevent memory issues
                if (chunks.length > 1000) {
                    console.warn('Stream chunk limit reached, stopping collection');
                    break;
                }
            }
        } finally {
            reader.releaseLock();
            // Clear the decoder to free memory
            decoder.decode(new Uint8Array(0));
        }

        return chunks;
    }

    /**
     * Cleanup resources - important for Cloudflare Workers to prevent memory leaks
     */
    async cleanup(): Promise<void> {
        try {
            // Close database connection to prevent connection pool exhaustion
            await this.dbConnection.disconnect();
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    /**
     * Health check endpoint
     */
    async healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        database: boolean;
        apiKeys: { total: number; active: number };
        uptime: number;
    }> {
        try {
            const dbHealthy = this.dbConnection.isReady();
            const keyStats = await this.keyManager.getKeyStats();

            return {
                status: dbHealthy ? 'healthy' : 'unhealthy',
                database: dbHealthy,
                apiKeys: {
                    total: keyStats.totalKeys,
                    active: keyStats.activeKeys,
                },
                uptime: process.uptime(),
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                database: false,
                apiKeys: { total: 0, active: 0 },
                uptime: process.uptime(),
            };
        }
    }
}
```

```ts
import { UsageMetadata, StreamChunk, ParsedStreamResponse, ProxyRequest } from './types';

interface ParseOpenAIUsageParams {
    responseBody: any;
}

interface ParseGeminiUsageParams {
    responseBody: any;
}

interface ParseUnifiedUsageParams {
    responseBody: any;
}

interface ExtractModelParams {
    responseBody: any;
}

interface ParseOpenAIStreamParams {
    chunks: StreamChunk[];
}

interface ParseGeminiStreamParams {
    chunks: StreamChunk[];
}

interface ParseStreamParams {
    chunks: StreamChunk[];
}

interface IsStreamingRequestParams {
    req: ProxyRequest;
}

interface ExtractModelFromRequestParams {
    request: Request;
}

/**
 * Parse usage metadata from different AI provider responses
 */
export class UsageMetadataParser {
    /**
     * Parse OpenAI format usage metadata
     */
    parseOpenAIUsage(params: ParseOpenAIUsageParams): UsageMetadata | null {
        const { responseBody } = params;

        try {
            if (!responseBody || typeof responseBody !== 'object') {
                return null;
            }

            const usage = responseBody.usage;
            if (!usage) {
                return null;
            }

            return {
                model: responseBody.model || 'unknown',
                promptTokens: usage.prompt_tokens || 0,
                completionTokens: usage.completion_tokens || 0,
                totalTokens:
                    usage.total_tokens ||
                    (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
                thinkingTokens: usage.reasoning_tokens || undefined,
                extra: {
                    originalFormat: 'openai-compatible',
                    cached_tokens: usage.cached_tokens,
                    system_fingerprint: responseBody.system_fingerprint,
                    created: responseBody.created,
                    id: responseBody.id,
                    object: responseBody.object,
                },
            };
        } catch (error) {
            console.error('Error parsing OpenAI usage:', error);
            return null;
        }
    }

    /**
     * Parse Gemini format usage metadata
     */
    parseGeminiUsage(params: ParseGeminiUsageParams): UsageMetadata | null {
        const { responseBody } = params;

        try {
            if (!responseBody || typeof responseBody !== 'object') {
                return null;
            }

            const usageMetadata = responseBody.usageMetadata;
            if (!usageMetadata) {
                return null;
            }

            return {
                model: responseBody.modelVersion || 'gemini-unknown',
                promptTokens: usageMetadata.promptTokenCount || 0,
                completionTokens: usageMetadata.candidatesTokenCount || 0,
                totalTokens:
                    usageMetadata.totalTokenCount ||
                    (usageMetadata.promptTokenCount || 0) +
                        (usageMetadata.candidatesTokenCount || 0),
                thinkingTokens: undefined, // Gemini doesn't provide thinking tokens in current format
                extra: {
                    originalFormat: 'gemini',
                    cachedContentTokenCount: usageMetadata.cachedContentTokenCount,
                    promptTokensDetails: usageMetadata.promptTokensDetails,
                    candidatesTokensDetails: usageMetadata.candidatesTokensDetails,
                    candidates: responseBody.candidates,
                    promptFeedback: responseBody.promptFeedback,
                    modelVersion: responseBody.modelVersion,
                    responseId: responseBody.responseId,
                },
            };
        } catch (error) {
            console.error('Error parsing Gemini usage:', error);
            return null;
        }
    }

    /**
     * Unified parsing method that auto-detects format and extracts key metrics
     */
    parseUnifiedUsage(params: ParseUnifiedUsageParams): UsageMetadata | null {
        const { responseBody } = params;

        if (!responseBody) {
            return null;
        }

        // Try OpenAI-compatible format first
        if (responseBody.usage && responseBody.usage.prompt_tokens !== undefined) {
            return this.parseOpenAIUsage({ responseBody });
        }

        // Try Gemini native format
        if (
            responseBody.usageMetadata &&
            responseBody.usageMetadata.promptTokenCount !== undefined
        ) {
            return this.parseGeminiUsage({ responseBody });
        }

        return null;
    }

    /**
     * Extract model name from response
     */
    extractModel(params: ExtractModelParams): string {
        const { responseBody } = params;

        if (!responseBody || typeof responseBody !== 'object') {
            return 'unknown';
        }

        // Gemini format
        if (responseBody.modelVersion) {
            return responseBody.modelVersion;
        }

        // OpenAI format
        if (responseBody.model) {
            return responseBody.model;
        }

        // Fallback
        return 'unknown';
    }
}

/**
 * Parse streaming responses from different providers
 */
export class StreamResponseParser {
    private usageParser: UsageMetadataParser;

    constructor() {
        this.usageParser = new UsageMetadataParser();
    }

    /**
     * Parse OpenAI streaming response chunks - extract usage from final chunks
     */
    parseOpenAIStream(params: ParseOpenAIStreamParams): ParsedStreamResponse {
        const { chunks } = params;

        const result: ParsedStreamResponse = {
            chunks: [],
            usage: undefined,
            model: undefined,
            finished: false,
        };

        if (chunks.length === 0) {
            return result;
        }

        let finalUsage: UsageMetadata | undefined = undefined;
        let modelFound = false;

        for (const chunk of chunks) {
            result.chunks.push(chunk);

            try {
                const lines = chunk.data.split('\n').filter((line) => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6);

                        if (jsonStr === '[DONE]') {
                            result.finished = true;
                            continue;
                        }

                        if (jsonStr.trim() === '') {
                            continue;
                        }

                        try {
                            const data = JSON.parse(jsonStr);

                            // Extract model from any chunk
                            if (data.model && !modelFound) {
                                result.model = data.model;
                                modelFound = true;
                            }

                            // Check for finish_reason in choices to identify final chunk
                            if (data.choices && Array.isArray(data.choices)) {
                                for (const choice of data.choices) {
                                    const finishReason =
                                        choice.delta?.finish_reason || choice.finish_reason;
                                    if (finishReason && data.usage) {
                                        const usage = this.usageParser.parseOpenAIUsage({
                                            responseBody: data,
                                        });
                                        if (usage) {
                                            finalUsage = usage;
                                        }
                                    }
                                }
                            }

                            // Also check for usage in any chunk (fallback)
                            if (data.usage && !finalUsage) {
                                const usage = this.usageParser.parseOpenAIUsage({
                                    responseBody: data,
                                });
                                if (usage) {
                                    finalUsage = usage;
                                }
                            }
                        } catch {
                            // Ignore JSON parse errors for individual chunks
                        }
                    }
                }
            } catch {
                // Ignore chunk processing errors
            }
        }

        result.usage = finalUsage;
        return result;
    }

    /**
     * Parse Gemini streaming response chunks - extract usage from final chunks
     */
    parseGeminiStream(params: ParseGeminiStreamParams): ParsedStreamResponse {
        const { chunks } = params;

        const result: ParsedStreamResponse = {
            chunks: [],
            usage: undefined,
            model: undefined,
            finished: false,
        };

        if (chunks.length === 0) {
            return result;
        }

        let finalUsage: UsageMetadata | undefined = undefined;
        let modelFound = false;

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            result.chunks.push(chunk);

            try {
                // Parse the chunk data
                const lines = chunk.data.split('\n').filter((line) => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6);

                        try {
                            const data = JSON.parse(jsonStr);

                            // Extract model from any chunk
                            if (data.modelVersion && !modelFound) {
                                result.model = data.modelVersion;
                                modelFound = true;
                            }

                            // Check for finishReason in candidates to identify final chunk
                            if (data.candidates && Array.isArray(data.candidates)) {
                                for (const candidate of data.candidates) {
                                    if (candidate.finishReason) {
                                        // This is a final chunk, try to extract usage
                                        if (
                                            data.usageMetadata &&
                                            data.usageMetadata.candidatesTokenCount
                                        ) {
                                            const usage = this.usageParser.parseGeminiUsage({
                                                responseBody: data,
                                            });
                                            if (usage) {
                                                finalUsage = usage;
                                                result.finished = true;
                                            }
                                        }
                                    }
                                }
                            }

                            // Also check for usage with complete token counts (fallback)
                            if (
                                data.usageMetadata &&
                                data.usageMetadata.candidatesTokenCount &&
                                !finalUsage
                            ) {
                                const usage = this.usageParser.parseGeminiUsage({
                                    responseBody: data,
                                });
                                if (usage) {
                                    finalUsage = usage;
                                }
                            }
                        } catch (parseError) {
                            // Ignore JSON parse errors for individual chunks
                        }
                    }
                }
            } catch (error) {
                // Ignore chunk processing errors
            }
        }

        result.usage = finalUsage;
        return result;
    }

    /**
     * Auto-detect format and parse streaming response
     */
    parseStream(params: ParseStreamParams): ParsedStreamResponse {
        const { chunks } = params;

        if (chunks.length === 0) {
            return { chunks: [], usage: undefined, model: undefined, finished: false };
        }

        // Auto-detect format based on first chunk content
        const firstChunk = chunks[0];
        const firstLine = firstChunk.data.split('\n')[0];

        if (
            firstLine.includes('"choices"') ||
            firstLine.includes('"object":"chat.completion.chunk"')
        ) {
            return this.parseOpenAIStream({ chunks });
        }

        if (firstLine.includes('"candidates"') || firstLine.includes('"usageMetadata"')) {
            return this.parseGeminiStream({ chunks });
        }

        // Default to OpenAI format if can't determine
        return this.parseOpenAIStream({ chunks });
    }
}

/**
 * Parse request information and detect streaming
 */
export class RequestParser {
    /**
     * Check if request is streaming
     */
    async isStreamingRequest(params: IsStreamingRequestParams): Promise<boolean> {
        const { req } = params;

        // Check path for streaming indicators endpoints of gemini format
        const path = req.url.toLowerCase();
        if (
            path.includes(':stream') ||
            path.includes(':streamgeneratecontent') ||
            path.includes('?alt=sse')
        ) {
            return true;
        }

        // Check body for stream flag of openai format
        const body = req.body;
        // Note: We can't check ReadableStream bodies for stream flags, so we rely on content-type and path
        if (
            body &&
            typeof body === 'object' &&
            !(body instanceof ReadableStream) &&
            (body as any).stream === true
        ) {
            return true;
        }

        // Check content-type for streaming
        const contentType = req.headers.get('content-type') || '';
        if (
            contentType.includes('text/event-stream') ||
            contentType.includes('application/x-ndjson')
        ) {
            return true;
        }

        return false;
    }

    /**
     * Extract model name from request
     */
    async extractModelFromRequest(params: ExtractModelFromRequestParams): Promise<string> {
        const { request } = params;
        const clonedRequest = request.clone();

        const path = clonedRequest.url;
        const body = clonedRequest.body;

        // Check for model in path for gemini format
        if (path.includes('/v1beta/models/')) {
            const model = path.split('/').pop()?.split(':')[0];
            return model || 'unknown';
        }

        // Try to extract model from body if it's not a ReadableStream
        if (body && body instanceof ReadableStream) {
            // Can't read from ReadableStream without consuming it
            return 'unknown';
        }

        if (body && typeof body === 'object') {
            const model = (body as any).model;
            return model || 'unknown';
        }

        return 'unknown';
    }
}

/**
 * Extract usage metadata from collected stream chunks
 */
export class StreamUsageExtractor {
    private usageParser: UsageMetadataParser;
    private streamParser: StreamResponseParser;

    constructor() {
        this.usageParser = new UsageMetadataParser();
        this.streamParser = new StreamResponseParser();
    }

    /**
     * Extract usage from collected stream chunks
     */
    extractUsageFromStreamChunks(chunks: StreamChunk[]): UsageMetadata | null {
        if (!chunks || chunks.length === 0) {
            return null;
        }

        // Try to parse as OpenAI format first
        const openAIResult = this.streamParser.parseOpenAIStream({ chunks });
        if (openAIResult.usage) {
            return openAIResult.usage;
        }

        // Try to parse as Gemini format
        const geminiResult = this.streamParser.parseGeminiStream({ chunks });
        if (geminiResult.usage) {
            return geminiResult.usage;
        }

        return null;
    }

    /**
     * Extract model from collected stream chunks
     */
    extractModelFromStreamChunks(chunks: StreamChunk[]): string | null {
        if (!chunks || chunks.length === 0) {
            return null;
        }

        // Try to parse as OpenAI format first
        const openAIResult = this.streamParser.parseOpenAIStream({ chunks });
        if (openAIResult.model) {
            return openAIResult.model;
        }

        // Try to parse as Gemini format
        const geminiResult = this.streamParser.parseGeminiStream({ chunks });
        if (geminiResult.model) {
            return geminiResult.model;
        }

        return null;
    }
}

// Export singleton instances
export const usageParser = new UsageMetadataParser();
export const streamParser = new StreamResponseParser();
export const requestParser = new RequestParser();
export const streamUsageExtractor = new StreamUsageExtractor();
```

```ts
import { nanoid } from 'nanoid';
import { RequestLogRepository, ProxyApiKeyRepository } from './database';
import { UsageMetadataParser, StreamResponseParser, RequestParser } from './parsers';
import {
    RequestLog,
    RetryAttempt,
    ProxyRequest,
    ProxyResponse,
    UsageMetadata,
    StreamChunk,
} from './types';
import { IRequestLog } from './database';

interface StartRequestLogParams {
    proxyKeyId: string;
    apiKeyId: string;
    apiFormat: 'gemini' | 'openai-compatible';
    request: ProxyRequest;
}

interface LogRetryAttemptParams {
    requestId: string;
    attemptNumber: number;
    apiKeyId: string;
    error: {
        message: string;
        type: 'client_error' | 'server_error' | 'network_error' | 'auth_error';
        status?: number;
        code?: string;
    };
    durationMs: number;
}

interface LogResponseParams {
    requestId: string;
    response: ProxyResponse;
    apiCallDurationMs: number;
    streamChunks?: StreamChunk[];
    usage?: UsageMetadata;
}

interface FinalizeRequestLogParams {
    requestId: string;
    success: boolean;
    totalDurationMs: number;
    error?: {
        message: string;
        type: string;
        code?: string;
    };
    usage?: UsageMetadata;
    retryDurationMs?: number;
}

interface HeadersToRecordParams {
    headers: Headers;
}

interface SanitizeHeadersParams {
    headers: Record<string, string>;
}

interface SanitizeRequestBodyParams {
    body: unknown;
}

interface MaskApiKeyParams {
    keyId: string;
}

export class LoggingService {
    private logRepo: RequestLogRepository;
    private proxyKeyRepo: ProxyApiKeyRepository;
    private usageParser: UsageMetadataParser;
    private streamParser: StreamResponseParser;
    private requestParser: RequestParser;

    constructor() {
        this.logRepo = new RequestLogRepository();
        this.proxyKeyRepo = new ProxyApiKeyRepository();
        this.usageParser = new UsageMetadataParser();
        this.streamParser = new StreamResponseParser();
        this.requestParser = new RequestParser();
    }

    /**
     * Convert Headers object to Record<string, string>
     */
    private headersToRecord(params: HeadersToRecordParams): Record<string, string> {
        const { headers } = params;

        const record: Record<string, string> = {};
        headers.forEach((value, key) => {
            record[key] = value;
        });
        return record;
    }

    /**
     * Start a new request log
     */
    async startRequestLog(params: StartRequestLogParams): Promise<string> {
        const { proxyKeyId, apiKeyId, apiFormat, request } = params;

        const requestId = nanoid();
        const timestamp = new Date();

        // Update proxy key usage
        await this.proxyKeyRepo.updateUsage(proxyKeyId);

        // Filter sensitive headers for logging
        const sanitizedHeaders = this.sanitizeHeaders({
            headers: this.headersToRecord({ headers: request.headers }),
        });

        // Parse and estimate request metadata
        const isStreaming = await this.requestParser.isStreamingRequest({ req: request });
        const requestedModel = await this.requestParser.extractModelFromRequest({
            request,
        });

        const logEntry: Omit<RequestLog, '_id'> = {
            proxyKeyId,
            apiKeyId,
            requestId,
            apiFormat,
            request: {
                method: request.method,
                path: request.url,
                headers: sanitizedHeaders,
                body: this.sanitizeRequestBody({ body: request.body }),
                timestamp,
                clientIp: request.clientIp,
            },
            retries: [],
            success: false, // Will be updated later
            metrics: {
                totalDurationMs: 0,
                apiCallDurationMs: undefined,
                retryDurationMs: undefined,
            },
        };

        await this.logRepo.create(logEntry);

        // Console log for real-time monitoring
        console.log(`[${requestId}] Request started:`, {
            proxyKey: this.maskApiKey({ keyId: proxyKeyId }),
            apiKey: this.maskApiKey({ keyId: apiKeyId }),
            method: request.method,
            path: request.url,
            model: requestedModel,
            isStreamingRequest: isStreaming,
            clientIp: request.clientIp,
            timestamp: timestamp.toISOString(),
        });

        return requestId;
    }

    /**
     * Log a retry attempt
     */
    async logRetryAttempt(params: LogRetryAttemptParams): Promise<void> {
        const { requestId, attemptNumber, apiKeyId, error, durationMs } = params;

        const retryAttempt: RetryAttempt = {
            attemptNumber,
            apiKeyId,
            timestamp: new Date(),
            durationMs,
            error,
        };

        await this.logRepo.addRetry(requestId, retryAttempt);

        // Console log for real-time monitoring
        console.log(`[${requestId}] Retry attempt ${attemptNumber}:`, {
            apiKey: this.maskApiKey({ keyId: apiKeyId }),
            error: error.message,
            errorType: error.type,
            status: error.status,
            durationMs,
            timestamp: retryAttempt.timestamp.toISOString(),
        });
    }

    /**
     * Log successful response
     */
    async logResponse(params: LogResponseParams): Promise<void> {
        const { requestId, response, apiCallDurationMs, streamChunks, usage } = params;

        // Filter sensitive headers for logging
        const sanitizedHeaders = this.sanitizeHeaders({
            headers: this.headersToRecord({ headers: response.headers }),
        });

        let resolvedUsage: UsageMetadata | null | undefined = usage || null;
        let sanitizedBody: unknown = undefined;

        if (response.streaming) {
            // Do not attempt to read streaming body; mark it
            sanitizedBody = this.sanitizeRequestBody({ body: response.body });
        } else {
            // For non-streaming responses, use stored response text if available
            try {
                const responseText = (response as any).responseText;
                if (responseText) {
                    // Use the stored response text to avoid body consumption issues
                    let parsed;
                    try {
                        parsed = JSON.parse(responseText);
                    } catch {
                        parsed = responseText;
                    }
                    sanitizedBody = this.sanitizeRequestBody({ body: parsed });
                    if (!resolvedUsage) {
                        resolvedUsage = this.usageParser.parseUnifiedUsage({
                            responseBody: parsed,
                        });
                    }
                }
            } catch {
                // Best-effort only
                sanitizedBody = '[Unparseable Body]';
            }
        }

        await this.logRepo.updateResponse(requestId, {
            status: response.status,
            headers: sanitizedHeaders,
            body: sanitizedBody,
            timestamp: new Date(),
            streaming: response.streaming || false,
        });

        // Console log for real-time monitoring
        console.log(`[${requestId}] Response logged:`, {
            status: response.status,
            streaming: response.streaming,
            apiCallDurationMs,
            promptTokens: resolvedUsage?.promptTokens,
            completionTokens: resolvedUsage?.completionTokens,
            totalTokens: resolvedUsage?.totalTokens,
            thinkingTokens: resolvedUsage?.thinkingTokens,
            format: resolvedUsage?.extra?.originalFormat,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Finalize request log with success/failure status
     */
    async finalizeRequestLog(params: FinalizeRequestLogParams): Promise<void> {
        const { requestId, success, totalDurationMs, error, usage, retryDurationMs } = params;

        await this.logRepo.updateFinal(requestId, success, error as any, usage, {
            totalDurationMs,
            retryDurationMs,
        });

        // Console log for real-time monitoring
        console.log(`[${requestId}] Request finalized:`, {
            success,
            totalDurationMs,
            retryDurationMs,
            promptTokens: usage?.promptTokens,
            completionTokens: usage?.completionTokens,
            totalTokens: usage?.totalTokens,
            thinkingTokens: usage?.thinkingTokens,
            format: usage?.extra?.originalFormat,
            error: error?.message,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Get request statistics
     */
    async getStatistics(): Promise<{
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        averageResponseTime: number;
        requestsByProvider: Record<string, number>;
        recentErrors: Array<{
            requestId: string;
            error: string;
            timestamp: Date;
        }>;
    }> {
        const logs = await this.logRepo.findRecent(1000); // Last 1000 requests

        const stats = {
            totalRequests: logs.length,
            successfulRequests: logs.filter((log) => log.success).length,
            failedRequests: logs.filter((log) => !log.success).length,
            averageResponseTime:
                logs.reduce((sum, log) => sum + log.metrics.totalDurationMs, 0) / logs.length || 0,
            requestsByProvider: logs.reduce((acc, log) => {
                acc[log.apiFormat] = (acc[log.apiFormat] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            recentErrors: logs
                .filter((log) => !log.success && log.error)
                .sort((a, b) => b.request.timestamp.getTime() - a.request.timestamp.getTime())
                .slice(0, 10)
                .map((log) => ({
                    requestId: log.requestId,
                    error: log.error!.message,
                    timestamp: log.request.timestamp,
                })),
        };

        return stats;
    }

    /**
     * Get recent request logs
     */
    async getRecentLogs(limit = 50): Promise<IRequestLog[]> {
        return await this.logRepo.findRecent(limit);
    }

    /**
     * Get request log by ID
     */
    async getRequestLog(requestId: string): Promise<IRequestLog | null> {
        return await this.logRepo.findByRequestId(requestId);
    }

    /**
     * Sanitize headers for logging (remove sensitive information)
     */
    private sanitizeHeaders(params: SanitizeHeadersParams): Record<string, string> {
        const { headers } = params;

        const sanitized: Record<string, string> = {};

        for (const [key, value] of Object.entries(headers)) {
            const lowerKey = key.toLowerCase();

            // Skip sensitive headers
            if (
                lowerKey.includes('authorization') ||
                lowerKey.includes('api-key') ||
                lowerKey.includes('token') ||
                lowerKey.includes('password') ||
                lowerKey.includes('secret')
            ) {
                sanitized[key] = '[REDACTED]';
                continue;
            }

            // Skip very long headers
            if (value.length > 1000) {
                sanitized[key] = `[TRUNCATED: ${value.substring(0, 100)}...]`;
                continue;
            }

            sanitized[key] = value;
        }

        return sanitized;
    }

    /**
     * Sanitize request body for logging
     */
    private sanitizeRequestBody(params: SanitizeRequestBodyParams): unknown {
        const { body } = params;

        if (!body) {
            return body;
        }

        // For ReadableStream, do not attempt to read
        if (typeof body === 'object' && body !== null && 'getReader' in (body as any)) {
            return '[ReadableStream]';
        }

        // For strings, truncate if too long
        if (typeof body === 'string') {
            if (body.length > 1000) {
                return `[TRUNCATED: ${body.substring(0, 100)}...]`;
            }
            return body;
        }

        // For objects, sanitize sensitive fields
        if (typeof body === 'object' && body !== null) {
            const sanitized: Record<string, any> = { ...(body as any) };

            // Remove sensitive fields
            const sensitiveFields = ['api_key', 'token', 'password', 'secret', 'key'];
            for (const field of sensitiveFields) {
                if (field in sanitized) {
                    sanitized[field] = '[REDACTED]';
                }
            }

            // Truncate long messages
            if ('messages' in sanitized && Array.isArray(sanitized.messages)) {
                sanitized.messages = sanitized.messages.map((msg: any) => {
                    if (
                        msg.content &&
                        typeof msg.content === 'string' &&
                        msg.content.length > 500
                    ) {
                        return {
                            ...msg,
                            content: `[TRUNCATED: ${msg.content.substring(0, 100)}...]`,
                        };
                    }
                    return msg;
                });
            }

            return sanitized;
        }

        return body;
    }

    /**
     * Mask API key for display
     */
    private maskApiKey(params: MaskApiKeyParams): string {
        const { keyId } = params;

        if (keyId.length <= 8) {
            return '*'.repeat(keyId.length);
        }

        const start = keyId.substring(0, 4);
        const end = keyId.substring(keyId.length - 4);
        const middle = '*'.repeat(keyId.length - 8);

        return `${start}${middle}${end}`;
    }
}
```

```ts
import { ApiKeyRepository, IApiKey } from './database';
import { KeySelectionCriteria, KeySelectionError } from './types';

interface AddApiKeyParams {
    name: string;
    key: string;
    provider?: 'gemini';
}

interface ValidateKeyFormatParams {
    key: string;
}

interface TestApiKeyParams {
    keyId: string;
}

interface MakeTestRequestParams {
    key: string;
    provider: 'gemini';
}

interface RecordKeyUsageParams {
    keyId: string;
    tokenUsage?: number;
}

interface RecordKeyErrorParams {
    keyId: string;
    errorReason: string;
}

export class ApiKeyManager {
    private apiKeyRepo: ApiKeyRepository;

    constructor() {
        this.apiKeyRepo = new ApiKeyRepository();
    }

    /**
     * Select the best API key based on criteria
     */
    async selectBestKey(criteria: KeySelectionCriteria): Promise<{ key: IApiKey; apiKey: string }> {
        const availableKeys = await this.getAvailableKeys(criteria);

        if (availableKeys.length === 0) {
            throw new KeySelectionError(
                `No valid ${criteria.provider} API keys available`,
                'no_valid_keys',
            );
        }

        // Sort keys by selection priority
        const sortedKeys = this.sortKeysByPriority(availableKeys, criteria);
        const selectedKey = sortedKeys[0];

        return { key: selectedKey, apiKey: selectedKey.key };
    }

    /**
     * Get all available keys that meet the criteria
     */
    private async getAvailableKeys(criteria: KeySelectionCriteria): Promise<IApiKey[]> {
        let keys = await this.apiKeyRepo.findActiveByProvider(criteria.provider);

        // Filter by exclude list
        if (criteria.excludeKeys && criteria.excludeKeys.length > 0) {
            keys = keys.filter((key) => !criteria.excludeKeys!.includes(key._id!.toString()));
        }

        // Filter by error rate
        if (criteria.maxErrorRate !== undefined) {
            keys = keys.filter((key) => {
                const totalRequests = key.metadata.totalUsage;
                const errorCount = key.metadata.errorCount;

                if (totalRequests === 0) return true; // New keys have no error rate

                const errorRate = errorCount / totalRequests;
                return errorRate <= criteria.maxErrorRate!;
            });
        }

        // Filter by minimum hours since last use
        if (criteria.minLastUsedHours !== undefined) {
            const minLastUsedTime = new Date(
                Date.now() - criteria.minLastUsedHours * 60 * 60 * 1000,
            );

            keys = keys.filter(
                (key) => !key.metadata.lastUsedAt || key.metadata.lastUsedAt < minLastUsedTime,
            );
        }

        return keys;
    }

    /**
     * Sort keys by priority (best first)
     */
    private sortKeysByPriority(keys: IApiKey[], criteria: KeySelectionCriteria): IApiKey[] {
        return keys.sort((a, b) => {
            // Priority 1: Prefer keys with fewer errors
            const errorRateA =
                a.metadata.totalUsage > 0 ? a.metadata.errorCount / a.metadata.totalUsage : 0;
            const errorRateB =
                b.metadata.totalUsage > 0 ? b.metadata.errorCount / b.metadata.totalUsage : 0;

            if (errorRateA !== errorRateB) {
                return errorRateA - errorRateB;
            }

            // Priority 2: Prefer keys not used recently (oldest first)
            const lastUsedA = a.metadata.lastUsedAt?.getTime() || 0;
            const lastUsedB = b.metadata.lastUsedAt?.getTime() || 0;

            if (lastUsedA !== lastUsedB) {
                return lastUsedA - lastUsedB;
            }

            // Priority 3: Prefer keys with less total usage
            if (a.metadata.totalUsage !== b.metadata.totalUsage) {
                return a.metadata.totalUsage - b.metadata.totalUsage;
            }

            // Priority 4: Prefer newer keys (as fallback)
            const createdA = a.metadata.createdAt.getTime();
            const createdB = b.metadata.createdAt.getTime();
            return createdB - createdA;
        });
    }

    /**
     * Record successful API key usage
     */
    async recordKeyUsage(params: RecordKeyUsageParams): Promise<void> {
        const { keyId, tokenUsage = 1 } = params;
        await this.apiKeyRepo.updateUsage(keyId, tokenUsage);
    }

    /**
     * Record API key error
     */
    async recordKeyError(params: RecordKeyErrorParams): Promise<void> {
        const { keyId, errorReason } = params;
        await this.apiKeyRepo.updateError(keyId, errorReason);
    }

    /**
     * Add a new API key
     */
    async addApiKey(params: AddApiKeyParams): Promise<IApiKey> {
        const { name, key, provider = 'gemini' } = params;

        // Check if name already exists
        const existing = await this.apiKeyRepo.findByName(name);
        if (existing) {
            throw new Error(`API key with name '${name}' already exists`);
        }

        // Validate key format based on provider
        this.validateKeyFormat({ key });

        return await this.apiKeyRepo.create({
            name,
            key,
            isActive: true,
            metadata: {
                createdAt: new Date(),
                totalUsage: 0,
                errorCount: 0,
            },
        });
    }

    /**
     * Validate API key format
     */
    private validateKeyFormat(params: ValidateKeyFormatParams): void {
        const { key } = params;

        // Only validate Gemini keys since both native and OpenAI-compatible use Gemini keys
        if (key.length < 20 || !/^[A-Za-z0-9_-]+$/.test(key)) {
            throw new Error('Invalid Gemini API key format');
        }
    }

    /**
     * Get API key statistics
     */
    async getKeyStats(): Promise<{
        totalKeys: number;
        activeKeys: number;
        keysByProvider: Record<string, number>;
        recentErrors: Array<{ keyName: string; errorReason: string; timestamp: Date }>;
    }> {
        const allKeys = await this.apiKeyRepo.findAll();

        const stats = {
            totalKeys: allKeys.length,
            activeKeys: allKeys.filter((k) => k.isActive).length,
            keysByProvider: allKeys.reduce((acc, key) => {
                acc[key.provider] = (acc[key.provider] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            recentErrors: allKeys
                .filter((key) => key.metadata.lastErrorAt && key.metadata.lastErrorReason)
                .sort(
                    (a, b) => b.metadata.lastErrorAt!.getTime() - a.metadata.lastErrorAt!.getTime(),
                )
                .slice(0, 10)
                .map((key) => ({
                    keyName: key.name,
                    errorReason: key.metadata.lastErrorReason!,
                    timestamp: key.metadata.lastErrorAt!,
                })),
        };

        return stats;
    }

    /**
     * Test an API key by making a simple request
     */
    async testApiKey(params: TestApiKeyParams): Promise<{ success: boolean; error?: string }> {
        const { keyId } = params;

        try {
            const key = await this.apiKeyRepo.findById(keyId);
            if (!key) {
                return { success: false, error: 'API key not found' };
            }

            if (!key.isActive) {
                return { success: false, error: 'API key is inactive' };
            }

            // Make a test request based on provider
            const testResult = await this.makeTestRequest({ key: key.key, provider: key.provider });

            if (testResult.success) {
                await this.recordKeyUsage({ keyId, tokenUsage: 0 }); // Record test usage without incrementing usage count
            } else {
                await this.recordKeyError({
                    keyId,
                    errorReason: testResult.error || 'Test request failed',
                });
            }

            return testResult;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Make a test request to validate API key
     */
    private async makeTestRequest(
        params: MakeTestRequestParams,
    ): Promise<{ success: boolean; error?: string }> {
        const { key, provider } = params;

        try {
            // Simple test request to validate the key
            const testUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
            const headers: Record<string, string> = {};

            if (provider === 'gemini') {
                headers['x-goog-api-key'] = key;
            } else {
                headers['authorization'] = `Bearer ${key}`;
            }

            const response = await fetch(testUrl, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(10000), // 10 second timeout
            });

            // Clone response before reading to avoid body locking
            const responseClone = response.clone();

            if (!response.ok) {
                const errorText = await responseClone.text().catch(() => 'Unknown error');
                return { success: false, error: `HTTP ${response.status}: ${errorText}` };
            }

            return { success: true };
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return { success: false, error: 'Request timeout' };
            }

            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Remove an API key
     */
    async removeApiKey(keyId: string): Promise<void> {
        const key = await this.apiKeyRepo.findById(keyId);
        if (!key) {
            throw new Error('API key not found');
        }

        await this.apiKeyRepo.delete(keyId);
    }

    /**
     * Toggle API key active status
     */
    async toggleApiKey(keyId: string, isActive: boolean): Promise<void> {
        const key = await this.apiKeyRepo.findById(keyId);
        if (!key) {
            throw new Error('API key not found');
        }

        await this.apiKeyRepo.setActive(keyId, isActive);
    }

    /**
     * Get all API keys (for management interface)
     */
    async getAllKeys(): Promise<Array<Omit<IApiKey, 'key'> & { maskedKey: string }>> {
        const keys = await this.apiKeyRepo.findAll();

        return keys.map((key) => {
            const keyObj = key.toObject();
            const { key: apiKey, ...keyData } = keyObj;
            return {
                ...keyData,
                maskedKey: this.maskApiKey(apiKey),
            };
        });
    }

    /**
     * Mask an API key for display (show only first and last 4 characters)
     */
    private maskApiKey(key: string): string {
        if (key.length <= 8) {
            return '*'.repeat(key.length);
        }

        const start = key.substring(0, 4);
        const end = key.substring(key.length - 4);
        const middle = '*'.repeat(key.length - 8);

        return `${start}${middle}${end}`;
    }
}
```
