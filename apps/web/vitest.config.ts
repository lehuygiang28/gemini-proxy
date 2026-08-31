import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@gemini-proxy/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
