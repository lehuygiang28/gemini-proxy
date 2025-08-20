import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['index.ts'],
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    target: 'es2020',
    bundle: true,
    skipNodeModulesBundle: false,
    noExternal: [/^.*/],
    minify: false,
    tsconfig: '../../tsconfig.json',
    platform: 'node',
    esbuildOptions(options) {
        options.mainFields = ['module', 'main'];
    },
});
