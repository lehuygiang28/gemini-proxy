import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/test-validation.ts', 'src/test-batch-operations.ts'],
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    target: 'es2022',
    bundle: true,
    skipNodeModulesBundle: true,
    // Keep database package external so its SQL assets remain available at runtime
    external: ['@lehuygiang28/gemini-proxy-db'],
    minify: false,
    tsconfig: '../../tsconfig.json',
    platform: 'node',
    esbuildOptions(options) {
        options.mainFields = ['module', 'main'];
    },
});
