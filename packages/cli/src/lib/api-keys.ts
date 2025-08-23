import { supabase, type ApiKey, type ApiKeyInsert, type ApiKeyUpdate } from './database.js';
import chalk from 'chalk';

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
        const { data, error } = await supabase.client
            .from('api_keys')
            .insert(apiKeyData)
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

    static formatApiKey(apiKey: ApiKey): string {
        const status = apiKey.is_active ? chalk.green('● Active') : chalk.red('● Inactive');
        const maskedKey =
            apiKey.api_key_value.substring(0, 8) +
            '...' +
            apiKey.api_key_value.substring(apiKey.api_key_value.length - 4);

        return `
${chalk.bold(apiKey.name)} ${status}
  ID: ${apiKey.id}
  Key: ${maskedKey}
  Provider: ${apiKey.provider}
  Success: ${apiKey.success_count} | Failures: ${apiKey.failure_count}
  Created: ${new Date(apiKey.created_at!).toLocaleDateString()}
  Last Used: ${apiKey.last_used_at ? new Date(apiKey.last_used_at).toLocaleDateString() : 'Never'}`;
    }
}
