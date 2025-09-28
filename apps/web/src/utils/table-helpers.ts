/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PresetStatusColorType } from 'antd/es/_util/colors';
import { PROVIDERS } from '@/constants/providers';

// Token formatting utilities
export const formatTokenCount = (count: number): string => {
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
};

export const formatDuration = (durationMs: number): string => {
    if (durationMs < 1000) {
        return `${durationMs}ms`;
    }
    return `${(durationMs / 1000).toFixed(2)}s`;
};

// Status utilities
export const getStatusValue = (isActive: boolean): PresetStatusColorType => {
    return isActive ? 'success' : 'error';
};

export const getStatusText = (isActive: boolean): string => {
    return isActive ? 'Active' : 'Inactive';
};

// Provider utilities
export const getProviderColor = (provider: string): string => {
    return PROVIDERS[provider]?.color || 'default';
};

export const getProviderText = (provider: string): string => {
    return PROVIDERS[provider]?.label || provider;
};

// Request type utilities
export const getRequestType = (apiFormat: string): string => {
    switch (apiFormat) {
        case 'gemini':
            return 'Gemini';
        case 'openai':
            return 'OpenAI';
        default:
            return apiFormat;
    }
};

export const getRequestTypeColor = (apiFormat: string): string => {
    switch (apiFormat) {
        case 'gemini':
            return 'blue';
        case 'openai':
            return 'green';
        default:
            return 'default';
    }
};

// Success rate calculation
export const calculateSuccessRate = (successCount: number, failureCount: number): number => {
    const total = successCount + failureCount;
    return total > 0 ? Math.round((successCount / total) * 100) : 0;
};

// Clipboard utilities
export const copyToClipboard = (text: string): boolean => {
    try {
        navigator?.clipboard?.writeText(text);
        return true;
    } catch {
        return false;
    }
};

// Key masking utilities
export const maskSensitiveKey = (key: string, isRevealed: boolean): string => {
    if (isRevealed) {
        return key;
    }
    if (key.length <= 8) {
        return '*'.repeat(key.length);
    }
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
};

// Date formatting utilities
export const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
};

export const formatTime = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString();
};

// JSON display utilities
export const formatJsonDisplay = (data: any): string => {
    if (!data) return '';

    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return data;
        }
    }

    if (typeof data === 'object') {
        return JSON.stringify(data, null, 2);
    }

    return String(data);
};

export const truncateText = (text: string, maxLength: number = 50): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

// Performance metrics utilities
export const extractPerformanceMetrics = (
    metrics: any,
): {
    duration: number;
    attemptCount: number;
    responseTime?: number;
} => {
    if (!metrics || typeof metrics !== 'object') {
        return { duration: 0, attemptCount: 0 };
    }

    return {
        duration: metrics?.duration_ms || metrics?.duration || 0,
        attemptCount: metrics?.attempt_count || metrics?.attempts || 0,
        responseTime: metrics?.response_time || 0,
    };
};

// Usage metadata utilities
export const extractUsageMetadata = (
    metadata: any,
): {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    model?: string;
} => {
    if (!metadata || typeof metadata !== 'object') {
        return { totalTokens: 0, promptTokens: 0, completionTokens: 0 };
    }

    return {
        totalTokens: metadata?.total_tokens || metadata?.totalTokenCount || 0,
        promptTokens: metadata?.prompt_tokens || metadata?.promptTokenCount || 0,
        completionTokens: metadata?.completion_tokens || metadata?.candidatesTokenCount || 0,
        model: metadata?.model,
    };
};
