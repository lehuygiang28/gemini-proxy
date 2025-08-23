import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import inquirer from 'inquirer';
import chalk from 'chalk';

export interface Config {
    supabaseUrl: string;
    supabaseServiceRoleKey: string;
}

export class ConfigManager {
    private static readonly CONFIG_DIR = join(process.cwd(), '.gproxy');
    private static readonly CONFIG_FILE = join(ConfigManager.CONFIG_DIR, 'config.json');
    private static readonly ENV_FILE = '.env';

    static async getConfig(): Promise<Config> {
        // Try to load from .env file first
        const envConfig = this.loadFromEnv();
        if (envConfig) {
            return envConfig;
        }

        // Try to load from saved config
        const savedConfig = this.loadFromFile();
        if (savedConfig) {
            return savedConfig;
        }

        // Prompt user for configuration
        return await this.promptForConfig();
    }

    private static loadFromEnv(): Config | null {
        try {
            const envPath = join(process.cwd(), this.ENV_FILE);
            if (!existsSync(envPath)) {
                return null;
            }

            const envContent = readFileSync(envPath, 'utf8');
            const envVars = this.parseEnvFile(envContent);

            const supabaseUrl = envVars.SUPABASE_URL;
            const supabaseServiceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

            if (supabaseUrl && supabaseServiceRoleKey) {
                console.log(chalk.green('✓ Loaded configuration from .env file'));
                return { supabaseUrl, supabaseServiceRoleKey };
            }
        } catch (error) {
            console.log(chalk.yellow('⚠ Could not read .env file'));
        }

        return null;
    }

    private static loadFromFile(): Config | null {
        try {
            if (!existsSync(this.CONFIG_FILE)) {
                return null;
            }

            const configContent = readFileSync(this.CONFIG_FILE, 'utf8');
            const config = JSON.parse(configContent) as Config;

            if (config.supabaseUrl && config.supabaseServiceRoleKey) {
                console.log(chalk.green('✓ Loaded configuration from saved settings'));
                return config;
            }
        } catch (error) {
            console.log(chalk.yellow('⚠ Could not read saved configuration'));
        }

        return null;
    }

    private static async promptForConfig(): Promise<Config> {
        console.log(chalk.blue('🔧 Gemini Proxy Configuration Setup'));
        console.log(chalk.gray('Please provide your Supabase configuration:'));
        console.log('');

        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'supabaseUrl',
                message: 'Enter your Supabase URL:',
                validate: (input) => {
                    if (!input.trim()) return 'Supabase URL is required';
                    if (!input.startsWith('https://'))
                        return 'Supabase URL must start with https://';
                    return true;
                },
            },
            {
                type: 'password',
                name: 'supabaseServiceRoleKey',
                message: 'Enter your Supabase Service Role Key:',
                validate: (input) => {
                    if (!input.trim()) return 'Service Role Key is required';
                    return true;
                },
            },
            {
                type: 'confirm',
                name: 'saveConfig',
                message: 'Save this configuration for future use?',
                default: true,
            },
        ]);

        const config: Config = {
            supabaseUrl: answers.supabaseUrl.trim(),
            supabaseServiceRoleKey: answers.supabaseServiceRoleKey.trim(),
        };

        if (answers.saveConfig) {
            this.saveConfig(config);
            console.log(chalk.green('✓ Configuration saved successfully'));
        }

        return config;
    }

    static async updateConfig(): Promise<void> {
        console.log(chalk.blue('🔧 Update Gemini Proxy Configuration'));
        console.log('');

        const currentConfig = this.loadFromFile();
        const currentEnvConfig = this.loadFromEnv();

        if (currentEnvConfig) {
            console.log(chalk.yellow('⚠ Configuration is currently loaded from .env file'));
            console.log(
                chalk.yellow(
                    '   To update configuration, modify your .env file or use --force flag',
                ),
            );
            console.log('');

            const { force } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'force',
                    message: 'Force update saved configuration (will override .env)?',
                    default: false,
                },
            ]);

            if (!force) {
                console.log(chalk.gray('Configuration update cancelled'));
                return;
            }
        }

        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'supabaseUrl',
                message: 'Enter your Supabase URL:',
                default: currentConfig?.supabaseUrl || '',
                validate: (input) => {
                    if (!input.trim()) return 'Supabase URL is required';
                    if (!input.startsWith('https://'))
                        return 'Supabase URL must start with https://';
                    return true;
                },
            },
            {
                type: 'password',
                name: 'supabaseServiceRoleKey',
                message: 'Enter your Supabase Service Role Key:',
                default: currentConfig?.supabaseServiceRoleKey || '',
                validate: (input) => {
                    if (!input.trim()) return 'Service Role Key is required';
                    return true;
                },
            },
        ]);

        const config: Config = {
            supabaseUrl: answers.supabaseUrl.trim(),
            supabaseServiceRoleKey: answers.supabaseServiceRoleKey.trim(),
        };

        this.saveConfig(config);
        console.log(chalk.green('✓ Configuration updated successfully'));
    }

    static showConfig(): void {
        const envConfig = this.loadFromEnv();
        const savedConfig = this.loadFromFile();

        console.log(chalk.blue('🔧 Current Configuration'));
        console.log('');

        if (envConfig) {
            console.log(chalk.green('Source: .env file'));
            console.log(`Supabase URL: ${this.maskUrl(envConfig.supabaseUrl)}`);
            console.log(`Service Role Key: ${this.maskKey(envConfig.supabaseServiceRoleKey)}`);
        } else if (savedConfig) {
            console.log(chalk.green('Source: Saved configuration'));
            console.log(`Supabase URL: ${this.maskUrl(savedConfig.supabaseUrl)}`);
            console.log(`Service Role Key: ${this.maskKey(savedConfig.supabaseServiceRoleKey)}`);
        } else {
            console.log(chalk.red('No configuration found'));
            console.log(chalk.gray('Run "gproxy config setup" to configure'));
        }
    }

    static clearConfig(): void {
        try {
            if (existsSync(this.CONFIG_FILE)) {
                const fs = require('node:fs');
                fs.unlinkSync(this.CONFIG_FILE);
                console.log(chalk.green('✓ Configuration cleared successfully'));
            } else {
                console.log(chalk.yellow('No saved configuration found'));
            }
        } catch (error) {
            console.log(chalk.red('Failed to clear configuration'));
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
            console.log(chalk.red('Failed to save configuration'));
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
