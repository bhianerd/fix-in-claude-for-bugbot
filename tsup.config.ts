import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/content.ts'],
  format: ['iife'],
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: false,
  minify: false,
  noExternal: [/.*/],
});
