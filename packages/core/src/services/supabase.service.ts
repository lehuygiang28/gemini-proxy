import { Context } from 'hono';
import { env } from 'hono/adapter';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.type';

// Singleton instance
let client: SupabaseClient | null = null;

/**
 * Get or create a Supabase client instance (singleton pattern)
 * Uses Hono's environment adapter for cross-platform compatibility
 * @param c - The Hono context
 * @returns The Supabase client instance
 */
export function getSupabaseClient(c: Context): SupabaseClient<Database> {
    // Return existing client if already created
    if (client) {
        return client;
    }

    // Use Hono's environment adapter for cross-platform compatibility
    const envVars = env(c);
    const supabaseUrl = envVars.SUPABASE_URL;
    const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error(
            'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in environment variables',
        );
    }

    // Create the client instance
    client = createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    return client;
}

/**
 * Reset the Supabase client instance (useful for testing or reconnection)
 */
export function resetSupabaseClient(): void {
    client = null;
}

/**
 * Check if the Supabase client is initialized
 * @returns True if client is initialized, false otherwise
 */
export function isSupabaseClientInitialized(): boolean {
    return client !== null;
}
