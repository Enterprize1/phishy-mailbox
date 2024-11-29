import {defineConfig, devices} from '@playwright/test';
import {CoverageReportOptions} from "monocart-reporter";

const coverageReportOptions: CoverageReportOptions = {
  // logging: 'debug',
  name: 'Next.js V8 Coverage Report',

  entryFilter: (entry) => {
    return entry.url.includes('next/static/chunks') || entry.url.includes('next/server/app');
  },

  sourceFilter: (sourcePath) => {
    return sourcePath.startsWith('src/');
  },

  sourcePath: (fileSource) => {
    const list = ['_N_E/', 'phishy-mailbox/'];
    for (const pre of list) {
      if (fileSource.startsWith(pre)) {
        return fileSource.slice(pre.length);
      }
    }
    return fileSource;
  },

  reports: ['v8', 'codecov', 'console-summary']
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['monocart-reporter', {
      outputFile: './monocart-report/index.html',
      coverage: coverageReportOptions
    }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    trace: 'on',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'Desktop Chromium',
      use: {...devices['Desktop Chrome']},
    },
  ],
});
