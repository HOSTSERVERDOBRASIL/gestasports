import { execSync } from "node:child_process";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
// Same default/override convention as src/__tests__/integration/testEnv.ts on the backend — local
// docker-compose Postgres by default, overridable for CI via TEST_DATABASE_URL.
export const E2E_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5434/flamilha_test?schema=public";
export const E2E_TENANT_SLUG = "gestasports-demo";
export const E2E_ADMIN_EMAIL = "admin@gestasports.com.br";
export const E2E_ADMIN_PASSWORD = "GestaSports@2026";

export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL, NODE_ENV: "development" };
  execSync("npx prisma migrate deploy", { cwd: REPO_ROOT, stdio: "inherit", env });
  execSync("npx tsx prisma/seed.ts", { cwd: REPO_ROOT, stdio: "inherit", env });
}
