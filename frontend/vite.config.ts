import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Qwizo React frontend (Phase 2+ migration).
// During development, /api/* is proxied to the existing Cloudflare Worker
// (wrangler dev on :18787) so the React app talks to the real backend.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Mirrors tsconfig paths — keeps dev and build resolving identically.
    alias: { '@': `${import.meta.dirname}/src` },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:18787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
