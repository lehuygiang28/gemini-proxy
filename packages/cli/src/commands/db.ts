import { Command } from 'commander';
import ora from 'ora';
import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { confirm } from '@inquirer/prompts';
import { ErrorHandler } from '../lib/error-handler';
import { Logger } from '../lib/logger';

export function dbCommands(program: Command) {
    const db = program.command('db').description('Manage Supabase database operations');

    db.command('push')
        .description('Push database schema to Supabase (runs "supabase db push")')
        .option('-p, --project-id <id>', 'Supabase project ID (SUPABASE_PROJECT_ID)')
        .option('--db-password <password>', 'Database password (SUPABASE_DB_PASSWORD)')
        .option('--cwd <path>', 'Working directory containing Supabase config', '')
        .option('--execute-sql', 'After push, execute SQL file (default: sql/schema.sql)')
        .option('--sql-file <path>', 'Relative SQL file path from cwd (e.g. sql/schema.sql)')
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

                // Optionally execute SQL after push
                if (options.executeSql) {
                    const workingDir = options.cwd
                        ? resolve(process.cwd(), options.cwd)
                        : resolve(process.cwd(), 'packages', 'database');
                    const projectIdSafe =
                        options.projectId ||
                        process.env.SUPABASE_PROJECT_ID ||
                        process.env.SUPABASE_PROJECT_REF;

                    // Resolve SQL file path with fallbacks:
                    // 1) explicit --sql-file relative to cwd
                    // 2) packaged SQL from @lehuygiang28/gemini-proxy-db/sql/schema.sql
                    // 3) repo default packages/database/sql/schema.sql (dev fallback)
                    let sqlPath = '' as string;
                    if (options.sqlFile) {
                        sqlPath = resolve(workingDir, options.sqlFile);
                    } else {
                        try {
                            const require = createRequire(import.meta.url);
                            sqlPath = require.resolve(
                                '@lehuygiang28/gemini-proxy-db/sql/schema.sql',
                            );
                        } catch {
                            sqlPath = resolve(workingDir, 'sql', 'schema.sql');
                        }
                    }

                    if (!existsSync(sqlPath)) {
                        throw ErrorHandler.createError(
                            `SQL file not found: ${sqlPath}. Use --sql-file to specify the correct path`,
                            { code: 'SQL_FILE_NOT_FOUND', exitCode: 1 },
                        );
                    }

                    spinner.text = 'Executing SQL file via Supabase CLI...';

                    const executeArgs = ['db', 'execute', '--file', sqlPath];
                    // Provide project ref explicitly to target the correct remote
                    if (projectIdSafe) {
                        executeArgs.push('--project-ref', projectIdSafe);
                    }

                    const execCmd = `npx supabase ${executeArgs
                        .map((a) => (/\s/.test(String(a)) ? JSON.stringify(a) : String(a)))
                        .join(' ')}`;

                    const childExec = spawn(execCmd, {
                        stdio: 'inherit',
                        env: {
                            ...process.env,
                            SUPABASE_DB_PASSWORD:
                                options.dbPassword || process.env.SUPABASE_DB_PASSWORD,
                            SUPABASE_PROJECT_ID: projectIdSafe,
                        },
                        cwd: workingDir,
                        shell: true,
                    });

                    await new Promise<void>((resolvePromise, rejectPromise) => {
                        childExec.on('error', (err) => rejectPromise(err));
                        childExec.on('close', (code) => {
                            if (code !== 0) {
                                rejectPromise(
                                    ErrorHandler.createError(
                                        `supabase db execute exited with code ${code}`,
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
                }

                spinner.succeed('Database schema pushed successfully.');
            } catch (error) {
                spinner.stop();
                ErrorHandler.handle(error, 'db push');
            }
        });

    db.command('reset')
        .description('Reset the remote database to a clean state (DESTRUCTIVE)')
        .option('-p, --project-id <id>', 'Supabase project ID (SUPABASE_PROJECT_ID)')
        .option('--db-password <password>', 'Database password (SUPABASE_DB_PASSWORD)')
        .option('--cwd <path>', 'Working directory containing Supabase config', '')
        .option('-f, --force', 'Skip confirmation (DANGEROUS)')
        .action(async (options) => {
            const spinner = ora('Preparing to reset remote database...');
            try {
                const projectId: string | undefined =
                    options.projectId ||
                    process.env.SUPABASE_PROJECT_ID ||
                    process.env.SUPABASE_PROJECT_REF;
                const dbPassword: string | undefined =
                    options.dbPassword || process.env.SUPABASE_DB_PASSWORD;

                if (!dbPassword) {
                    throw ErrorHandler.createError(
                        'SUPABASE_DB_PASSWORD is required (use --db-password or set env)',
                        { code: 'DB_PASSWORD_MISSING', exitCode: 1 },
                    );
                }

                if (!projectId) {
                    throw ErrorHandler.createError(
                        'SUPABASE_PROJECT_ID is required (use --project-id or set env)',
                        { code: 'PROJECT_ID_MISSING', exitCode: 1 },
                    );
                }

                if (!options.force) {
                    const proceed = await confirm({
                        message:
                            'This will PRUNE ALL SCHEMAS AND DATA on the remote database and re-apply migrations. Continue?',
                        default: false,
                    });
                    if (!proceed) {
                        console.log('Operation cancelled.');
                        return;
                    }
                }

                // Determine working directory for supabase CLI. Default to packages/database
                const workingDir = options.cwd
                    ? resolve(process.cwd(), options.cwd)
                    : resolve(process.cwd(), 'packages', 'database');

                Logger.debug('Running supabase db reset --remote', {
                    workingDir,
                    projectId,
                });
                spinner.start();

                const supabaseArgs = ['db', 'reset', '--remote'];
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
                                    `supabase db reset exited with code ${code}`,
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

                spinner.succeed('Remote database reset successfully.');
            } catch (error) {
                spinner.stop();
                ErrorHandler.handle(error, 'db reset');
            }
        });
}
