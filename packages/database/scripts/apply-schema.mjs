#!/usr/bin/env node

/**
 * @deprecated Use db-push.mjs — kept as alias for `pnpm db:apply`.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dbPush = resolve(scriptDir, 'db-push.mjs');

const child = spawn(process.execPath, [dbPush], {
    stdio: 'inherit',
    env: process.env,
});

child.on('close', (code) => process.exit(code ?? 0));
