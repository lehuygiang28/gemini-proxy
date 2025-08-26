import { ErrorHandler } from './error-handler';

export class Validation {
    static validateApiKeyName(name: string): void {
        ErrorHandler.validateRequired(name, 'API key name');

        if (name.length < 1 || name.length > 100) {
            throw ErrorHandler.createError('API key name must be between 1 and 100 characters');
        }

        if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
            throw ErrorHandler.createError(
                'API key name can only contain letters, numbers, spaces, hyphens, and underscores',
            );
        }
    }

    static validateApiKeyValue(key: string): void {
        ErrorHandler.validateRequired(key, 'API key value');

        if (key.length < 10) {
            throw ErrorHandler.createError('API key value must be at least 10 characters long');
        }
    }

    static validateProvider(provider: string): void {
        ErrorHandler.validateRequired(provider, 'Provider');

        const validProviders = ['gemini'];
        if (!validProviders.includes(provider.toLowerCase())) {
            throw ErrorHandler.createError(`Provider must be: ${validProviders.join(', ')}`);
        }
    }

    static validateProxyKeyId(keyId: string): void {
        ErrorHandler.validateRequired(keyId, 'Proxy key ID');

        if (keyId.length < 5 || keyId.length > 50) {
            throw ErrorHandler.createError('Proxy key ID must be between 5 and 50 characters');
        }

        if (!/^[a-zA-Z0-9\-_]+$/.test(keyId)) {
            throw ErrorHandler.createError(
                'Proxy key ID can only contain letters, numbers, hyphens, and underscores',
            );
        }
    }

    static validateUserId(userId: string): void {
        if (!userId) return; // Optional

        ErrorHandler.validateUuid(userId, 'User ID');
    }

    static validateLimit(limit: string): number {
        const num = parseInt(limit, 10);
        if (isNaN(num) || num < 1 || num > 1000) {
            throw ErrorHandler.createError('Limit must be a number between 1 and 1000');
        }
        return num;
    }

    static validateDays(days: string): number {
        const num = parseInt(days, 10);
        if (isNaN(num) || num < 1 || num > 365) {
            throw ErrorHandler.createError('Days must be a number between 1 and 365');
        }
        return num;
    }

    static validateFilePath(filePath: string): void {
        ErrorHandler.validateRequired(filePath, 'File path');

        if (!filePath.endsWith('.json')) {
            throw ErrorHandler.createError('File path must end with .json');
        }
    }
}
