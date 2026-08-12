import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  webServer: [
    {
      command: 'pnpm --filter @temmuz/api dev',
      url: 'http://localhost:4000/health',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @temmuz/admin dev',
      url: 'http://localhost:3000/login',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @temmuz/widget dev',
      url: 'http://localhost:5173/src/widget.ts',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
