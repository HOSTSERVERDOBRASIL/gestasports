const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const schemaPath = path.join(root, "prisma", "schema.prisma");
const tenantContextPath = path.join(root, "src", "modules", "tenancy", "tenant-context.ts");

const controlPlaneModels = new Set([
  "SaaSCharge",
  "TenantDomain",
  "TenantModule"
]);

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

const schema = read(schemaPath);
const tenantContext = read(tenantContextPath);

const tenantIdModels = uniqueSorted(
  Array.from(schema.matchAll(/model\s+(\w+)\s+\{([\s\S]*?)\n\}/g))
    .filter(([, , body]) => /\btenantId\b/.test(body))
    .map(([, name]) => name)
);

const scopedModelsBlock = tenantContext.match(/tenantScopedModels\s*=\s*new Set\(\[([\s\S]*?)\]\)/);

if (!scopedModelsBlock) {
  console.error("Tenant scope registry audit failed: tenantScopedModels registry was not found.");
  process.exit(1);
}

const scopedModels = uniqueSorted(
  Array.from(scopedModelsBlock[1].matchAll(/"(\w+)"/g)).map(([, name]) => name)
);

const tenantIdModelSet = new Set(tenantIdModels);
const scopedModelSet = new Set(scopedModels);

const missing = tenantIdModels.filter((name) => !scopedModelSet.has(name) && !controlPlaneModels.has(name));
const stale = scopedModels.filter((name) => !tenantIdModelSet.has(name));
const invalidExceptions = Array.from(controlPlaneModels).filter((name) => !tenantIdModelSet.has(name));

if (missing.length || stale.length || invalidExceptions.length) {
  console.error("Tenant scope registry audit failed.");

  if (missing.length) {
    console.error("Models with tenantId missing from tenantScopedModels:");
    for (const model of missing) {
      console.error(`- ${model}`);
    }
  }

  if (stale.length) {
    console.error("Models in tenantScopedModels without tenantId:");
    for (const model of stale) {
      console.error(`- ${model}`);
    }
  }

  if (invalidExceptions.length) {
    console.error("Control-plane exceptions not found as tenant-owned Prisma models:");
    for (const model of invalidExceptions) {
      console.error(`- ${model}`);
    }
  }

  process.exit(1);
}

console.log(
  `Tenant scope registry audit passed: ${scopedModels.length} scoped models, ${controlPlaneModels.size} intentional control-plane exceptions.`
);
