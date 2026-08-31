import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const packageDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            '@gemini-proxy/core': path.resolve(packageDir, '../../packages/core/src/index.ts'),
            '@gemini-proxy/database': path.resolve(packageDir, '../../packages/database/index.ts'),
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
