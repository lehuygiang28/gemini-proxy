import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate required env vars
const projectId = process.env.SUPABASE_PROJECT_ID;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!dbPassword) {
    console.error(
        'Missing SUPABASE_DB_PASSWORD in environment. Please run "supabase link" first or set the variable.',
    );
    process.exit(1);
}

if (!projectId) {
    console.error(
        'Missing SUPABASE_PROJECT_ID in environment. Please run "supabase init" first or set the variable.',
    );
    process.exit(1);
}

const supabaseArgs = ['db', 'push'];

console.log('Pushing database schema to Supabase...');
// Build a cross-platform shell command to avoid Windows spawn EINVAL issues
const command = `npx supabase ${supabaseArgs.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`;
const child = spawn(command, {
    stdio: 'inherit',
    env: {
        ...process.env,
        SUPABASE_DB_PASSWORD: dbPassword,
    },
    cwd: resolve(__dirname, '..'),
    shell: true,
});

child.on('close', (code) => {
    if (code !== 0) {
        console.error(`supabase db push exited with code ${code}`);
        process.exit(code ?? 1);
    }
    console.log('Database schema pushed successfully.');
});
