import { type Hono } from 'hono';
import type { Variables as HonoVariables, Bindings as HonoBindings } from 'hono/types';

// Core configuration interface
export interface CoreConfig {
    supabaseUrl: string;
    supabaseServiceKey: string;
    defaultApiFormat?: 'gemini' | 'openai-compatible';
    maxRetries?: number;
    retryDelay?: number;
    requestTimeout?: number;
    enableLogging?: boolean;
    enableMetrics?: boolean;
}

// Proxy request interface
export interface ProxyRequest {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
    apiFormat?: 'gemini' | 'openai-compatible';
    proxyKeyId?: string;
}

// Proxy response interface
export interface ProxyResponse {
    status: number;
    headers: Record<string, string>;
    body: any;
    usage?: UsageMetadata;
    error?: ProxyError;
}

// Error types
export interface ProxyError {
    type:
        | 'rate_limit'
        | 'invalid_key'
        | 'server_error'
        | 'network_error'
        | 'validation_error'
        | 'unknown';
    message: string;
    code?: string;
    details?: any;
    retryable: boolean;
}

// Custom error classes
export class RateLimitError extends Error {
    constructor(
        message: string,
        public retryAfter?: number,
    ) {
        super(message);
        this.name = 'RateLimitError';
    }
}

export class InvalidKeyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidKeyError';
    }
}

export class ServerError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
    ) {
        super(message);
        this.name = 'ServerError';
    }
}

export class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class KeySelectionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'KeySelectionError';
    }
}

// Streaming response types
export interface StreamChunk {
    type: 'data' | 'error' | 'done';
    data?: any;
    error?: ProxyError;
    usage?: UsageMetadata;
}

export interface StreamResponse {
    stream: ReadableStream<StreamChunk>;
    usage?: UsageMetadata;
}

// Usage metadata interface
export interface UsageMetadata {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    model?: string;
    cost?: number;
    currency?: string;
}

// API key selection criteria
export interface KeySelectionCriteria {
    provider?: string;
    minUsage?: number;
    maxUsage?: number;
    excludeKeys?: string[];
    preferActive?: boolean;
}

// Retry attempt interface
export interface RetryAttempt {
    attempt: number;
    timestamp: Date;
    error: ProxyError;
    apiKeyId?: string;
    response?: any;
}

// Database entity interfaces - PostgreSQL style with proper UUID references
export interface IApiKey {
    id: string; // PostgreSQL UUID primary key
    userId: string; // UUID reference to auth.users
    name: string;
    apiKeyValue: string; // Changed from 'key' to avoid reserved keyword
    provider: string;
    isActive: boolean;
    metadata: {
        totalUsage: number;
        errorCount: number;
        lastUsedAt?: Date;
        lastErrorAt?: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface IProxyApiKey {
    id: string; // PostgreSQL UUID primary key
    userId: string; // UUID reference to auth.users
    keyId: string;
    name: string;
    isActive: boolean;
    usageStats: {
        // Changed from 'usage' to avoid reserved keyword
        totalRequests: number;
        lastUsedAt?: Date;
        dailyRequests?: number;
        monthlyRequests?: number;
    };
    metadata: {
        description?: string;
        permissions?: string[];
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface IRequestLog {
    id: string; // PostgreSQL UUID primary key
    userId: string; // UUID reference to auth.users
    proxyKeyId: string;
    apiKeyId: string;
    requestId: string;
    apiFormat: 'gemini' | 'openai-compatible';
    requestData: {
        // Changed from 'request' to avoid reserved keyword
        method: string;
        url: string;
        headers: Record<string, string>;
        body?: any;
        model?: string;
        timestamp: Date;
    };
    responseData?: {
        // Changed from 'response' to avoid reserved keyword
        status: number;
        headers: Record<string, string>;
        body?: any;
        timestamp: Date;
    };
    retryAttempts: RetryAttempt[]; // Changed from 'retries' to avoid reserved keyword
    isSuccessful: boolean; // Changed from 'success' to avoid reserved keyword
    errorDetails?: ProxyError; // Changed from 'error' to avoid reserved keyword
    usageMetadata?: UsageMetadata; // Changed from 'usage' to avoid reserved keyword
    performanceMetrics: {
        // Changed from 'metrics' to avoid reserved keyword
        totalTime: number;
        processingTime: number;
        networkTime: number;
        retryCount: number;
    };
    createdAt: Date;
}

// Hono-specific types
export interface Variables extends HonoVariables {
    userId: string;
    proxyKeyId: string | null;
    proxyKey?: any;
    requestId: string;
}

export interface Bindings extends HonoBindings {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    [key: string]: string;
}

// Utility types - PostgreSQL style
export type RequestLog = Omit<IRequestLog, 'id'>;
export type ApiKey = Omit<IApiKey, 'id'>;
export type ProxyApiKey = Omit<IProxyApiKey, 'id'>;

export type HonoApp = {
    Variables: Variables;
    Bindings: Bindings;
};
