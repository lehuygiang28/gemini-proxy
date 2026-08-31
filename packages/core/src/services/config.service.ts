import { Context } from 'hono';
import { env } from 'hono/adapter';
import type { LoadBalanceStrategy } from '../types';

export interface RetryConfig {
    maxRetries: number;
    upstreamTimeoutMs: number;
    baseDelayMs: number;
    maxDelayMs: number;
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
    private static parseInteger(
        value: string | undefined,
        fallback: number,
        minimum?: number,
        maximum?: number,
    ): number {
        const parsedValue = Number.parseInt(value ?? '', 10);
        const validValue = Number.isFinite(parsedValue) ? parsedValue : fallback;
        return Math.min(maximum ?? Infinity, Math.max(minimum ?? -Infinity, validValue));
    }

    static getConfig(c: Context): ProxyConfig {
        const envVars = env(c);

        const strategyEnv = (envVars.PROXY_LOADBALANCE_STRATEGY || 'round_robin').toLowerCase();
        const strategy: LoadBalanceStrategy =
            strategyEnv === 'sticky_until_error' ? 'sticky_until_error' : 'round_robin';

        return {
            retry: {
                maxRetries: this.parseInteger(envVars.PROXY_MAX_RETRIES, -1),
                upstreamTimeoutMs: this.parseInteger(
                    envVars.PROXY_UPSTREAM_TIMEOUT_MS,
                    120_000,
                    1_000,
                    600_000,
                ),
                baseDelayMs: this.parseInteger(envVars.PROXY_RETRY_BASE_DELAY_MS, 200, 0),
                maxDelayMs: this.parseInteger(envVars.PROXY_RETRY_MAX_DELAY_MS, 5_000, 0),
            },
            logging: {
                enabled: envVars.PROXY_LOGGING_ENABLED !== 'false',
                logLevel:
                    (envVars.PROXY_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
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

    static getRedactJsonFields(c: Context): string[] {
        const envVars = env(c);
        const raw = envVars.PROXY_REDACT_JSON_FIELDS;
        if (!raw) {
            return [];
        }
        return String(raw)
            .split(',')
            .map((name) => name.trim())
            .filter((name) => name.length > 0);
    }
}
