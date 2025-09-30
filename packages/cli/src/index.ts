#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import { apiKeysCommands } from './commands/api-keys';
import { proxyKeysCommands } from './commands/proxy-keys';
import { configCommands } from './commands/config';
import { logsCommands } from './commands/logs';
import { dbCommands } from './commands/db';
import { ErrorHandler } from './lib/error-handler';
import { Logger } from './lib/logger';
import packageJson from '../package.json' assert { type: 'json' };

const program = new Command();

program
    .name('gproxy')
    .description('CLI tool for managing Gemini Proxy API keys and proxy keys')
    .version(packageJson.version)
    .option('-v, --verbose', 'Enable verbose logging')
    .option('--debug', 'Enable debug mode');

// Global error handler
program.exitOverride();

// Add configuration commands
configCommands(program);

// Add API keys commands
apiKeysCommands(program);

// Add proxy keys commands
proxyKeysCommands(program);

// Add logs commands
logsCommands(program);

// Add db commands
dbCommands(program);

async function main(): Promise<void> {
    try {
        // Parse options first to set up logging
        const options = program.opts();

        // Set up logging based on options
        if (options.debug) {
            Logger.setLevel('DEBUG');
        } else if (options.verbose) {
            Logger.setVerbose(true);
        }

        Logger.debug('Starting Gemini Proxy CLI', { version: packageJson.version });

        await program.parseAsync();

        Logger.debug('CLI execution completed successfully');
    } catch (error) {
        ErrorHandler.handle(error, 'CLI execution failed');
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    ErrorHandler.handle(error, 'Uncaught exception');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
    ErrorHandler.handle(reason, 'Unhandled promise rejection');
});

main().catch((error) => {
    ErrorHandler.handle(error, 'Main function failed');
});
