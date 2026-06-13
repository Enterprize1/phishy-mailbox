import {fileURLToPath} from 'url';
import {defineConfig} from 'vitest/config';
import {config as loadEnv} from 'dotenv';

// Load the test environment (DATABASE_URL -> port 5434, NODE_ENV=test) into the
// main process so that globalSetup (prisma db push) sees it. Worker processes
// re-load it via the first setup file (see load-env.ts).
loadEnv({path: '.env.test'});

export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globalSetup: ['./test/integration/global-setup.ts'],
    // load-env.ts MUST come first so DATABASE_URL is set before any module
    // (env.mjs / PrismaClient) is imported in setup.ts or the test files.
    setupFiles: ['./test/integration/load-env.ts', './test/integration/setup.ts'],
    include: ['src/**/*.test.ts'],
    // Each test runs inside its own rolled-back transaction (see setup.ts), so
    // tests within a file must not run concurrently against the same client.
    // Files still run in parallel across workers, each with its own client.
    fileParallelism: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage/unit',
      include: ['src/server/**', 'src/utils/**'],
      exclude: ['**/*.test.ts', 'src/server/api/trpc.ts'],
    },
  },
});
