import { Context } from 'hono';
import { env } from 'hono/adapter';

export interface RetryConfig {
    maxRetries: number;
    retryDelayMs: number;
    backoffMultiplier: number;
}

export interface ProxyConfig {
    retry: RetryConfig;
    logging: {
        enabled: boolean;
        logLevel: 'debug' | 'info' | 'warn' | 'error';
    };
}

export class ConfigService {
    static getConfig(c: Context): ProxyConfig {
        const envVars = env(c);

        return {
            retry: {
                maxRetries: parseInt(envVars.PROXY_MAX_RETRIES || '-1'),
                retryDelayMs: parseInt(envVars.PROXY_RETRY_DELAY_MS || '0'), // Default to 0 for fast retries
                backoffMultiplier: parseFloat(envVars.PROXY_BACKOFF_MULTIPLIER || '1'), // Default to 1 (no backoff)
            },
            logging: {
                enabled: envVars.PROXY_LOGGING_ENABLED !== 'false',
                logLevel: (envVars.PROXY_LOG_LEVEL as any) || 'info',
            },
        };
    }

    static getRetryConfig(c: Context): RetryConfig {
        return this.getConfig(c).retry;
    }

    static getLoggingConfig(c: Context) {
        return this.getConfig(c).logging;
    }
}
