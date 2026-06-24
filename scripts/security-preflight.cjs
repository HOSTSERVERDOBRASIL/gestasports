const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const failures = [];

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

const authRoutes = read("src/modules/auth/auth.routes.ts");
const superadminRoutes = read("src/modules/superadmin/superadmin.routes.ts");
const superadminPage = read("frontend/src/pages/SuperadminPage.tsx");
const envConfig = read("src/config/env.ts");

assert(
  authRoutes.includes('env.NODE_ENV !== "production" ? resetUrl : undefined'),
  "Recuperação de senha não pode expor resetUrl em produção."
);

assert(
  envConfig.includes("SMTP_HOST") && envConfig.includes("obrigatórios em produção"),
  "Produção deve exigir SMTP para recuperação de senha."
);

assert(
  !superadminRoutes.includes('default("123456")') && !superadminRoutes.includes('bcrypt.hash("123456"'),
  "Superadmin não pode criar usuários com senha padrão 123456."
);

assert(
  !superadminPage.includes('adminPassword: "123456"') && !superadminPage.includes('password: "123456"'),
  "Frontend do superadmin não pode preencher senha inicial padrão."
);

if (failures.length > 0) {
  console.error("Security preflight failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Security preflight passed.");
