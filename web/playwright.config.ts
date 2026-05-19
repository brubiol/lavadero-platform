import { defineConfig } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: isCI ? 1 : 0,
  reporter: isCI ? 'github' : 'list',
  use: {
    // CI: full Docker Compose stack on 5173; local: Vite dev server on 5174
    baseURL: isCI ? 'http://localhost:5173' : 'http://localhost:5174',
    headless: true,
    screenshot: 'only-on-failure',
  },
  // In CI the stack is already up via docker compose; skip the dev server
  ...(isCI
    ? {}
    : {
        webServer: {
          command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
          port: 5174,
          reuseExistingServer: true,
          timeout: 30_000,
        },
      }),
})
