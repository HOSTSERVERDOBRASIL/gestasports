const { existsSync } = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const schemaEngineCandidates = [
  path.join(root, "node_modules", "@prisma", "engines", "schema-engine-windows.exe"),
  path.join(root, "node_modules", "@prisma", "engines", "schema-engine")
];

const schemaEngine = schemaEngineCandidates.find((candidate) => existsSync(candidate));
const env = { ...process.env };

if (schemaEngine && !env.PRISMA_SCHEMA_ENGINE_BINARY) {
  env.PRISMA_SCHEMA_ENGINE_BINARY = schemaEngine;
}

const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const prismaCommand = existsSync(prismaCli) ? process.execPath : process.platform === "win32" ? "npx.cmd" : "npx";
const prismaArgs = existsSync(prismaCli) ? [prismaCli, "validate"] : ["prisma", "validate"];
const result = spawnSync(prismaCommand, prismaArgs, {
  cwd: root,
  env,
  stdio: "inherit",
  shell: !existsSync(prismaCli) && process.platform === "win32"
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
