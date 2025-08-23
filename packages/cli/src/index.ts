#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { apiKeysCommands } from './commands/api-keys.js';
import { proxyKeysCommands } from './commands/proxy-keys.js';
import { configCommands } from './commands/config.js';
import packageJson from '../package.json' assert { type: 'json' };

const program = new Command();

program
    .name('gproxy')
    .description('CLI tool for managing Gemini Proxy API keys and proxy keys')
    .version(packageJson.version);

// Add configuration commands
configCommands(program);

// Add API keys commands
apiKeysCommands(program);

// Add proxy keys commands
proxyKeysCommands(program);

// Global error handler
program.exitOverride();

async function main() {
    try {
        await program.parseAsync();
    } catch (err) {
        if (err instanceof Error) {
            console.error(chalk.red('Error:'), err.message);
        } else {
            console.error(chalk.red('An unexpected error occurred'));
        }
        process.exit(1);
    }
}

main();
