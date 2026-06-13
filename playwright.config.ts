import {defineConfig, devices} from '@playwright/test';
import {config as loadEnv} from 'dotenv';

// Test environment (test DB on 5434). Each worker boots its own Next server and
// clones its own database — see test/e2e/fixtures.ts and test/e2e/global-setup.ts.
loadEnv({path: '.env.test'});

export default defineConfig({
  testDir: './test/e2e',
  globalSetup: './test/e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // One server process + one database per worker, so keep the count modest.
  workers: process.env.PLAYWRIGHT_WORKERS ? Number(process.env.PLAYWRIGHT_WORKERS) : 2,
  reporter: 'html',
  use: {
    // baseURL is provided per worker by the `baseURL` fixture (dynamic port).
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
  ],
});
