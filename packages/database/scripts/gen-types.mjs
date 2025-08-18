import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure output dir exists
const typesDir = resolve(__dirname, '../types');
if (!existsSync(typesDir)) {
    mkdirSync(typesDir, { recursive: true });
}

// Validate required env vars
const projectId = process.env.SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!projectId) {
    console.error('Missing SUPABASE_PROJECT_ID (or SUPABASE_PROJECT_REF) in environment.');
    process.exit(1);
}

const supabaseArgs = [
    'gen',
    'types',
    'typescript',
    '--schema',
    'public',
    '--project-id',
    projectId,
];

console.log('Generating Supabase types...');
// Build a cross-platform shell command to avoid Windows spawn EINVAL issues
const command = `npx supabase ${supabaseArgs.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`;
const child = spawn(command, {
    stdio: ['ignore', 'pipe', 'inherit'],
    env: {
        ...process.env,
        ...(accessToken ? { SUPABASE_ACCESS_TOKEN: accessToken } : {}),
        SUPABASE_PROJECT_ID: projectId,
    },
    cwd: resolve(__dirname, '..'),
    shell: true,
});

/**
 * Capture stdout and write to file at the end to avoid partial writes on Windows.
 */
let stdoutBuf = '';
child.stdout.on('data', (chunk) => {
    stdoutBuf += chunk.toString();
});

child.on('close', (code) => {
    if (code !== 0) {
        console.error(`supabase gen types exited with code ${code}`);
        process.exit(code ?? 1);
    }
    const outPath = resolve(typesDir, 'database.types.ts');
    try {
        // Write synchronously to ensure file is complete
        import('node:fs')
            .then(({ writeFileSync }) => {
                writeFileSync(outPath, stdoutBuf, 'utf8');
                console.log(`Wrote ${outPath}`);
            })
            .catch((err) => {
                console.error('Failed to write types file:', err);
                process.exit(1);
            });
    } catch (err) {
        console.error('Failed to write types file:', err);
        process.exit(1);
    }
});
