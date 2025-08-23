import {
    supabase,
    type ProxyApiKey,
    type ProxyApiKeyInsert,
    type ProxyApiKeyUpdate,
} from './database.js';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';

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
        const { data, error } = await supabase.client
            .from('proxy_api_keys')
            .insert(proxyKeyData)
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

    static generateKeyId(): string {
        return `gproxy_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    }

    static formatProxyKey(proxyKey: ProxyApiKey): string {
        const status = proxyKey.is_active ? chalk.green('● Active') : chalk.red('● Inactive');

        return `
${chalk.bold(proxyKey.name)} ${status}
  ID: ${proxyKey.id}
  Key ID: ${proxyKey.key_id}
  Success: ${proxyKey.success_count} | Failures: ${proxyKey.failure_count}
  Tokens: ${proxyKey.prompt_tokens} prompt + ${proxyKey.completion_tokens} completion = ${proxyKey.total_tokens} total
  Created: ${new Date(proxyKey.created_at!).toLocaleDateString()}
  Last Used: ${proxyKey.last_used_at ? new Date(proxyKey.last_used_at).toLocaleDateString() : 'Never'}`;
    }
}
