import { defineConfig, devices } from "@playwright/test";
import { E2E_DATABASE_URL } from "./e2e/global-setup.js";

// Backend port must stay 3333: frontend/vite.config.mjs hardcodes its dev-server proxy target to
// http://127.0.0.1:3333 for /api and /health, and isn't configurable via env var.
const BACKEND_PORT = 3333;
const FRONTEND_PORT = 5399;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: "retain-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run dev",
      cwd: "..",
      url: `http://127.0.0.1:${BACKEND_PORT}/health`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        PORT: String(BACKEND_PORT),
        JWT_SECRET: "e2e-test-secret-not-for-production-0123456789",
        NODE_ENV: "development"
      }
    },
    {
      command: `npm run dev -- --port ${FRONTEND_PORT} --strictPort`,
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 30_000
    }
  ]
});
