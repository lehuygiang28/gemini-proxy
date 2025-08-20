import { defineConfig } from 'tsup';

export default defineConfig({
    entry: [
        'src/index.ts',
        'src/app.ts',
        'src/types.ts',
        'src/utils/index.ts',
        'src/utils/usage-metadata-parser.ts',
    ],
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    target: 'es2020',
    bundle: true,
    skipNodeModulesBundle: false,
    noExternal: [/^.*/],
    platform: 'node',
    minify: false,
    tsconfig: './tsconfig.json',
    esbuildOptions(options) {
        options.mainFields = ['module', 'main'];
    },
});
