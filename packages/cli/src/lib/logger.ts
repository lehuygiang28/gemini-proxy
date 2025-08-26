import { colors } from './colors';

export interface LogLevel {
    ERROR: 0;
    WARN: 1;
    INFO: 2;
    DEBUG: 3;
}

export const LOG_LEVELS: LogLevel = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
} as const;

export class Logger {
    private static currentLevel: number = LOG_LEVELS.INFO;
    private static isVerbose = false;

    static setVerbose(verbose: boolean): void {
        this.isVerbose = verbose;
        this.currentLevel = verbose ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
    }

    static setLevel(level: keyof LogLevel): void {
        this.currentLevel = LOG_LEVELS[level];
    }

    static error(message: string, ...args: unknown[]): void {
        if (this.currentLevel >= LOG_LEVELS.ERROR) {
            console.error(colors.red('ERROR:'), message, ...args);
        }
    }

    static warn(message: string, ...args: unknown[]): void {
        if (this.currentLevel >= LOG_LEVELS.WARN) {
            console.warn(colors.yellow('WARN:'), message, ...args);
        }
    }

    static info(message: string, ...args: unknown[]): void {
        if (this.currentLevel >= LOG_LEVELS.INFO) {
            console.log(colors.blue('INFO:'), message, ...args);
        }
    }

    static debug(message: string, ...args: unknown[]): void {
        if (this.currentLevel >= LOG_LEVELS.DEBUG) {
            console.log(colors.gray('DEBUG:'), message, ...args);
        }
    }

    static success(message: string, ...args: unknown[]): void {
        if (this.currentLevel >= LOG_LEVELS.INFO) {
            console.log(colors.green('✓'), message, ...args);
        }
    }

    static failure(message: string, ...args: unknown[]): void {
        if (this.currentLevel >= LOG_LEVELS.ERROR) {
            console.log(colors.red('✗'), message, ...args);
        }
    }

    static table(data: unknown[]): void {
        if (this.currentLevel >= LOG_LEVELS.INFO) {
            console.table(data);
        }
    }

    static separator(): void {
        if (this.currentLevel >= LOG_LEVELS.INFO) {
            console.log(colors.gray('─'.repeat(50)));
        }
    }

    static header(title: string): void {
        if (this.currentLevel >= LOG_LEVELS.INFO) {
            console.log('\n' + colors.bold(colors.blue(title)));
            this.separator();
        }
    }
}
