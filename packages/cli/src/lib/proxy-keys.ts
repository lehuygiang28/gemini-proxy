import {
    supabase,
    type ProxyApiKey,
    type ProxyApiKeyInsert,
    type ProxyApiKeyUpdate,
} from './database';
import { UsersManager } from './users';
import { colors } from './colors';
import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

export interface ProxyApiKeyExport {
    version: string;
    exported_at: string;
    proxy_api_keys: Array<{
        name: string;
        proxy_key_value: string;
        is_active: boolean;
        metadata?: any;
    }>;
}

export class ProxyKeysManager {
    static async list(): Promise<ProxyApiKey[]> {
        await supabase.init();
        const { data, error } = await supabase.client
            .from('proxy_api_keys')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch proxy API keys: ${error.message}`);
        }

        return data || [];
    }

    static async getById(id: string): Promise<ProxyApiKey | null> {
        await supabase.init();
        const { data, error } = await supabase.client
            .from('proxy_api_keys')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            throw new Error(`Failed to fetch proxy API key: ${error.message}`);
        }

        return data;
    }

    static async create(
        proxyKeyData: Omit<ProxyApiKeyInsert, 'id' | 'created_at' | 'updated_at'>,
    ): Promise<ProxyApiKey> {
        await supabase.init();

        // Auto-assign user_id if not provided
        let finalProxyKeyData = { ...proxyKeyData };

        if (!finalProxyKeyData.user_id) {
            try {
                const defaultUserId = await UsersManager.getDefaultUser();
                finalProxyKeyData.user_id = defaultUserId;

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
            .from('proxy_api_keys')
            .insert(finalProxyKeyData)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create proxy API key: ${error.message}`);
        }

        return data;
    }

    static async update(id: string, updates: Partial<ProxyApiKeyUpdate>): Promise<ProxyApiKey> {
        await supabase.init();
        const { data, error } = await supabase.client
            .from('proxy_api_keys')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update proxy API key: ${error.message}`);
        }

        return data;
    }

    static async delete(id: string): Promise<void> {
        await supabase.init();
        const { error } = await supabase.client.from('proxy_api_keys').delete().eq('id', id);

        if (error) {
            throw new Error(`Failed to delete proxy API key: ${error.message}`);
        }
    }

    static async toggleActive(id: string): Promise<ProxyApiKey> {
        const current = await this.getById(id);
        if (!current) {
            throw new Error('Proxy API key not found');
        }

        return await this.update(id, { is_active: !current.is_active });
    }

    static async bulkDelete(ids: string[]): Promise<void> {
        if (ids.length === 0) return;

        await supabase.init();
        const { error } = await supabase.client.from('proxy_api_keys').delete().in('id', ids);

        if (error) {
            throw new Error(`Failed to delete proxy API keys: ${error.message}`);
        }
    }

    static async bulkCreate(
        proxyKeysData: Array<
            Omit<ProxyApiKeyInsert, 'id' | 'created_at' | 'updated_at'> & { user_id?: string }
        >,
    ): Promise<ProxyApiKey[]> {
        if (proxyKeysData.length === 0) return [];

        await supabase.init();

        // Auto-assign user_id if not provided
        const finalProxyKeysData = await Promise.all(
            proxyKeysData.map(async (proxyKeyData) => {
                let finalData = { ...proxyKeyData };

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
            .from('proxy_api_keys')
            .insert(finalProxyKeysData)
            .select();

        if (error) {
            throw new Error(`Failed to create proxy API keys: ${error.message}`);
        }

        return data || [];
    }

    static async bulkUpdate(
        updates: Array<{ id: string; updates: Partial<ProxyApiKeyUpdate> }>,
    ): Promise<ProxyApiKey[]> {
        if (updates.length === 0) return [];

        await supabase.init();

        // Process updates in batches to avoid overwhelming the database
        const batchSize = 10;
        const results: ProxyApiKey[] = [];

        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);

            // Process each update in the batch
            const batchResults = await Promise.all(
                batch.map(async ({ id, updates: updateData }) => {
                    const { data, error } = await supabase.client
                        .from('proxy_api_keys')
                        .update(updateData)
                        .eq('id', id)
                        .select()
                        .single();

                    if (error) {
                        throw new Error(`Failed to update proxy API key ${id}: ${error.message}`);
                    }

                    return data;
                }),
            );

            results.push(...batchResults);
        }

        return results;
    }

    static async exportToFile(filePath: string): Promise<void> {
        const proxyKeys = await this.list();

        const exportData: ProxyApiKeyExport = {
            version: '1.0.0',
            exported_at: new Date().toISOString(),
            proxy_api_keys: proxyKeys.map((key) => ({
                name: key.name,
                proxy_key_value: key.proxy_key_value,
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
        const importData: ProxyApiKeyExport = JSON.parse(fileContent);

        if (!importData.proxy_api_keys || !Array.isArray(importData.proxy_api_keys)) {
            throw new Error('Invalid import file format');
        }

        const existingKeys = await this.list();
        const results = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

        // Get first user for proxy key assignment
        const firstUser = await UsersManager.getFirstUser();
        if (!firstUser) {
            throw new Error('No users found in the database. Please create a user first.');
        }

        // Prepare batch operations
        const keysToCreate: Array<Omit<ProxyApiKeyInsert, 'id' | 'created_at' | 'updated_at'>> = [];
        const keysToUpdate: Array<{ id: string; updates: Partial<ProxyApiKeyUpdate> }> = [];

        // Analyze import data
        for (const importKey of importData.proxy_api_keys) {
            try {
                // Check for existing key by name or proxy_key_value
                const existingKey = existingKeys.find(
                    (key) =>
                        key.name === importKey.name ||
                        key.proxy_key_value === importKey.proxy_key_value,
                );

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
                                    name: importKey.name,
                                    proxy_key_value: importKey.proxy_key_value,
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
                            proxy_key_value: importKey.proxy_key_value,
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
            .from('proxy_api_keys')
            .select('id')
            .eq('is_active', false);

        if (error) {
            throw new Error(`Failed to fetch inactive proxy API keys: ${error.message}`);
        }

        if (data && data.length > 0) {
            const ids = data.map((key) => key.id);
            await this.bulkDelete(ids);
            return ids.length;
        }

        return 0;
    }

    static generateKeyId(): string {
        return `gproxy_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    }

    static formatProxyKey(proxyKey: ProxyApiKey): string {
        const status = proxyKey.is_active ? colors.green('● Active') : colors.red('● Inactive');

        return `
        ${colors.bold(proxyKey.name)} ${status}
  ID: ${proxyKey.id}
  Proxy Key Value: ${proxyKey.proxy_key_value}
  Success: ${proxyKey.success_count} | Failures: ${proxyKey.failure_count}
  Tokens: ${proxyKey.prompt_tokens} prompt + ${proxyKey.completion_tokens} completion = ${proxyKey.total_tokens} total
  Created: ${new Date(proxyKey.created_at!).toLocaleDateString()}
  Last Used: ${proxyKey.last_used_at ? new Date(proxyKey.last_used_at).toLocaleDateString() : 'Never'}`;
    }

    static formatProxyKeyCompact(proxyKey: ProxyApiKey): string {
        const status = proxyKey.is_active ? colors.green('●') : colors.red('●');
        return `${status} ${proxyKey.name} (${proxyKey.proxy_key_value})`;
    }
}
