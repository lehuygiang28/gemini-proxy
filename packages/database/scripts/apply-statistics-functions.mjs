#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function applyStatisticsFunctions() {
    try {
        console.log('🚀 Applying statistics functions to database...');

        // Read the statistics functions SQL file
        const sqlPath = join(__dirname, '../sql/statistics-functions.sql');
        const sqlContent = readFileSync(sqlPath, 'utf8');

        // Execute the SQL
        const { data, error } = await supabase.rpc('exec', { sql: sqlContent });

        if (error) {
            console.error('❌ Error applying statistics functions:', error);
            process.exit(1);
        }

        console.log('✅ Statistics functions applied successfully!');
        console.log('📊 Available RPC functions:');
        console.log('   - get_dashboard_statistics(p_user_id)');
        console.log('   - get_retry_statistics(p_user_id, p_days_back)');
        console.log('   - get_api_key_statistics(p_user_id)');
        console.log('   - get_proxy_key_statistics(p_user_id)');
        console.log('   - get_request_logs_statistics(p_user_id, p_days_back)');
    } catch (error) {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    }
}

// Run the migration
applyStatisticsFunctions();
