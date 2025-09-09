/**
 * Enterprise-grade error handling utilities
 * Provides consistent error handling across the application
 */

export interface ServiceError {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
}

export class ErrorHandler {
    /**
     * Create a standardized service error
     */
    static createServiceError(code: string, message: string, details?: unknown): ServiceError {
        return {
            code,
            message,
            details,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Handle database errors with proper categorization
     */
    static handleDatabaseError(error: unknown): ServiceError {
        if (error instanceof Error) {
            // Check for specific Supabase error patterns
            if (error.message.includes('invalid input syntax')) {
                return this.createServiceError(
                    'INVALID_FILTER_SYNTAX',
                    'Invalid filter syntax provided. Please check your filter values.',
                    error.message,
                );
            }

            if (error.message.includes('permission denied')) {
                return this.createServiceError(
                    'PERMISSION_DENIED',
                    'You do not have permission to access this resource.',
                    error.message,
                );
            }

            if (error.message.includes('connection')) {
                return this.createServiceError(
                    'DATABASE_CONNECTION_ERROR',
                    'Unable to connect to the database. Please try again later.',
                    error.message,
                );
            }

            return this.createServiceError(
                'DATABASE_ERROR',
                'An unexpected database error occurred.',
                error.message,
            );
        }

        return this.createServiceError('UNKNOWN_ERROR', 'An unexpected error occurred.', error);
    }

    /**
     * Handle validation errors
     */
    static handleValidationError(errors: string[]): ServiceError {
        return this.createServiceError('VALIDATION_ERROR', 'Invalid input provided', errors);
    }

    /**
     * Handle network errors
     */
    static handleNetworkError(error: unknown): ServiceError {
        return this.createServiceError(
            'NETWORK_ERROR',
            'Network request failed. Please check your connection.',
            error,
        );
    }

    /**
     * Log error for debugging (in production, this would go to a logging service)
     */
    static logError(error: ServiceError, context?: string): void {
        console.error(`[${error.code}] ${error.message}`, {
            context,
            details: error.details,
            timestamp: error.timestamp,
        });
    }

    /**
     * Check if error is retryable
     */
    static isRetryableError(error: ServiceError): boolean {
        const retryableCodes = ['DATABASE_CONNECTION_ERROR', 'NETWORK_ERROR'];

        return retryableCodes.includes(error.code);
    }

    /**
     * Get user-friendly error message
     */
    static getUserFriendlyMessage(error: ServiceError): string {
        const userMessages: Record<string, string> = {
            INVALID_FILTER_SYNTAX: 'Please check your filter values and try again.',
            PERMISSION_DENIED: 'You do not have permission to perform this action.',
            DATABASE_CONNECTION_ERROR: 'Service temporarily unavailable. Please try again.',
            VALIDATION_ERROR: 'Please check your input and try again.',
            NETWORK_ERROR: 'Please check your internet connection and try again.',
            DATABASE_ERROR: 'An error occurred while processing your request.',
            UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
        };

        return userMessages[error.code] || error.message;
    }
}
