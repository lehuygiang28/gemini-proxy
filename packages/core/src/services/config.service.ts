import { Context } from 'hono';
import { env } from 'hono/adapter';

export interface RetryConfig {
    maxRetries: number;
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
