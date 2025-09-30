import { Command } from 'commander';
import ora from 'ora';
import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { ErrorHandler } from '../lib/error-handler';
import { Logger } from '../lib/logger';

export function dbCommands(program: Command) {
    const db = program.command('db').description('Manage Supabase database operations');

    db.command('push')
        .description('Push database schema to Supabase (runs "supabase db push")')
        .option('-p, --project-id <id>', 'Supabase project ID (SUPABASE_PROJECT_ID)')
        .option('--db-password <password>', 'Database password (SUPABASE_DB_PASSWORD)')
        .option('--cwd <path>', 'Working directory containing Supabase config', '')
        .action(async (options) => {
            const spinner = ora('Pushing database schema to Supabase...').start();
            try {
                const projectId: string | undefined =
                    options.projectId ||
                    process.env.SUPABASE_PROJECT_ID ||
                    process.env.SUPABASE_PROJECT_REF;
                const dbPassword: string | undefined =
                    options.dbPassword || process.env.SUPABASE_DB_PASSWORD;

                if (!dbPassword) {
                    spinner.fail('Missing SUPABASE_DB_PASSWORD. Provide via --db-password or env.');
                    throw ErrorHandler.createError('SUPABASE_DB_PASSWORD is required', {
                        code: 'DB_PASSWORD_MISSING',
                        exitCode: 1,
                    });
                }

                if (!projectId) {
                    spinner.fail('Missing SUPABASE_PROJECT_ID. Provide via --project-id or env.');
                    throw ErrorHandler.createError('SUPABASE_PROJECT_ID is required', {
                        code: 'PROJECT_ID_MISSING',
                        exitCode: 1,
                    });
                }

                // Determine working directory for supabase CLI. Default to packages/database
                const workingDir = options.cwd
                    ? resolve(process.cwd(), options.cwd)
                    : resolve(process.cwd(), 'packages', 'database');

                Logger.debug('Running supabase db push', { workingDir, projectId });

                const supabaseArgs = ['db', 'push'];
                const command = `npx supabase ${supabaseArgs
                    .map((a) => (/\s/.test(a) ? JSON.stringify(a) : a))
                    .join(' ')}`;

                const child = spawn(command, {
                    stdio: 'inherit',
                    env: {
                        ...process.env,
                        SUPABASE_DB_PASSWORD: dbPassword,
                        SUPABASE_PROJECT_ID: projectId,
                    },
                    cwd: workingDir,
                    shell: true,
                });

                await new Promise<void>((resolvePromise, rejectPromise) => {
                    child.on('error', (err) => rejectPromise(err));
                    child.on('close', (code) => {
                        if (code !== 0) {
                            rejectPromise(
                                ErrorHandler.createError(
                                    `supabase db push exited with code ${code}`,
                                    {
                                        code: 'SUPABASE_CLI_ERROR',
                                        exitCode: code ?? 1,
                                    },
                                ),
                            );
                            return;
                        }
                        resolvePromise();
                    });
                });

                spinner.succeed('Database schema pushed successfully.');
            } catch (error) {
                spinner.stop();
                ErrorHandler.handle(error, 'db push');
            }
        });
}
