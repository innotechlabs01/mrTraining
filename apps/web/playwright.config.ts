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
      name: 'setup-coach',
      testMatch: /.*\.setup\.ts/,
      testIgnore: /.*\.spec\.ts/,
    },
    {
      name: 'setup-athlete',
      testMatch: /.*\.setup\.ts/,
      testIgnore: /.*\.spec\.ts/,
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: '.auth/coach.json',
      },
      dependencies: ['setup-coach'],
    },
    {
      name: 'chromium-athlete',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: '.auth/athlete.json',
      },
      dependencies: ['setup-athlete'],
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