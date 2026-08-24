#!/usr/bin/env node
/**
 * Load Cloudflare / Supabase env for OpenNext build & deploy.
 * Sources (first wins): existing process.env → .dev.vars → wrangler.jsonc [vars]
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wranglerConfig = join(root, 'wrangler.jsonc');
const devVarsPath = join(root, '.dev.vars');

function loadDotEnvFile(path) {
    if (!existsSync(path)) return;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
        ) {
            val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = val;
    }
}

function loadWranglerVars() {
    if (!existsSync(wranglerConfig)) return;
    const json = readFileSync(wranglerConfig, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
    const match = json.match(/"vars"\s*:\s*(\{[\s\S]*?\})\s*,/);
    if (!match) return;
    try {
        const vars = JSON.parse(match[1]);
        for (const [key, val] of Object.entries(vars)) {
            if (typeof val === 'string' && val.length > 0 && process.env[key] === undefined) {
                process.env[key] = val;
            }
        }
    } catch {
        // ignore parse errors
    }
}

function runOpenNext(subcommand) {
    const args = [
        '--filter',
        'web',
        'exec',
        'opennextjs-cloudflare',
        subcommand,
        '--config',
        wranglerConfig,
    ];
    if (subcommand === 'deploy') {
        args.push('--', '--keep-vars');
    }
    const result = spawnSync('pnpm', args, { stdio: 'inherit', env: process.env, cwd: root });
    if (result.status !== 0) process.exit(result.status ?? 1);
}

loadDotEnvFile(devVarsPath);
loadWranglerVars();

const mode = process.argv[2];
switch (mode) {
    case 'build':
        runOpenNext('build');
        break;
    case 'deploy':
        runOpenNext('deploy');
        break;
    case 'full':
        runOpenNext('build');
        runOpenNext('deploy');
        break;
    default:
        console.error('Usage: node scripts/cf-env.mjs <build|deploy|full>');
        process.exit(1);
}
