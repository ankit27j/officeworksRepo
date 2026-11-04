import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const contractsSrc = fileURLToPath(new URL('../../packages/contracts/src/index.ts', import.meta.url));

// The API's port comes from the same root .env as the API itself, so changing API_PORT moves both.
const rootEnv = loadEnv('development', fileURLToPath(new URL('../../', import.meta.url)), '');
const apiTarget = process.env.API_PROXY_TARGET ?? `http://localhost:${rootEnv.API_PORT || 3000}`;

function apiProxy() {
  return { '/api': { target: apiTarget, changeOrigin: true } };
}

export default defineConfig({
  plugins: [react()],
  // The single .env lives at the repo root. Only VITE_-prefixed values reach the browser.
  envDir: '../../',
  resolve: {
    alias: { '@catalogue/contracts': contractsSrc },
  },
  // Same-origin /api in dev and preview, matching nginx in Docker, so the browser never needs CORS.
  server: { port: 5173, proxy: apiProxy() },
  preview: { port: 4173, proxy: apiProxy() },
  build: {
    rollupOptions: {
      output: {
        // Vendor code changes rarely; separate chunks stay cached across app releases.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          antd: ['antd', '@ant-design/icons'],
          state: ['mobx', 'mobx-react-lite', 'axios', 'zod'],
        },
      },
    },
    // Ant Design alone is ~700 kB minified (~230 kB gzipped); route-level code splitting is a next step.
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    restoreMocks: true,
    // Full-app tests render real Ant Design in jsdom, which generates and parses component CSS on first
    // use. A modal + form flow measured 7–16s on a slow Windows dev machine, so 15s gave false failures.
    testTimeout: 45_000,
  },
});
