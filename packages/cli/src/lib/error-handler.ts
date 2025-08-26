import { colors } from './colors';

export interface CliError extends Error {
    code?: string;
    exitCode?: number;
    showHelp?: boolean;
}

export class ErrorHandler {
    static handle(error: unknown, context?: string): never {
        const cliError = this.normalizeError(error, context);

        // Log the error
        console.error(colors.red('Error:'), cliError.message);

        // Show additional context if available
        if (context) {
            console.error(colors.gray(`Context: ${context}`));
        }

        // Show help if requested
        if (cliError.showHelp) {
            console.error(colors.yellow('\nUse --help for more information'));
        }

        // Exit with appropriate code
        process.exit(cliError.exitCode || 1);
    }

    static normalizeError(error: unknown, context?: string): CliError {
        if (error instanceof Error) {
            return {
                ...error,
                message: context ? `${context}: ${error.message}` : error.message,
                exitCode: 1,
            };
        }

        return {
            name: 'UnknownError',
            message: context ? `${context}: ${String(error)}` : String(error),
            exitCode: 1,
        };
    }

    static createError(message: string, options?: Partial<CliError>): CliError {
        return {
            name: 'CliError',
            message,
            exitCode: 1,
            ...options,
        };
    }

    static validateRequired(value: unknown, name: string): asserts value is string {
        if (!value || (typeof value === 'string' && !value.trim())) {
            throw this.createError(`${name} is required`);
        }
    }

    static validateUrl(url: string, name: string): void {
        try {
            new URL(url);
        } catch {
            throw this.createError(`${name} must be a valid URL`);
        }
    }

    static validateUuid(uuid: string, name: string): void {
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(uuid)) {
            throw this.createError(`${name} must be a valid UUID`);
        }
    }
}
