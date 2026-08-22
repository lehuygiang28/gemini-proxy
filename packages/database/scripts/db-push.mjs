#!/usr/bin/env node

/**
 * Apply pending Supabase CLI migrations to a remote Postgres database.
 *
 * Preferred env (packages/database/.env):
 *   SUPABASE_DB_URL — Session pooler URI from Dashboard → Connect
 *
 * Fallback:
 *   SUPABASE_PROJECT_ID (or SUPABASE_URL / SUPABASE_PROJECT_REF)
 *   SUPABASE_DB_PASSWORD
 *   Optional: SUPABASE_DB_HOST, SUPABASE_POOLER_HOST, SUPABASE_POOLER_USER, ports
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '../../..');

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
        const host = new URL(url).hostname;
        return host.split('.')[0] || null;
    } catch {
        return null;
    }
}

function buildPostgresUrl({ host, port, user, password, database }) {
    const encodedPassword = encodeURIComponent(password);
    return `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}`;
}

function resolveDbUrlCandidates() {
    if (process.env.SUPABASE_DB_URL) {
        return [{ label: 'SUPABASE_DB_URL', url: process.env.SUPABASE_DB_URL }];
    }

    const password = process.env.SUPABASE_DB_PASSWORD;
    const projectId = resolveProjectId();
    if (!password || !projectId) {
        return [];
    }

    const database = process.env.SUPABASE_DB_NAME || 'postgres';
    const poolerHost =
        process.env.SUPABASE_POOLER_HOST || 'aws-0-ap-southeast-1.pooler.supabase.com';
    const poolerUser = process.env.SUPABASE_POOLER_USER || `postgres.${projectId}`;

    return [
        {
            label: 'pooler-session',
            url: buildPostgresUrl({
                host: poolerHost,
                port: process.env.SUPABASE_POOLER_PORT || '5432',
                user: poolerUser,
                password,
                database,
            }),
        },
        {
            label: 'pooler-transaction',
            url: buildPostgresUrl({
                host: poolerHost,
                port: process.env.SUPABASE_POOLER_TX_PORT || '6543',
                user: poolerUser,
                password,
                database,
            }),
        },
        {
            label: 'direct',
            url: buildPostgresUrl({
                host: process.env.SUPABASE_DB_HOST || `db.${projectId}.supabase.co`,
                port: process.env.SUPABASE_DB_PORT || '5432',
                user: process.env.SUPABASE_DB_USER || 'postgres',
                password,
                database,
            }),
        },
    ];
}

function printMissingEnvHelp() {
    console.error('Missing database connection for `supabase db push`.');
    console.error('');
    console.error('Recommended: set SUPABASE_DB_URL in packages/database/.env');
    console.error('  (Supabase Dashboard → Connect → Session pooler URI)');
    console.error('');
    console.error('Fallback: SUPABASE_PROJECT_ID + SUPABASE_DB_PASSWORD');
    console.error('  (Dashboard → Project Settings → Database → Database password)');
}

function runDbPush(dbUrl) {
    return new Promise((resolvePromise) => {
        const supabaseArgs = ['db', 'push', '--yes', '--db-url', dbUrl];
        const command = `pnpm exec supabase ${supabaseArgs.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg)).join(' ')}`;
        const child = spawn(command, {
            stdio: 'inherit',
            env: { ...process.env, CI: 'true' },
            cwd: repoRoot,
            shell: true,
        });
        child.on('close', (code) => resolvePromise(code ?? 1));
    });
}

async function main() {
    const candidates = resolveDbUrlCandidates();
    if (candidates.length === 0) {
        printMissingEnvHelp();
        process.exit(1);
    }

    console.log('Applying Supabase migrations (supabase db push)...');

    let lastCode = 1;
    for (const candidate of candidates) {
        console.log(`Trying ${candidate.label}...`);
        lastCode = await runDbPush(candidate.url);
        if (lastCode === 0) {
            console.log('Database migrations applied successfully.');
            return;
        }
        console.warn(`  ${candidate.label} failed (exit ${lastCode}), trying next endpoint...`);
    }

    console.error(`supabase db push failed after ${candidates.length} connection attempt(s).`);
    process.exit(lastCode);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
