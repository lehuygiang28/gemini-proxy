import { Context } from 'hono';
import { env } from 'hono/adapter';
import type { LoadBalanceStrategy } from '../types';

export interface RetryConfig {
    maxRetries: number;
}

export interface ProxyConfig {
    retry: RetryConfig;
    logging: {
        enabled: boolean;
        logLevel: 'debug' | 'info' | 'warn' | 'error';
    };
    loadbalance: {
        strategy: LoadBalanceStrategy;
    };
}

export class ConfigService {
    static getConfig(c: Context): ProxyConfig {
        const envVars = env(c);

        const strategyEnv = (envVars.PROXY_LOADBALANCE_STRATEGY || 'round_robin').toLowerCase();
        const strategy: LoadBalanceStrategy =
            strategyEnv === 'sticky_until_error' ? 'sticky_until_error' : 'round_robin';

        return {
            retry: {
                maxRetries: parseInt(envVars.PROXY_MAX_RETRIES || '-1'), // -1 means retry all available API keys
            },
            logging: {
                enabled: envVars.PROXY_LOGGING_ENABLED !== 'false',
                logLevel: (envVars.PROXY_LOG_LEVEL as any) || 'info',
            },
            loadbalance: {
                strategy,
            },
        };
    }

    static getRetryConfig(c: Context): RetryConfig {
        return this.getConfig(c).retry;
    }

    static getLoggingConfig(c: Context) {
        return this.getConfig(c).logging;
    }

    static getLoadBalanceStrategy(c: Context): LoadBalanceStrategy {
        return this.getConfig(c).loadbalance.strategy;
    }
}
