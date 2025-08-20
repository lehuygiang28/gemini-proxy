import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
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
    tsconfig: './tsconfig.json',
    platform: 'browser',
    esbuildOptions(options) {
        options.mainFields = ['browser', 'module', 'main'];
        options.conditions = ['worker', 'browser', 'module', 'import'];
    },
});
