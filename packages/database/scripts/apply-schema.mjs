#!/usr/bin/env node

/**
 * Apply sql/schema.sql (+ optional migration files) to a remote Supabase Postgres.
 *
 * Required env:
 *   SUPABASE_PROJECT_ID (or derived from SUPABASE_URL)
 *   SUPABASE_DB_PASSWORD
 *
 * Optional:
 *   SUPABASE_DB_HOST (default: db.<project-id>.supabase.co)
 *   SUPABASE_DB_PORT (default: 5432)
 *   SUPABASE_DB_USER (default: postgres)
 *   SUPABASE_DB_NAME (default: postgres)
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns';
import pg from 'pg';

// Prefer IPv4 — WSL/local often cannot reach Supabase AAAA records
dns.setDefaultResultOrder('ipv4first');

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sqlRoot = join(__dirname, '../sql');

function resolveProjectId() {
    if (process.env.SUPABASE_PROJECT_ID) {
        return process.env.SUPABASE_PROJECT_ID;
    }
    if (process.env.SUPABASE_PROJECT_REF) {
        return process.env.SUPABASE_PROJECT_REF;
    }
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) {
        return null;
    }
    try {
        const host = new URL(url).hostname; // <ref>.supabase.co
        return host.split('.')[0] || null;
    } catch {
        return null;
    }
}

function loadSqlFiles() {
    const files = [join(sqlRoot, 'schema.sql')];
    const migrationsDir = join(sqlRoot, 'migrations');
    if (existsSync(migrationsDir)) {
        const migrationFiles = readdirSync(migrationsDir)
            .filter((name) => name.endsWith('.sql'))
            .sort()
            .map((name) => join(migrationsDir, name));
        // schema.sql already includes the ops console changes; skip duplicate migration if present
        for (const file of migrationFiles) {
            if (file.includes('ops_console_realtime')) {
                continue;
            }
            files.push(file);
        }
    }
    return files;
}

async function main() {
    const projectId = resolveProjectId();
    const password = process.env.SUPABASE_DB_PASSWORD;

    if (!projectId) {
        console.error('Missing SUPABASE_PROJECT_ID (or SUPABASE_URL to derive it).');
        process.exit(1);
    }
    if (!password) {
        console.error('Missing SUPABASE_DB_PASSWORD.');
        console.error(
            'Find it in Supabase Dashboard → Project Settings → Database → Database password',
        );
        console.error('Then set it in packages/database/.env and re-run: pnpm db:apply');
        process.exit(1);
    }

    const database = process.env.SUPABASE_DB_NAME || 'postgres';
    const candidates = [
        {
            label: 'direct-ipv4',
            host: process.env.SUPABASE_DB_HOST || `db.${projectId}.supabase.co`,
            port: Number(process.env.SUPABASE_DB_PORT || 5432),
            user: process.env.SUPABASE_DB_USER || 'postgres',
        },
        {
            // Session mode pooler — works when direct host is IPv6-only / unreachable
            label: 'pooler-session',
            host: process.env.SUPABASE_POOLER_HOST || `aws-0-ap-southeast-1.pooler.supabase.com`,
            port: Number(process.env.SUPABASE_POOLER_PORT || 5432),
            user: process.env.SUPABASE_POOLER_USER || `postgres.${projectId}`,
        },
        {
            label: 'pooler-transaction',
            host: process.env.SUPABASE_POOLER_HOST || `aws-0-ap-southeast-1.pooler.supabase.com`,
            port: Number(process.env.SUPABASE_POOLER_TX_PORT || 6543),
            user: process.env.SUPABASE_POOLER_USER || `postgres.${projectId}`,
        },
    ];

    const files = loadSqlFiles();
    let client = null;
    let lastError = null;

    for (const candidate of candidates) {
        const nextClient = new Client({
            host: candidate.host,
            port: candidate.port,
            user: candidate.user,
            password,
            database,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 15000,
            // Force IPv4 sockets when possible
            family: 4,
        });
        try {
            console.log(
                `Connecting (${candidate.label}) to ${candidate.user}@${candidate.host}:${candidate.port}/${database} ...`,
            );
            await nextClient.connect();
            client = nextClient;
            console.log(`Connected via ${candidate.label}.`);
            break;
        } catch (err) {
            lastError = err;
            console.warn(`  skipped ${candidate.label}: ${err.message}`);
            try {
                await nextClient.end();
            } catch {
                // ignore
            }
        }
    }

    if (!client) {
        throw lastError || new Error('Unable to connect to Supabase Postgres');
    }

    console.log('Applying SQL files:');

    try {
        for (const file of files) {
            const sql = readFileSync(file, 'utf8');
            console.log(`  → ${file.replace(sqlRoot + '/', 'sql/')}`);
            await client.query(sql);
        }

        const { rows } = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name IN ('api_keys', 'proxy_api_keys', 'request_logs')
            ORDER BY table_name;
        `);
        const tables = rows.map((row) => row.table_name);
        console.log('Verified tables:', tables.join(', ') || '(none)');

        const { rows: fnRows } = await client.query(`
            SELECT p.proname AS name
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'
              AND p.proname LIKE 'get_%statistics'
            ORDER BY 1;
        `);
        console.log(
            'Verified RPCs:',
            fnRows.map((row) => row.name).join(', ') || '(none)',
        );

        const { rows: pubRows } = await client.query(`
            SELECT tablename
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND tablename IN ('api_keys', 'proxy_api_keys', 'request_logs')
            ORDER BY 1;
        `);
        console.log(
            'Realtime publication:',
            pubRows.map((row) => row.tablename).join(', ') || '(none — enable in Dashboard if empty)',
        );

        console.log('Schema apply completed successfully.');
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error('Schema apply failed:', err.message || err);
    process.exit(1);
});
