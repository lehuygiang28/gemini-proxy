import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { input, password, confirm } from '@inquirer/prompts';

import { colors } from './colors';
import { ErrorHandler } from './error-handler';
import { Logger } from './logger';

export interface Config {
    supabaseUrl: string;
    supabaseServiceRoleKey: string;
}

export class ConfigManager {
    private static CONFIG_DIR = join(process.cwd(), '.gproxy');
    private static CONFIG_FILE = join(this.CONFIG_DIR, 'config.json');

    static async getConfig(): Promise<Config> {
        try {
            // Try to load from .env first
            const envConfig = this.loadFromEnv();
            if (envConfig) {
                Logger.success('Loaded configuration from .env file');
                return envConfig;
            }

            // Try to load from saved config
            const savedConfig = this.loadFromFile();
            if (savedConfig) {
                Logger.success('Loaded configuration from saved settings');
                return savedConfig;
            }

            // Prompt user for configuration
            Logger.warn('Could not read saved configuration');
            return await this.promptForConfig();
        } catch (error) {
            Logger.error('Failed to get configuration', error);
            throw ErrorHandler.createError('Failed to load configuration', {
                code: 'CONFIG_LOAD_ERROR',
                exitCode: 1,
            });
        }
    }

    private static loadFromEnv(): Config | null {
        try {
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (supabaseUrl && supabaseServiceRoleKey) {
                console.log(colors.green('✓ Loaded configuration from .env file'));
                return { supabaseUrl, supabaseServiceRoleKey };
            }
        } catch (error) {
            console.log(colors.yellow('⚠ Could not read .env file'));
        }

        return null;
    }

    private static loadFromFile(): Config | null {
        try {
            if (existsSync(this.CONFIG_FILE)) {
                const content = readFileSync(this.CONFIG_FILE, 'utf-8');
                const config = JSON.parse(content) as Config;

                if (config.supabaseUrl && config.supabaseServiceRoleKey) {
                    console.log(colors.green('✓ Loaded configuration from saved settings'));
                    return config;
                }
            }
        } catch (error) {
            console.log(colors.yellow('⚠ Could not read saved configuration'));
        }

        return null;
    }

    private static async promptForConfig(): Promise<Config> {
        console.log(colors.blue('🔧 Gemini Proxy Configuration Setup'));
        console.log(colors.gray('Please provide your Supabase configuration:'));
        console.log('');

        const supabaseUrl = await input({
            message: 'Enter your Supabase URL:',
            validate: (value: string) => {
                if (!value.trim()) return 'Supabase URL is required';
                if (!value.startsWith('https://')) return 'Supabase URL must start with https://';
                return true;
            },
        });

        const supabaseServiceRoleKey = await password({
            message: 'Enter your Supabase Service Role Key:',
            validate: (value: string) => {
                if (!value.trim()) return 'Service Role Key is required';
                return true;
            },
        });

        const saveConfig = await confirm({
            message: 'Save this configuration for future use?',
            default: true,
        });

        const config: Config = {
            supabaseUrl: supabaseUrl.trim(),
            supabaseServiceRoleKey: supabaseServiceRoleKey.trim(),
        };

        if (saveConfig) {
            this.saveConfig(config);
            console.log(colors.green('✓ Configuration saved successfully'));
        }

        return config;
    }

    static async updateConfig(): Promise<void> {
        console.log(colors.blue('🔧 Update Gemini Proxy Configuration'));
        console.log('');

        const currentConfig = this.loadFromFile();
        const currentEnvConfig = this.loadFromEnv();

        if (currentEnvConfig) {
            console.log(colors.yellow('⚠ Configuration is currently loaded from .env file'));
            console.log(
                colors.yellow(
                    '   To update configuration, modify your .env file or use --force flag',
                ),
            );
            console.log('');

            const force = await confirm({
                message: 'Force update saved configuration (will override .env)?',
                default: false,
            });

            if (!force) {
                console.log(colors.gray('Configuration update cancelled'));
                return;
            }
        }

        const supabaseUrl = await input({
            message: 'Enter your Supabase URL:',
            default: currentConfig?.supabaseUrl || '',
            validate: (value: string) => {
                if (!value.trim()) return 'Supabase URL is required';
                if (!value.startsWith('https://')) return 'Supabase URL must start with https://';
                return true;
            },
        });

        const supabaseServiceRoleKey = await password({
            message: 'Enter your Supabase Service Role Key:',
            validate: (value: string) => {
                if (!value.trim()) return 'Service Role Key is required';
                return true;
            },
        });

        const config: Config = {
            supabaseUrl: supabaseUrl.trim(),
            supabaseServiceRoleKey: supabaseServiceRoleKey.trim(),
        };

        this.saveConfig(config);
        console.log(colors.green('✓ Configuration updated successfully'));
    }

    static showConfig(): void {
        const envConfig = this.loadFromEnv();
        const savedConfig = this.loadFromFile();

        console.log(colors.blue('🔧 Current Configuration'));
        console.log('');

        if (envConfig) {
            console.log(colors.green('Source: .env file'));
            console.log(`Supabase URL: ${this.maskUrl(envConfig.supabaseUrl)}`);
            console.log(`Service Role Key: ${this.maskKey(envConfig.supabaseServiceRoleKey)}`);
        } else if (savedConfig) {
            console.log(colors.green('Source: Saved configuration'));
            console.log(`Supabase URL: ${this.maskUrl(savedConfig.supabaseUrl)}`);
            console.log(`Service Role Key: ${this.maskKey(savedConfig.supabaseServiceRoleKey)}`);
        } else {
            console.log(colors.red('No configuration found'));
            console.log(colors.gray('Run "gproxy config setup" to configure'));
        }
    }

    static clearConfig(): void {
        try {
            if (existsSync(this.CONFIG_FILE)) {
                const fs = require('node:fs');
                fs.unlinkSync(this.CONFIG_FILE);
                console.log(colors.green('✓ Configuration cleared successfully'));
            } else {
                console.log(colors.yellow('No saved configuration found'));
            }
        } catch (error) {
            console.log(colors.red('Failed to clear configuration'));
        }
    }

    private static saveConfig(config: Config): void {
        try {
            // Ensure config directory exists
            if (!existsSync(this.CONFIG_DIR)) {
                mkdirSync(this.CONFIG_DIR, { recursive: true });
            }

            writeFileSync(this.CONFIG_FILE, JSON.stringify(config, null, 2));
        } catch (error) {
            console.log(colors.red('Failed to save configuration'));
            throw error;
        }
    }

    private static parseEnvFile(content: string): Record<string, string> {
        const envVars: Record<string, string> = {};

        content.split('\n').forEach((line) => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    envVars[key.trim()] = valueParts
                        .join('=')
                        .trim()
                        .replace(/^["']|["']$/g, '');
                }
            }
        });

        return envVars;
    }

    private static maskUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
        } catch {
            return url.substring(0, 20) + '...';
        }
    }

    private static maskKey(key: string): string {
        if (key.length <= 8) return '***';
        return key.substring(0, 4) + '...' + key.substring(key.length - 4);
    }
}
