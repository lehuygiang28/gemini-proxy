import { Command } from 'commander';
import { colors } from '../lib/colors';
import { input, password, select, confirm } from '@inquirer/prompts';
import ora from 'ora';
import { ApiKeysManager } from '../lib/api-keys';
import { EnvParser } from '../lib/env-parser';
import { Validation } from '../lib/validation';
import { ErrorHandler } from '../lib/error-handler';
import { Logger } from '../lib/logger';
import { join } from 'node:path';

export function apiKeysCommands(program: Command) {
    const apiKeys = program.command('api-keys').description('Manage Gemini API keys').alias('ak');

    // Interactive list with selection
    apiKeys
        .command('list')
        .description('List all API keys with interactive selection')
        .alias('ls')
        .option('-c, --compact', 'Show compact format')
        .option('-i, --interactive', 'Interactive mode for editing')
        .action(async (options) => {
            const spinner = ora('Fetching API keys...').start();
            try {
                const keys = await ApiKeysManager.list();
                spinner.succeed(`Found ${keys.length} API key(s)`);

                if (keys.length === 0) {
                    console.log(
                        colors.yellow(
                            'No API keys found. Use "gproxy api-keys create" to add one.',
                        ),
                    );
                    return;
                }

                if (options.compact) {
                    console.log('\n' + colors.bold('API Keys (Compact):'));
                    keys.forEach((key, index) => {
                        console.log(`${index + 1}. ${ApiKeysManager.formatApiKeyCompact(key)}`);
                    });
                } else {
                    console.log('\n' + colors.bold('API Keys:'));
                    keys.forEach((key) => {
                        console.log(ApiKeysManager.formatApiKey(key));
                    });
                }

                if (options.interactive) {
                    await interactiveEdit(keys);
                }
            } catch (error) {
                spinner.fail('Failed to fetch API keys');
                throw error;
            }
        });

    // Quick create with minimal prompts
    apiKeys
        .command('create')
        .description('Create a new API key')
        .option('-n, --name <name>', 'API key name')
        .option('-k, --key <key>', 'API key value')
        .option('-p, --provider <provider>', 'Provider (default: gemini)')
        .option('-u, --user-id <userId>', 'User ID')
        .option('-q, --quick', 'Quick mode with minimal prompts')
        .action(async (options) => {
            const name = await input({
                message: 'Enter API key name:',
                default: options.name,
                validate: (input: string) => {
                    try {
                        Validation.validateApiKeyName(input);
                        return true;
                    } catch (error) {
                        return error instanceof Error ? error.message : 'Invalid name';
                    }
                },
            });

            const apiKeyValue = await password({
                message: 'Enter API key value:',
                validate: (input: string) => {
                    try {
                        Validation.validateApiKeyValue(input);
                        return true;
                    } catch (error) {
                        return error instanceof Error ? error.message : 'Invalid API key value';
                    }
                },
            });

            let provider = 'gemini';
            let userId = options.userId;

            if (!options.quick) {
                provider = await input({
                    message: 'Enter provider (currently only gemini is supported):',
                    default: 'gemini',
                    validate: (input: string) => {
                        try {
                            Validation.validateProvider(input);
                            return true;
                        } catch (error) {
                            return error instanceof Error ? error.message : 'Invalid provider';
                        }
                    },
                });

                userId = await input({
                    message: 'Enter user ID (optional):',
                    default: options.userId,
                    validate: (input: string) => {
                        if (!input.trim()) return true; // Optional
                        try {
                            Validation.validateUserId(input);
                            return true;
                        } catch (error) {
                            return error instanceof Error ? error.message : 'Invalid user ID';
                        }
                    },
                });
            }

            const spinner = ora('Creating API key...').start();
            try {
                const apiKey = await ApiKeysManager.create({
                    name: name,
                    api_key_value: apiKeyValue,
                    provider: provider,
                    user_id: userId || null,
                    is_active: true,
                    success_count: 0,
                    failure_count: 0,
                });

                spinner.succeed('API key created successfully');
                console.log('\n' + colors.green('Created API Key:'));
                console.log(ApiKeysManager.formatApiKey(apiKey));
            } catch (error) {
                spinner.fail('Failed to create API key');
                throw error;
            }
        });

    // Quick edit by selection
    apiKeys
        .command('edit')
        .description('Edit API key interactively')
        .action(async () => {
            const keys = await ApiKeysManager.list();
            if (keys.length === 0) {
                console.log(colors.yellow('No API keys found to edit.'));
                return;
            }

            await interactiveEdit(keys);
        });

    // Export to JSON file
    apiKeys
        .command('export')
        .description('Export API keys to JSON file')
        .option('-o, --output <file>', 'Output file path', 'api-keys-export.json')
        .action(async (options) => {
            try {
                Validation.validateFilePath(options.output);

                const spinner = ora('Exporting API keys...').start();
                await ApiKeysManager.exportToFile(options.output);
                spinner.succeed(`Exported API keys to ${options.output}`);
                Logger.success(`API keys exported to ${options.output}`);
            } catch (error) {
                Logger.error('Failed to export API keys', error);
                throw ErrorHandler.createError('Failed to export API keys', {
                    code: 'EXPORT_ERROR',
                    exitCode: 1,
                });
            }
        });

    // Import from JSON file
    apiKeys
        .command('import')
        .description('Import API keys from JSON file')
        .argument('<file>', 'JSON file to import from')
        .option('-o, --overwrite', 'Overwrite existing keys')
        .option('-s, --skip-duplicates', 'Skip duplicate keys')
        .option('-d, --dry-run', 'Show what would be imported without actually importing')
        .action(async (file, options) => {
            try {
                Validation.validateFilePath(file);

                const spinner = ora('Importing API keys...').start();
                const results = await ApiKeysManager.importFromFile(file, {
                    overwrite: options.overwrite,
                    skipDuplicates: options.skipDuplicates,
                    dryRun: options.dryRun,
                });

                spinner.succeed('Import completed');
                Logger.success('API keys import completed');

                console.log(`\n📊 Import Results:`);
                console.log(`  • Created: ${results.created} key(s)`);
                console.log(`  • Updated: ${results.updated} key(s)`);
                console.log(`  • Skipped: ${results.skipped} key(s)`);

                if (results.errors.length > 0) {
                    console.log(`\n❌ Errors:`);
                    results.errors.forEach((error) => console.log(`  • ${error}`));
                }
            } catch (error) {
                Logger.error('Failed to import API keys', error);
                throw ErrorHandler.createError('Failed to import API keys', {
                    code: 'IMPORT_ERROR',
                    exitCode: 1,
                });
            }
        });

    // Prune inactive keys
    apiKeys
        .command('prune')
        .description('Remove inactive API keys')
        .option('-f, --force', 'Skip confirmation')
        .action(async (options) => {
            const spinner = ora('Checking for inactive API keys...').start();
            try {
                const inactiveKeys = await ApiKeysManager.list();
                const inactive = inactiveKeys.filter((key) => !key.is_active);

                if (inactive.length === 0) {
                    spinner.succeed('No inactive API keys found');
                    return;
                }

                spinner.succeed(`Found ${inactive.length} inactive API key(s)`);

                if (!options.force) {
                    console.log('\nInactive API keys:');
                    inactive.forEach((key) => {
                        console.log(`  • ${key.name} (${key.id})`);
                    });

                    const confirmed = await confirm({
                        message: `Delete ${inactive.length} inactive API key(s)?`,
                        default: false,
                    });

                    if (!confirmed) {
                        console.log(colors.yellow('Operation cancelled'));
                        return;
                    }
                }

                const deleteSpinner = ora('Deleting inactive API keys...').start();
                const deletedCount = await ApiKeysManager.pruneInactive();
                deleteSpinner.succeed(`Deleted ${deletedCount} inactive API key(s)`);
            } catch (error) {
                spinner.fail('Failed to prune API keys');
                throw error;
            }
        });

    // Sync from .env (improved)
    apiKeys
        .command('sync')
        .description('Sync API keys from .env file to database')
        .option('-f, --force', 'Skip confirmation for deletions')
        .option('-d, --dry-run', 'Show what would be synced without actually syncing')
        .action(async (options) => {
            const spinner = ora('Syncing API keys from .env...').start();

            try {
                const { gemini: envKeys } = EnvParser.getApiKeysFromEnv();

                if (envKeys.length === 0) {
                    spinner.info('No GEMINI_API_KEY found in environment variables');
                    return;
                }

                spinner.text = `Found ${envKeys.length} API key(s) in .env file`;

                const existingKeys = await ApiKeysManager.list();
                const keysToCreate: typeof envKeys = [];
                const keysToUpdate: Array<{ envKey: (typeof envKeys)[0]; dbKey: any }> = [];
                const keysToDelete: typeof existingKeys = [];

                // Find keys to create or update
                for (const envKey of envKeys) {
                    const existingKey = existingKeys.find(
                        (dbKey) => dbKey.api_key_value === envKey.key || dbKey.name === envKey.name,
                    );

                    if (!existingKey) {
                        keysToCreate.push(envKey);
                    } else if (existingKey.name !== envKey.name) {
                        keysToUpdate.push({ envKey, dbKey: existingKey });
                    }
                }

                // Find keys to delete
                for (const dbKey of existingKeys) {
                    const envKey = envKeys.find(
                        (envKey) =>
                            envKey.key === dbKey.api_key_value || envKey.name === dbKey.name,
                    );

                    if (!envKey) {
                        keysToDelete.push(dbKey);
                    }
                }

                spinner.succeed(`Sync analysis complete`);
                console.log(`\n📊 Sync Summary:`);
                console.log(`  • Create: ${keysToCreate.length} key(s)`);
                console.log(`  • Update: ${keysToUpdate.length} key(s)`);
                console.log(`  • Delete: ${keysToDelete.length} key(s)`);

                if (
                    keysToCreate.length === 0 &&
                    keysToUpdate.length === 0 &&
                    keysToDelete.length === 0
                ) {
                    console.log(`\n✅ Database is already in sync with .env file`);
                    return;
                }

                if (options.dryRun) {
                    console.log(`\n🔍 Dry run - no changes will be made`);
                    return;
                }

                if (keysToDelete.length > 0 && !options.force) {
                    console.log(`\n⚠️  The following keys will be deleted:`);
                    keysToDelete.forEach((key) => {
                        console.log(`  • ${key.name} (${key.id})`);
                    });

                    const confirmed = await confirm({
                        message: 'Are you sure you want to proceed with deletions?',
                        default: false,
                    });

                    if (!confirmed) {
                        console.log('Sync cancelled');
                        return;
                    }
                }

                const syncSpinner = ora('Performing sync operations...').start();

                try {
                    // Create new keys in batch
                    if (keysToCreate.length > 0) {
                        syncSpinner.text = `Creating ${keysToCreate.length} new API key(s)...`;
                        const createData = keysToCreate.map((envKey) => ({
                            name: envKey.name,
                            api_key_value: envKey.key,
                            provider: 'gemini',
                            is_active: true,
                            success_count: 0,
                            failure_count: 0,
                        }));
                        await ApiKeysManager.bulkCreate(createData);
                    }

                    // Update existing keys in batch
                    if (keysToUpdate.length > 0) {
                        syncSpinner.text = `Updating ${keysToUpdate.length} existing API key(s)...`;
                        const updateData = keysToUpdate.map(({ envKey, dbKey }) => ({
                            id: dbKey.id,
                            updates: { name: envKey.name },
                        }));
                        await ApiKeysManager.bulkUpdate(updateData);
                    }

                    // Delete keys not in .env in batch
                    if (keysToDelete.length > 0) {
                        syncSpinner.text = `Deleting ${keysToDelete.length} API key(s)...`;
                        const deleteIds = keysToDelete.map((dbKey) => dbKey.id);
                        await ApiKeysManager.bulkDelete(deleteIds);
                    }

                    syncSpinner.succeed('Sync completed successfully');
                    console.log(`\n✅ Sync Results:`);
                    console.log(`  • Created: ${keysToCreate.length} key(s)`);
                    console.log(`  • Updated: ${keysToUpdate.length} key(s)`);
                    console.log(`  • Deleted: ${keysToDelete.length} key(s)`);
                } catch (error) {
                    syncSpinner.fail('Sync failed');
                    throw error;
                }
            } catch (error) {
                spinner.fail('Failed to sync API keys');
                throw error;
            }
        });

    // Legacy commands for backward compatibility
    apiKeys
        .command('get <id>')
        .description('Get API key by ID')
        .action(async (id) => {
            const spinner = ora('Fetching API key...').start();
            try {
                const apiKey = await ApiKeysManager.getById(id);
                if (!apiKey) {
                    spinner.fail('API key not found');
                    return;
                }

                spinner.succeed('API key fetched successfully');
                console.log('\n' + colors.green('API Key Details:'));
                console.log(ApiKeysManager.formatApiKey(apiKey));
            } catch (error) {
                spinner.fail('Failed to fetch API key');
                throw error;
            }
        });

    apiKeys
        .command('update <id>')
        .description('Update an API key')
        .option('-n, --name <name>', 'New name')
        .option('-k, --key <key>', 'New API key value')
        .option('-p, --provider <provider>', 'New provider')
        .action(async (id, options) => {
            const current = await ApiKeysManager.getById(id);
            if (!current) {
                throw new Error('API key not found');
            }

            const name = await input({
                message: 'Enter new name:',
                default: options.name || current.name,
            });

            const apiKeyValue = await password({
                message: 'Enter new API key value (leave empty to keep current):',
            });

            const provider = await input({
                message: 'Enter new provider (currently only gemini is supported):',
                default: 'gemini',
            });

            const updates: any = {
                name: name,
                provider: provider,
            };

            if (apiKeyValue) {
                updates.api_key_value = apiKeyValue;
            }

            const spinner = ora('Updating API key...').start();
            try {
                const apiKey = await ApiKeysManager.update(id, updates);
                spinner.succeed('API key updated successfully');
                console.log('\n' + colors.green('Updated API Key:'));
                console.log(ApiKeysManager.formatApiKey(apiKey));
            } catch (error) {
                spinner.fail('Failed to update API key');
                throw error;
            }
        });

    apiKeys
        .command('delete <id>')
        .description('Delete an API key')
        .option('-f, --force', 'Skip confirmation')
        .action(async (id, options) => {
            const apiKey = await ApiKeysManager.getById(id);
            if (!apiKey) {
                throw new Error('API key not found');
            }

            if (!options.force) {
                const confirmed = await confirm({
                    message: `Are you sure you want to delete API key "${apiKey.name}"?`,
                    default: false,
                });

                if (!confirmed) {
                    console.log(colors.yellow('Operation cancelled'));
                    return;
                }
            }

            const spinner = ora('Deleting API key...').start();
            try {
                await ApiKeysManager.delete(id);
                spinner.succeed('API key deleted successfully');
            } catch (error) {
                spinner.fail('Failed to delete API key');
                throw error;
            }
        });

    apiKeys
        .command('toggle <id>')
        .description('Toggle API key active status')
        .action(async (id) => {
            const spinner = ora('Toggling API key status...').start();
            try {
                const apiKey = await ApiKeysManager.toggleActive(id);
                spinner.succeed(
                    `API key ${apiKey.is_active ? 'activated' : 'deactivated'} successfully`,
                );
                console.log('\n' + colors.green('Updated API Key:'));
                console.log(ApiKeysManager.formatApiKey(apiKey));
            } catch (error) {
                spinner.fail('Failed to toggle API key status');
                throw error;
            }
        });
}

async function interactiveEdit(keys: any[]) {
    const selectedKey = await select({
        message: 'Select an API key to edit:',
        choices: keys.map((key) => ({
            name: ApiKeysManager.formatApiKeyCompact(key),
            value: key,
        })),
    });

    const action = await select({
        message: `What would you like to do with "${selectedKey.name}"?`,
        choices: [
            { name: 'Edit details', value: 'edit' },
            { name: 'Toggle active status', value: 'toggle' },
            { name: 'Delete', value: 'delete' },
            { name: 'Cancel', value: 'cancel' },
        ],
    });

    switch (action) {
        case 'edit':
            await editApiKey(selectedKey);
            break;
        case 'toggle':
            await toggleApiKey(selectedKey);
            break;
        case 'delete':
            await deleteApiKey(selectedKey);
            break;
        case 'cancel':
            console.log(colors.yellow('Operation cancelled'));
            break;
    }
}

async function editApiKey(apiKey: any) {
    const name = await input({
        message: 'Enter new name:',
        default: apiKey.name,
    });

    const apiKeyValue = await password({
        message: 'Enter new API key value (leave empty to keep current):',
    });

    const provider = await input({
        message: 'Enter new provider (currently only gemini is supported):',
        default: 'gemini',
    });

    const updates: any = {
        name: name,
        provider: provider,
    };

    if (apiKeyValue) {
        updates.api_key_value = apiKeyValue;
    }

    const spinner = ora('Updating API key...').start();
    try {
        const updatedKey = await ApiKeysManager.update(apiKey.id, updates);
        spinner.succeed('API key updated successfully');
        console.log('\n' + colors.green('Updated API Key:'));
        console.log(ApiKeysManager.formatApiKey(updatedKey));
    } catch (error) {
        spinner.fail('Failed to update API key');
        throw error;
    }
}

async function toggleApiKey(apiKey: any) {
    const spinner = ora('Toggling API key status...').start();
    try {
        const updatedKey = await ApiKeysManager.toggleActive(apiKey.id);
        spinner.succeed(
            `API key ${updatedKey.is_active ? 'activated' : 'deactivated'} successfully`,
        );
        console.log('\n' + colors.green('Updated API Key:'));
        console.log(ApiKeysManager.formatApiKey(updatedKey));
    } catch (error) {
        spinner.fail('Failed to toggle API key status');
        throw error;
    }
}

async function deleteApiKey(apiKey: any) {
    const confirmed = await confirm({
        message: `Are you sure you want to delete API key "${apiKey.name}"?`,
        default: false,
    });

    if (!confirmed) {
        console.log(colors.yellow('Operation cancelled'));
        return;
    }

    const spinner = ora('Deleting API key...').start();
    try {
        await ApiKeysManager.delete(apiKey.id);
        spinner.succeed('API key deleted successfully');
    } catch (error) {
        spinner.fail('Failed to delete API key');
        throw error;
    }
}
