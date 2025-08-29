import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/main.ts'],
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    target: 'es2020',
    bundle: true,
    skipNodeModulesBundle: false,
    noExternal: ['@gemini-proxy/core'],
    external: ['@vercel/functions', 'node-appwrite'],
    platform: 'node',
    minify: false,
    tsconfig: './tsconfig.json',
    esbuildOptions(options) {
        options.mainFields = ['module', 'main'];
        options.conditions = ['import', 'node'];
    },
});
