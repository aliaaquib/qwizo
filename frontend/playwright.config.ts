import { defineConfig, devices } from '@playwright/test';

// Qwizo e2e (Phase 14). Runs the real stack: Vite dev (with /api proxy) +
// the local Wrangler worker. Reuses already-running servers when present.
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
