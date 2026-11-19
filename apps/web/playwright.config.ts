import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: require.resolve('./tests/api/global-setup'),
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup-clerk-coach',
      testMatch: /tests\/api\/setup-clerk-coach\.ts/,
      testIgnore: /.*\.spec\.ts/,
    },
    {
      name: 'chromium',
      testIgnore: [
        /tests\/public\/.*\.spec\.ts/,
        /tests\/api\/.*\.spec\.ts/,
        /tests\/api\/setup-clerk-coach\.ts/,
        // Jest unit tests (not Playwright E2E tests) — they use `jest` and
        // cannot run under the Playwright runner.
        /tests\/auth\//,
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/coach.json',
      },
      dependencies: ['setup-clerk-coach'],
    },
    {
      name: 'api-tests',
      testMatch: /tests\/api\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  expect: {
    toHaveScreenshot: { maxDiffPixels: 100 },
  },
});
