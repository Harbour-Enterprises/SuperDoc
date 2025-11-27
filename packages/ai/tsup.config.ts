import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  dts: true,
  clean: true, // Always clean dist folder before build
  minify: true, // Minify the output
  sourcemap: false,
  outDir: 'dist',
  target: 'es2020',
  external: ['superdoc', 'prosemirror-model', 'prosemirror-state', 'prosemirror-view'],
});
