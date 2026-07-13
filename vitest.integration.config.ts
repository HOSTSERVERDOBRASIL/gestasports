import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL } from "./src/__tests__/integration/testEnv.js";

export default defineConfig({
  test: {
    include: ["src/__tests__/integration/**/*.test.ts"],
    environment: "node",
    globalSetup: ["src/__tests__/integration/globalSetup.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      NODE_ENV: "test",
      JWT_SECRET: "test-secret-not-for-production-0123456789"
    }
  }
});
