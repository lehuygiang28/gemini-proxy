import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { supabase, type ApiKey, type ApiKeyInsert, type ApiKeyUpdate } from './database';
import { UsersManager } from './users';
import { colors } from './colors';

export interface ApiKeyExport {
    version: string;
    exported_at: string;
    api_keys: Array<{
        name: string;
        api_key_value: string;
        provider: string;
        is_active: boolean;
        metadata?: any;
    }>;
}

export class ApiKeysManager {
    static async list(): Promise<ApiKey[]> {
        await supabase.init();
        const { data, error } = await supabase.client
            .from('api_keys')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch API keys: ${error.message}`);
        }

        return data || [];
    }

    static async getById(id: string): Promise<ApiKey | null> {
        await supabase.init();
        const { data, error } = await supabase.client
            .from('api_keys')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            throw new Error(`Failed to fetch API key: ${error.message}`);
        }

        return data;
    }

    static async create(
        apiKeyData: Omit<ApiKeyInsert, 'id' | 'created_at' | 'updated_at'>,
    ): Promise<ApiKey> {
        await supabase.init();

        // Auto-assign user_id if not provided
        let finalApiKeyData = { ...apiKeyData };
        let autoAssigned = false;

        if (!finalApiKeyData.user_id) {
            try {
                const defaultUserId = await UsersManager.getDefaultUser();
                finalApiKeyData.user_id = defaultUserId;
                autoAssigned = true;

                // Get user info for notification
                const firstUser = await UsersManager.getFirstUser();
                UsersManager.notifyAutoAssignment(defaultUserId, firstUser?.email);
            } catch (error) {
                throw new Error(
                    `Failed to auto-assign user_id: ${error instanceof Error ? error.message : 'Unknown error'}`,
                );
            }
        }

        const { data, error } = await supabase.client
            .from('api_keys')
            .insert(finalApiKeyData)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create API key: ${error.message}`);
        }

        return data;
    }

    static async update(id: string, updates: Partial<ApiKeyUpdate>): Promise<ApiKey> {
        await supabase.init();
        const { data, error } = await supabase.client
            .from('api_keys')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update API key: ${error.message}`);
        }

        return data;
    }

    static async delete(id: string): Promise<void> {
        await supabase.init();
        const { error } = await supabase.client.from('api_keys').delete().eq('id', id);

        if (error) {
            throw new Error(`Failed to delete API key: ${error.message}`);
        }
    }

    static async toggleActive(id: string): Promise<ApiKey> {
        const current = await this.getById(id);
        if (!current) {
            throw new Error('API key not found');
        }

        return await this.update(id, { is_active: !current.is_active });
    }

    static async bulkDelete(ids: string[]): Promise<void> {
        if (ids.length === 0) return;

        await supabase.init();
        const { error } = await supabase.client.from('api_keys').delete().in('id', ids);

        if (error) {
            throw new Error(`Failed to delete API keys: ${error.message}`);
        }
    }

    static async bulkCreate(
        apiKeysData: Array<
            Omit<ApiKeyInsert, 'id' | 'created_at' | 'updated_at'> & { user_id?: string }
        >,
    ): Promise<ApiKey[]> {
        if (apiKeysData.length === 0) return [];

        await supabase.init();

        // Auto-assign user_id if not provided
        const finalApiKeysData = await Promise.all(
            apiKeysData.map(async (apiKeyData) => {
                let finalData = { ...apiKeyData };

                if (!finalData.user_id) {
                    try {
                        const defaultUserId = await UsersManager.getDefaultUser();
                        finalData.user_id = defaultUserId;
                    } catch (error) {
                        throw new Error(
                            `Failed to auto-assign user_id: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        );
                    }
                }

                return finalData;
            }),
        );

        const { data, error } = await supabase.client
            .from('api_keys')
            .insert(finalApiKeysData)
            .select();

        if (error) {
            throw new Error(`Failed to create API keys: ${error.message}`);
        }

        return data || [];
    }

    static async bulkUpdate(
        updates: Array<{ id: string; updates: Partial<ApiKeyUpdate> }>,
    ): Promise<ApiKey[]> {
        if (updates.length === 0) return [];

        await supabase.init();

        // Process updates in batches to avoid overwhelming the database
        const batchSize = 10;
        const results: ApiKey[] = [];

        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);

            // Process each update in the batch
            const batchResults = await Promise.all(
                batch.map(async ({ id, updates: updateData }) => {
                    const { data, error } = await supabase.client
                        .from('api_keys')
                        .update(updateData)
                        .eq('id', id)
                        .select()
                        .single();

                    if (error) {
                        throw new Error(`Failed to update API key ${id}: ${error.message}`);
                    }

                    return data;
                }),
            );

            results.push(...batchResults);
        }

        return results;
    }

    static async exportToFile(filePath: string): Promise<void> {
        const apiKeys = await this.list();

        const exportData: ApiKeyExport = {
            version: '1.0.0',
            exported_at: new Date().toISOString(),
            api_keys: apiKeys.map((key) => ({
                name: key.name,
                api_key_value: key.api_key_value,
                provider: key.provider,
                is_active: key.is_active,
                metadata: key.metadata,
            })),
        };

        writeFileSync(filePath, JSON.stringify(exportData, null, 2));
    }

    static async importFromFile(
        filePath: string,
        options: {
            overwrite?: boolean;
            skipDuplicates?: boolean;
            dryRun?: boolean;
        } = {},
    ): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
        if (!existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const fileContent = readFileSync(filePath, 'utf-8');
        const importData: ApiKeyExport = JSON.parse(fileContent);

        if (!importData.api_keys || !Array.isArray(importData.api_keys)) {
            throw new Error('Invalid import file format');
        }

        const existingKeys = await this.list();
        const results = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

        // Get first user for API key assignment
        const firstUser = await UsersManager.getFirstUser();
        if (!firstUser) {
            throw new Error('No users found in the database. Please create a user first.');
        }

        // Prepare batch operations
        const keysToCreate: Array<Omit<ApiKeyInsert, 'id' | 'created_at' | 'updated_at'>> = [];
        const keysToUpdate: Array<{ id: string; updates: Partial<ApiKeyUpdate> }> = [];

        // Analyze import data
        for (const importKey of importData.api_keys) {
            try {
                // Check for existing key by name
                const existingKey = existingKeys.find((key) => key.name === importKey.name);

                if (existingKey) {
                    if (options.skipDuplicates) {
                        results.skipped++;
                        continue;
                    }

                    if (options.overwrite) {
                        if (!options.dryRun) {
                            keysToUpdate.push({
                                id: existingKey.id,
                                updates: {
                                    api_key_value: importKey.api_key_value,
                                    provider: importKey.provider,
                                    is_active: importKey.is_active,
                                    metadata: importKey.metadata,
                                },
                            });
                        }
                        results.updated++;
                    } else {
                        results.skipped++;
                    }
                } else {
                    if (!options.dryRun) {
                        keysToCreate.push({
                            name: importKey.name,
                            api_key_value: importKey.api_key_value,
                            provider: importKey.provider,
                            is_active: importKey.is_active,
                            metadata: importKey.metadata,
                            user_id: firstUser.id,
                        });
                    }
                    results.created++;
                }
            } catch (error) {
                const errorMsg = `Failed to import key "${importKey.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
                results.errors.push(errorMsg);
            }
        }

        // Execute batch operations
        if (!options.dryRun) {
            try {
                if (keysToCreate.length > 0) {
                    await this.bulkCreate(keysToCreate);
                }
                if (keysToUpdate.length > 0) {
                    await this.bulkUpdate(keysToUpdate);
                }
            } catch (error) {
                const errorMsg = `Batch operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                results.errors.push(errorMsg);
            }
        }

        return results;
    }

    static async pruneInactive(): Promise<number> {
        await supabase.init();
        const { data, error } = await supabase.client
            .from('api_keys')
            .select('id')
            .eq('is_active', false);

        if (error) {
            throw new Error(`Failed to fetch inactive API keys: ${error.message}`);
        }

        if (data && data.length > 0) {
            const ids = data.map((key) => key.id);
            await this.bulkDelete(ids);
            return ids.length;
        }

        return 0;
    }

    static formatApiKey(apiKey: ApiKey): string {
        const status = apiKey.is_active ? colors.green('● Active') : colors.red('● Inactive');
        const maskedKey =
            apiKey.api_key_value.substring(0, 8) +
            '...' +
            apiKey.api_key_value.substring(apiKey.api_key_value.length - 4);

        return `
        ${colors.bold(apiKey.name)} ${status}
  ID: ${apiKey.id}
  Key: ${maskedKey}
  Provider: ${apiKey.provider}
  Success: ${apiKey.success_count} | Failures: ${apiKey.failure_count}
  Created: ${new Date(apiKey.created_at!).toLocaleDateString()}
  Last Used: ${apiKey.last_used_at ? new Date(apiKey.last_used_at).toLocaleDateString() : 'Never'}`;
    }

    static formatApiKeyCompact(apiKey: ApiKey): string {
        const status = apiKey.is_active ? colors.green('●') : colors.red('●');
        const maskedKey = apiKey.api_key_value.substring(0, 8) + '...';
        return `${status} ${apiKey.name} (${maskedKey}) - ${apiKey.provider}`;
    }
}
