import type { PresetStatusColorType } from 'antd/es/_util/colors';
import { PROVIDERS } from '@/constants/providers';
import type { PerformanceMetrics, UsageMetadata } from '@gemini-proxy/database';

// Token formatting utilities
export const formatTokenCount = (count?: number): string => {
    if (count === null || count === undefined) {
        return `N/A`;
    }
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
};

export const formatDuration = (durationMs?: number): string => {
    if (durationMs === null || durationMs === undefined) {
        return `N/A`;
    }
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
export const formatJsonDisplay = (data: unknown): string => {
    if (!data) return '';

    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return data;
        }
    }

    if (typeof data === 'object' && data !== null) {
        return JSON.stringify(data, null, 2);
    }

    return String(data);
};

export const truncateText = (text: string, maxLength: number = 50): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

// Attempt count utilities
export const getAttemptCountColor = (attemptCount: number): string => {
    if (attemptCount === 1) return 'success';
    if (attemptCount <= 2) return 'warning';
    if (attemptCount <= 4) return 'orange';
    if (attemptCount <= 5) return 'volcano';
    if (attemptCount <= 10) return 'red';
    if (attemptCount <= 20) return 'magenta';
    return 'purple';
};

export const getAttemptCountSeverity = (attemptCount: number): string => {
    if (attemptCount === 1) return 'Success';
    if (attemptCount <= 2) return 'Minor Issue';
    if (attemptCount <= 4) return 'Moderate Issue';
    if (attemptCount <= 5) return 'High Issue';
    if (attemptCount <= 10) return 'Critical Issue';
    if (attemptCount <= 20) return 'Severe Issue';
    return 'Extreme Issue';
};

// Performance metrics utilities
export const extractPerformanceMetrics = (metrics: unknown): PerformanceMetrics => {
    if (!metrics || typeof metrics !== 'object' || metrics === null) {
        return { duration_ms: 0, total_response_time_ms: 0, attempt_count: 1 };
    }

    const metricsObj = metrics as Record<string, unknown>;
    return {
        duration_ms: (metricsObj?.duration_ms as number) || 0,
        total_response_time_ms: (metricsObj?.total_response_time_ms as number) || 0,
        attempt_count: (metricsObj?.attempt_count as number) || 1,
    };
};

// Usage metadata utilities
export const extractUsageMetadata = (metadata: unknown): UsageMetadata => {
    if (!metadata || typeof metadata !== 'object' || metadata === null) {
        return { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0, model: null };
    }

    const metadataObj = metadata as Record<string, unknown>;
    return {
        total_tokens: (metadataObj?.total_tokens as number) || 0,
        prompt_tokens: (metadataObj?.prompt_tokens as number) || 0,
        completion_tokens: (metadataObj?.completion_tokens as number) || 0,
        model: (metadataObj?.model as string) || null,
        response_id: (metadataObj?.response_id as string) || undefined,
        created: (metadataObj?.created as number) || undefined,
        id: (metadataObj?.id as string) || undefined,
        object: (metadataObj?.object as string) || undefined,
    };
};
