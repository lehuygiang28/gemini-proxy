import { Command } from 'commander';
import { colors } from '../lib/colors';
import { input, confirm, select } from '@inquirer/prompts';
import ora from 'ora';
import { ProxyKeysManager } from '../lib/proxy-keys';
import { EnvParser } from '../lib/env-parser';
import { Validation } from '../lib/validation';
import { ErrorHandler } from '../lib/error-handler';
import { Logger } from '../lib/logger';

export function proxyKeysCommands(program: Command) {
    const proxyKeys = program
        .command('proxy-keys')
        .description('Manage proxy API keys')
        .alias('pk');

    // Interactive list with selection
    proxyKeys
        .command('list')
        .description('List all proxy API keys with interactive selection')
        .alias('ls')
        .option('-c, --compact', 'Show compact format')
        .option('-i, --interactive', 'Interactive mode for editing')
        .action(async (options) => {
            const spinner = ora('Fetching proxy API keys...').start();
            try {
                const keys = await ProxyKeysManager.list();
                spinner.succeed(`Found ${keys.length} proxy API key(s)`);

                if (keys.length === 0) {
                    console.log(
                        colors.yellow(
                            'No proxy API keys found. Use "gproxy proxy-keys create" to add one.',
                        ),
                    );
                    return;
                }

                if (options.compact) {
                    console.log('\n' + colors.bold('Proxy API Keys (Compact):'));
                    keys.forEach((key, index) => {
                        console.log(`${index + 1}. ${ProxyKeysManager.formatProxyKeyCompact(key)}`);
                    });
                } else {
                    console.log('\n' + colors.bold('Proxy API Keys:'));
                    keys.forEach((key) => {
                        console.log(ProxyKeysManager.formatProxyKey(key));
                    });
                }

                if (options.interactive) {
                    await interactiveEdit(keys);
                }
            } catch (error) {
                spinner.fail('Failed to fetch proxy API keys');
                throw error;
            }
        });

    // Quick create with minimal prompts
    proxyKeys
        .command('create')
        .description('Create a new proxy API key')
        .option('-n, --name <name>', 'Proxy key name')
        .option('-k, --key-id <keyId>', 'Custom key ID (auto-generated if not provided)')
        .option('-u, --user-id <userId>', 'User ID')
        .option('-q, --quick', 'Quick mode with minimal prompts')
        .action(async (options) => {
            const name = await input({
                message: 'Enter proxy key name:',
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

            const keyId = await input({
                message: 'Enter custom key ID (leave empty for auto-generation):',
                default: options.keyId || ProxyKeysManager.generateKeyId(),
                validate: (input: string) => {
                    if (!input.trim()) return true; // Auto-generation
                    try {
                        Validation.validateProxyKeyId(input);
                        return true;
                    } catch (error) {
                        return error instanceof Error ? error.message : 'Invalid key ID';
                    }
                },
            });

            let userId = options.userId;
            if (!options.quick) {
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

            const spinner = ora('Creating proxy API key...').start();
            try {
                const proxyKey = await ProxyKeysManager.create({
                    name: name,
                    key_id: keyId,
                    user_id: userId || null,
                    is_active: true,
                    success_count: 0,
                    failure_count: 0,
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0,
                });

                spinner.succeed('Proxy API key created successfully');
                console.log('\n' + colors.green('Created Proxy API Key:'));
                console.log(ProxyKeysManager.formatProxyKey(proxyKey));
                console.log(
                    colors.cyan('\nUse this key ID in your API requests:'),
                    colors.bold(proxyKey.key_id),
                );
            } catch (error) {
                spinner.fail('Failed to create proxy API key');
                throw error;
            }
        });

    // Quick edit by selection
    proxyKeys
        .command('edit')
        .description('Edit proxy API key interactively')
        .action(async () => {
            const keys = await ProxyKeysManager.list();
            if (keys.length === 0) {
                console.log(colors.yellow('No proxy API keys found to edit.'));
                return;
            }

            await interactiveEdit(keys);
        });

    // Export to JSON file
    proxyKeys
        .command('export')
        .description('Export proxy API keys to JSON file')
        .option('-o, --output <file>', 'Output file path', 'proxy-keys-export.json')
        .action(async (options) => {
            try {
                Validation.validateFilePath(options.output);

                const spinner = ora('Exporting proxy API keys...').start();
                await ProxyKeysManager.exportToFile(options.output);
                spinner.succeed(`Exported proxy API keys to ${options.output}`);
                Logger.success(`Proxy API keys exported to ${options.output}`);
            } catch (error) {
                Logger.error('Failed to export proxy API keys', error);
                throw ErrorHandler.createError('Failed to export proxy API keys', {
                    code: 'EXPORT_ERROR',
                    exitCode: 1,
                });
            }
        });

    // Import from JSON file
    proxyKeys
        .command('import')
        .description('Import proxy API keys from JSON file')
        .argument('<file>', 'JSON file to import from')
        .option('-o, --overwrite', 'Overwrite existing keys')
        .option('-s, --skip-duplicates', 'Skip duplicate keys')
        .option('-d, --dry-run', 'Show what would be imported without actually importing')
        .action(async (file, options) => {
            try {
                Validation.validateFilePath(file);

                const spinner = ora('Importing proxy API keys...').start();
                const results = await ProxyKeysManager.importFromFile(file, {
                    overwrite: options.overwrite,
                    skipDuplicates: options.skipDuplicates,
                    dryRun: options.dryRun,
                });

                spinner.succeed('Import completed');
                Logger.success('Proxy API keys import completed');

                console.log(`\n📊 Import Results:`);
                console.log(`  • Created: ${results.created} key(s)`);
                console.log(`  • Updated: ${results.updated} key(s)`);
                console.log(`  • Skipped: ${results.skipped} key(s)`);

                if (results.errors.length > 0) {
                    console.log(`\n❌ Errors:`);
                    results.errors.forEach((error) => console.log(`  • ${error}`));
                }
            } catch (error) {
                Logger.error('Failed to import proxy API keys', error);
                throw ErrorHandler.createError('Failed to import proxy API keys', {
                    code: 'IMPORT_ERROR',
                    exitCode: 1,
                });
            }
        });

    // Prune inactive keys
    proxyKeys
        .command('prune')
        .description('Remove inactive proxy API keys')
        .option('-f, --force', 'Skip confirmation')
        .action(async (options) => {
            const spinner = ora('Checking for inactive proxy API keys...').start();
            try {
                const inactiveKeys = await ProxyKeysManager.list();
                const inactive = inactiveKeys.filter((key) => !key.is_active);

                if (inactive.length === 0) {
                    spinner.succeed('No inactive proxy API keys found');
                    return;
                }

                spinner.succeed(`Found ${inactive.length} inactive proxy API key(s)`);

                if (!options.force) {
                    console.log('\nInactive proxy API keys:');
                    inactive.forEach((key) => {
                        console.log(`  • ${key.name} (${key.id})`);
                    });

                    const confirmed = await confirm({
                        message: `Delete ${inactive.length} inactive proxy API key(s)?`,
                        default: false,
                    });

                    if (!confirmed) {
                        console.log(colors.yellow('Operation cancelled'));
                        return;
                    }
                }

                const deleteSpinner = ora('Deleting inactive proxy API keys...').start();
                const deletedCount = await ProxyKeysManager.pruneInactive();
                deleteSpinner.succeed(`Deleted ${deletedCount} inactive proxy API key(s)`);
            } catch (error) {
                spinner.fail('Failed to prune proxy API keys');
                throw error;
            }
        });

    // Sync from .env (improved)
    proxyKeys
        .command('sync')
        .description('Sync proxy API keys from .env file to database')
        .option('-f, --force', 'Skip confirmation for deletions')
        .option('-d, --dry-run', 'Show what would be synced without actually syncing')
        .action(async (options) => {
            const spinner = ora('Syncing proxy API keys from .env...').start();

            try {
                const { proxy: envKeys } = EnvParser.getApiKeysFromEnv();

                if (envKeys.length === 0) {
                    spinner.info('No PROXY_API_KEY found in environment variables');
                    return;
                }

                spinner.text = `Found ${envKeys.length} proxy API key(s) in .env file`;

                const existingKeys = await ProxyKeysManager.list();
                const keysToCreate: typeof envKeys = [];
                const keysToUpdate: Array<{ envKey: (typeof envKeys)[0]; dbKey: any }> = [];
                const keysToDelete: typeof existingKeys = [];

                // Find keys to create or update
                for (const envKey of envKeys) {
                    const existingKey = existingKeys.find(
                        (dbKey) => dbKey.key_id === envKey.key_id || dbKey.name === envKey.name,
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
                        (envKey) => envKey.key_id === dbKey.key_id || envKey.name === dbKey.name,
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
                        syncSpinner.text = `Creating ${keysToCreate.length} new proxy API key(s)...`;
                        const createData = keysToCreate.map((envKey) => ({
                            name: envKey.name,
                            key_id: envKey.key_id,
                            is_active: true,
                            success_count: 0,
                            failure_count: 0,
                            prompt_tokens: 0,
                            completion_tokens: 0,
                            total_tokens: 0,
                        }));
                        await ProxyKeysManager.bulkCreate(createData);
                    }

                    // Update existing keys in batch
                    if (keysToUpdate.length > 0) {
                        syncSpinner.text = `Updating ${keysToUpdate.length} existing proxy API key(s)...`;
                        const updateData = keysToUpdate.map(({ envKey, dbKey }) => ({
                            id: dbKey.id,
                            updates: { name: envKey.name },
                        }));
                        await ProxyKeysManager.bulkUpdate(updateData);
                    }

                    // Delete keys not in .env in batch
                    if (keysToDelete.length > 0) {
                        syncSpinner.text = `Deleting ${keysToDelete.length} proxy API key(s)...`;
                        const deleteIds = keysToDelete.map((dbKey) => dbKey.id);
                        await ProxyKeysManager.bulkDelete(deleteIds);
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
                spinner.fail('Failed to sync proxy API keys');
                throw error;
            }
        });

    // Generate new key ID
    proxyKeys
        .command('generate-id')
        .description('Generate a new key ID')
        .action(() => {
            const keyId = ProxyKeysManager.generateKeyId();
            console.log(colors.green('Generated Key ID:'), colors.bold(keyId));
        });

    // Legacy commands for backward compatibility
    proxyKeys
        .command('get <id>')
        .description('Get proxy API key by ID')
        .action(async (id) => {
            const spinner = ora('Fetching proxy API key...').start();
            try {
                const proxyKey = await ProxyKeysManager.getById(id);
                if (!proxyKey) {
                    spinner.fail('Proxy API key not found');
                    return;
                }

                spinner.succeed('Proxy API key fetched successfully');
                console.log('\n' + colors.green('Proxy API Key Details:'));
                console.log(ProxyKeysManager.formatProxyKey(proxyKey));
            } catch (error) {
                spinner.fail('Failed to fetch proxy API key');
                throw error;
            }
        });

    proxyKeys
        .command('update <id>')
        .description('Update a proxy API key')
        .option('-n, --name <name>', 'New name')
        .option('-k, --key-id <keyId>', 'New key ID')
        .action(async (id, options) => {
            const current = await ProxyKeysManager.getById(id);
            if (!current) {
                throw new Error('Proxy API key not found');
            }

            const name = await input({
                message: 'Enter new name:',
                default: options.name || current.name,
            });

            const keyId = await input({
                message: 'Enter new key ID:',
                default: options.keyId || current.key_id,
            });

            const spinner = ora('Updating proxy API key...').start();
            try {
                const proxyKey = await ProxyKeysManager.update(id, {
                    name: name,
                    key_id: keyId,
                });
                spinner.succeed('Proxy API key updated successfully');
                console.log('\n' + colors.green('Updated Proxy API Key:'));
                console.log(ProxyKeysManager.formatProxyKey(proxyKey));
            } catch (error) {
                spinner.fail('Failed to update proxy API key');
                throw error;
            }
        });

    proxyKeys
        .command('delete <id>')
        .description('Delete a proxy API key')
        .option('-f, --force', 'Skip confirmation')
        .action(async (id, options) => {
            const proxyKey = await ProxyKeysManager.getById(id);
            if (!proxyKey) {
                throw new Error('Proxy API key not found');
            }

            if (!options.force) {
                const confirmed = await confirm({
                    message: `Are you sure you want to delete proxy API key "${proxyKey.name}"?`,
                    default: false,
                });

                if (!confirmed) {
                    console.log(colors.yellow('Operation cancelled'));
                    return;
                }
            }

            const spinner = ora('Deleting proxy API key...').start();
            try {
                await ProxyKeysManager.delete(id);
                spinner.succeed('Proxy API key deleted successfully');
            } catch (error) {
                spinner.fail('Failed to delete proxy API key');
                throw error;
            }
        });

    proxyKeys
        .command('toggle <id>')
        .description('Toggle proxy API key active status')
        .action(async (id) => {
            const spinner = ora('Toggling proxy API key status...').start();
            try {
                const proxyKey = await ProxyKeysManager.toggleActive(id);
                spinner.succeed(
                    `Proxy API key ${proxyKey.is_active ? 'activated' : 'deactivated'} successfully`,
                );
                console.log('\n' + colors.green('Updated Proxy API Key:'));
                console.log(ProxyKeysManager.formatProxyKey(proxyKey));
            } catch (error) {
                spinner.fail('Failed to toggle proxy API key status');
                throw error;
            }
        });
}

async function interactiveEdit(keys: any[]) {
    const selectedKey = await select({
        message: 'Select a proxy API key to edit:',
        choices: keys.map((key) => ({
            name: ProxyKeysManager.formatProxyKeyCompact(key),
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
            await editProxyKey(selectedKey);
            break;
        case 'toggle':
            await toggleProxyKey(selectedKey);
            break;
        case 'delete':
            await deleteProxyKey(selectedKey);
            break;
        case 'cancel':
            console.log(colors.yellow('Operation cancelled'));
            break;
    }
}

async function editProxyKey(proxyKey: any) {
    const name = await input({
        message: 'Enter new name:',
        default: proxyKey.name,
    });

    const keyId = await input({
        message: 'Enter new key ID:',
        default: proxyKey.key_id,
    });

    const spinner = ora('Updating proxy API key...').start();
    try {
        const updatedKey = await ProxyKeysManager.update(proxyKey.id, {
            name: name,
            key_id: keyId,
        });
        spinner.succeed('Proxy API key updated successfully');
        console.log('\n' + colors.green('Updated Proxy API Key:'));
        console.log(ProxyKeysManager.formatProxyKey(updatedKey));
    } catch (error) {
        spinner.fail('Failed to update proxy API key');
        throw error;
    }
}

async function toggleProxyKey(proxyKey: any) {
    const spinner = ora('Toggling proxy API key status...').start();
    try {
        const updatedKey = await ProxyKeysManager.toggleActive(proxyKey.id);
        spinner.succeed(
            `Proxy API key ${updatedKey.is_active ? 'activated' : 'deactivated'} successfully`,
        );
        console.log('\n' + colors.green('Updated Proxy API Key:'));
        console.log(ProxyKeysManager.formatProxyKey(updatedKey));
    } catch (error) {
        spinner.fail('Failed to toggle proxy API key status');
        throw error;
    }
}

async function deleteProxyKey(proxyKey: any) {
    const confirmed = await confirm({
        message: `Are you sure you want to delete proxy API key "${proxyKey.name}"?`,
        default: false,
    });

    if (!confirmed) {
        console.log(colors.yellow('Operation cancelled'));
        return;
    }

    const spinner = ora('Deleting proxy API key...').start();
    try {
        await ProxyKeysManager.delete(proxyKey.id);
        spinner.succeed('Proxy API key deleted successfully');
    } catch (error) {
        spinner.fail('Failed to delete proxy API key');
        throw error;
    }
}
