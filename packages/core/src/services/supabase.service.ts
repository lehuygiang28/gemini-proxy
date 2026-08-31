import { Context } from 'hono';
import { env } from 'hono/adapter';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';

export type SupabaseFactory = (c: Context) => SupabaseClient<Database>;

let supabaseFactory: SupabaseFactory | null = null;
let client: SupabaseClient<Database> | null = null;

export function setSupabaseFactoryForTests(factory: SupabaseFactory | null): void {
    if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
        throw new Error('setSupabaseFactoryForTests is only available in tests');
    }
    supabaseFactory = factory;
}

/**
 * Get or create a Supabase client instance (singleton pattern)
 * Uses Hono's environment adapter for cross-platform compatibility
 * @param c - The Hono context
 * @returns The Supabase client instance
 */
export function getSupabaseClient(c: Context): SupabaseClient<Database> {
    if (supabaseFactory) {
        return supabaseFactory(c);
    }
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
