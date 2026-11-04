import { defineConfig } from 'tsup';

// Dual ESM + CJS output: Vite (web) consumes ESM, NestJS (api) consumes CJS.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
});
