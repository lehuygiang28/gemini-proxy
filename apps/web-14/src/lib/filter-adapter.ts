import type { CrudFilter } from '@refinedev/core';
import type { FilterState } from '@/components/common/advanced-filters';

/**
 * Clean, maintainable filter adapter for translating UI filters to Supabase queries
 * Handles complex JSON field filtering with proper type safety and edge case handling
 */

// Type definitions for better type safety
type FilterOperator = 'eq' | 'gte' | 'lte' | 'gt' | 'contains' | 'in' | 'ne';
type JsonFieldPath =
    | 'performance_metrics'
    | 'usage_metadata'
    | 'error_details'
    | 'retry_attempts'
    | 'response_data';

interface FilterCondition {
    field: string;
    operator: FilterOperator;
    value: unknown;
}

interface JsonFilterCondition {
    field: JsonFieldPath;
    path: string;
    operator: FilterOperator;
    value: unknown;
}

interface FilterValidationResult {
    isValid: boolean;
    errors: string[];
}

/**
 * Clean filter adapter with proper separation of concerns
 */
export class FilterAdapter {
    private static readonly MAX_DATE_RANGE_DAYS = 365;
    private static readonly MAX_SEARCH_TEXT_LENGTH = 255;

    /**
     * Convert FilterState to RefineDev CrudFilter format
     * Only handles basic filters that Supabase can process natively
     */
    static toRefineFilters(filters: FilterState): CrudFilter[] {
        const conditions: FilterCondition[] = [];

        // Basic filters
        this.addBasicFilters(filters, conditions);
        this.addDateFilters(filters, conditions);
        this.addTextFilters(filters, conditions);
        this.addIdFilters(filters, conditions);

        return conditions.map(this.toCrudFilter);
    }

    /**
     * Get JSON field filters that need special handling
     */
    static getJsonFilters(filters: FilterState): JsonFilterCondition[] {
        const conditions: JsonFilterCondition[] = [];

        this.addPerformanceFilters(filters, conditions);
        this.addUsageFilters(filters, conditions);
        this.addErrorFilters(filters, conditions);
        this.addRetryFilters(filters, conditions);
        this.addStatusCodeFilters(filters, conditions);

        return conditions;
    }

    /**
     * Validate filters with comprehensive error checking
     */
    static validateFilters(filters: FilterState): FilterValidationResult {
        const errors: string[] = [];

        this.validateDateRange(filters, errors);
        this.validateNumericRanges(filters, errors);
        this.validateSearchText(filters, errors);

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    // Private helper methods for better organization

    private static addBasicFilters(filters: FilterState, conditions: FilterCondition[]): void {
        // Status filter - use response_data.status for more accurate filtering
        if (filters.status !== 'all') {
            if (filters.status === 'success') {
                // Success: response_data.status is 200-299 or is_successful is true
                conditions.push({
                    field: 'is_successful',
                    operator: 'eq',
                    value: true,
                });
            } else if (filters.status === 'failed') {
                // Failed: response_data.status is not 200-299 or is_successful is false
                conditions.push({
                    field: 'is_successful',
                    operator: 'eq',
                    value: false,
                });
            }
        }

        if (filters.apiFormat !== 'all') {
            conditions.push({
                field: 'api_format',
                operator: 'eq',
                value: filters.apiFormat,
            });
        }

        if (filters.streamOnly !== null) {
            conditions.push({
                field: 'is_stream',
                operator: 'eq',
                value: filters.streamOnly,
            });
        }
    }

    private static addDateFilters(filters: FilterState, conditions: FilterCondition[]): void {
        if (filters.dateRange?.[0] && filters.dateRange?.[1]) {
            // Ensure dates are valid Dayjs objects
            const startDate = filters.dateRange[0];
            const endDate = filters.dateRange[1];

            if (startDate && endDate && startDate.isValid() && endDate.isValid()) {
                conditions.push(
                    {
                        field: 'created_at',
                        operator: 'gte',
                        value: startDate.toISOString(),
                    },
                    {
                        field: 'created_at',
                        operator: 'lte',
                        value: endDate.toISOString(),
                    },
                );
            }
        }
    }

    private static addTextFilters(filters: FilterState, conditions: FilterCondition[]): void {
        if (filters.searchText?.trim()) {
            conditions.push({
                field: 'request_id',
                operator: 'contains',
                value: filters.searchText.trim(),
            });
        }
    }

    private static addIdFilters(filters: FilterState, conditions: FilterCondition[]): void {
        const idFilters = [
            { key: 'userFilter' as const, field: 'user_id' },
            { key: 'proxyKeyFilter' as const, field: 'proxy_key_id' },
            { key: 'apiKeyFilter' as const, field: 'api_key_id' },
        ];

        idFilters.forEach(({ key, field }) => {
            const value = filters[key];
            if (value?.trim()) {
                conditions.push({
                    field,
                    operator: 'eq',
                    value: value.trim(),
                });
            }
        });
    }

    private static addPerformanceFilters(
        filters: FilterState,
        conditions: JsonFilterCondition[],
    ): void {
        const ranges = [
            { key: 'durationRange' as const, path: 'duration_ms' },
            { key: 'responseTimeRange' as const, path: 'response_time_ms' },
        ];

        ranges.forEach(({ key, path }) => {
            const range = filters[key];
            if (range[0] !== null) {
                conditions.push({
                    field: 'performance_metrics',
                    path,
                    operator: 'gte',
                    value: range[0],
                });
            }
            if (range[1] !== null) {
                conditions.push({
                    field: 'performance_metrics',
                    path,
                    operator: 'lte',
                    value: range[1],
                });
            }
        });
    }

    private static addUsageFilters(filters: FilterState, conditions: JsonFilterCondition[]): void {
        // Token range
        const tokenRange = filters.tokenRange;
        if (tokenRange[0] !== null) {
            conditions.push({
                field: 'usage_metadata',
                path: 'total_tokens',
                operator: 'gte',
                value: tokenRange[0],
            });
        }
        if (tokenRange[1] !== null) {
            conditions.push({
                field: 'usage_metadata',
                path: 'total_tokens',
                operator: 'lte',
                value: tokenRange[1],
            });
        }

        // Model filter
        if (filters.modelFilter.length > 0) {
            conditions.push({
                field: 'usage_metadata',
                path: 'model',
                operator: 'in',
                value: filters.modelFilter,
            });
        }
    }

    private static addErrorFilters(filters: FilterState, conditions: JsonFilterCondition[]): void {
        // Error types - filter by error_details.type
        if (filters.errorTypes.length > 0) {
            conditions.push({
                field: 'error_details',
                path: 'type',
                operator: 'in',
                value: filters.errorTypes,
            });
        }

        // Has errors filter - check if error_details exists
        if (filters.hasErrors !== null) {
            conditions.push({
                field: 'error_details',
                path: '',
                operator: filters.hasErrors ? 'ne' : 'eq',
                value: null,
            });
        }
    }

    private static addRetryFilters(filters: FilterState, conditions: JsonFilterCondition[]): void {
        // Retry status - use attempt_count from performance_metrics
        if (filters.retryStatus === 'with_retries') {
            conditions.push({
                field: 'performance_metrics',
                path: 'attempt_count',
                operator: 'gt',
                value: 1, // More than 1 attempt means retries occurred
            });
        } else if (filters.retryStatus === 'no_retries') {
            conditions.push({
                field: 'performance_metrics',
                path: 'attempt_count',
                operator: 'eq',
                value: 1, // Exactly 1 attempt means no retries
            });
        }

        // Attempt count range - use attempt_count from performance_metrics
        const attemptRange = filters.attemptCountRange;
        if (attemptRange[0] !== null) {
            conditions.push({
                field: 'performance_metrics',
                path: 'attempt_count',
                operator: 'gte',
                value: attemptRange[0], // Minimum attempts
            });
        }
        if (attemptRange[1] !== null) {
            conditions.push({
                field: 'performance_metrics',
                path: 'attempt_count',
                operator: 'lte',
                value: attemptRange[1], // Maximum attempts
            });
        }

        // Retry severity - filter by attempt count ranges using performance_metrics
        if (filters.retrySeverity.length > 0) {
            const severityMap = this.getSeverityAttemptMap();
            filters.retrySeverity.forEach((severity) => {
                const attemptCount = severityMap[severity];
                if (attemptCount !== undefined) {
                    conditions.push({
                        field: 'performance_metrics',
                        path: 'attempt_count',
                        operator: 'eq',
                        value: attemptCount,
                    });
                }
            });
        }
    }

    private static addStatusCodeFilters(
        filters: FilterState,
        conditions: JsonFilterCondition[],
    ): void {
        // Status code filter from response_data.status
        if (filters.statusCodes.length > 0) {
            conditions.push({
                field: 'response_data',
                path: 'status',
                operator: 'in',
                value: filters.statusCodes,
            });
        }
    }

    private static getSeverityAttemptMap(): Record<string, number> {
        return {
            success: 1,
            minor: 2,
            moderate: 3,
            high: 5,
            critical: 8,
            severe: 15,
            extreme: 25,
        };
    }

    private static validateDateRange(filters: FilterState, errors: string[]): void {
        if (filters.dateRange?.[0] && filters.dateRange?.[1]) {
            const [start, end] = filters.dateRange;

            if (start.isAfter(end)) {
                errors.push('Start date cannot be after end date');
            }

            const daysDiff = end.diff(start, 'days');
            if (daysDiff > this.MAX_DATE_RANGE_DAYS) {
                errors.push(
                    `Date range cannot exceed ${this.MAX_DATE_RANGE_DAYS} days for performance reasons`,
                );
            }
        }
    }

    private static validateNumericRanges(filters: FilterState, errors: string[]): void {
        const ranges = [
            { key: 'durationRange' as const, name: 'duration' },
            { key: 'tokenRange' as const, name: 'token count' },
            { key: 'responseTimeRange' as const, name: 'response time' },
            { key: 'attemptCountRange' as const, name: 'attempt count' },
        ];

        ranges.forEach(({ key, name }) => {
            const range = filters[key];
            if (range[0] !== null && range[1] !== null && range[0] > range[1]) {
                errors.push(`Minimum ${name} cannot be greater than maximum ${name}`);
            }
        });
    }

    private static validateSearchText(filters: FilterState, errors: string[]): void {
        if (filters.searchText && filters.searchText.length > this.MAX_SEARCH_TEXT_LENGTH) {
            errors.push(`Search text cannot exceed ${this.MAX_SEARCH_TEXT_LENGTH} characters`);
        }
    }

    private static toCrudFilter(condition: FilterCondition): CrudFilter {
        return {
            field: condition.field,
            operator: condition.operator,
            value: condition.value,
        };
    }
}
