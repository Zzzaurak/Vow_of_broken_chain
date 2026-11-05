import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://127.0.0.1:5179',
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
  },
  workers: 1,
});
