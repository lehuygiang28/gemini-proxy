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
    platform: 'node',
    env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
    },
    esbuildOptions(options) {
        options.mainFields = ['module', 'main'];
        options.define = {
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        };
    },
});
