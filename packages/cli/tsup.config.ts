import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    target: 'es2022',
    bundle: true,
    skipNodeModulesBundle: true,
    noExternal: ['@gemini-proxy/database'],
    minify: false,
    tsconfig: '../../tsconfig.json',
    platform: 'node',
    esbuildOptions(options) {
        options.mainFields = ['module', 'main'];
    },
});
