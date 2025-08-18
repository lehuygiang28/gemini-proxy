export interface ProxyErrorData {
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
    status?: number;
}

// Base ProxyError class
export class ProxyError extends Error {
    public type: ProxyErrorData['type'];
    public code?: string;
    public details?: any;
    public retryable: boolean;
    public status?: number;

    constructor(
        message: string,
        type: ProxyErrorData['type'] = 'unknown',
        status?: number,
        code?: string,
        details?: any,
        retryable: boolean = true,
    ) {
        super(message);
        this.name = 'ProxyError';
        this.type = type;
        this.status = status;
        this.code = code;
        this.details = details;
        this.retryable = retryable;
    }
}

// Custom error classes
export class RateLimitError extends ProxyError {
    constructor(
        message: string,
        public retryAfter?: number,
    ) {
        super(message, 'rate_limit', 429, undefined, undefined, true);
        this.name = 'RateLimitError';
    }
}

export class InvalidKeyError extends ProxyError {
    constructor(message: string) {
        super(message, 'invalid_key', 401, undefined, undefined, true);
        this.name = 'InvalidKeyError';
    }
}

export class ServerError extends ProxyError {
    constructor(
        message: string,
        public statusCode?: number,
    ) {
        super(message, 'server_error', statusCode, undefined, undefined, true);
        this.name = 'ServerError';
    }
}

export class NetworkError extends ProxyError {
    constructor(message: string) {
        super(message, 'network_error', undefined, undefined, undefined, true);
        this.name = 'NetworkError';
    }
}

export class ValidationError extends ProxyError {
    constructor(message: string) {
        super(message, 'validation_error', 400, undefined, undefined, false);
        this.name = 'ValidationError';
    }
}

export class KeySelectionError extends ProxyError {
    constructor(message: string) {
        super(message, 'unknown', undefined, undefined, undefined, false);
        this.name = 'KeySelectionError';
    }
}
