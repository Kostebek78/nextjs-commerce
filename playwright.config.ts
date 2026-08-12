import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: [
    {
      command: 'pnpm --filter @temmuz/api dev',
      url: 'http://localhost:4000/health',
      reuseExistingServer: true,
    },
    {
      command: 'pnpm --filter @temmuz/admin dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
    },
  ],
});
