import { moduleForPath, navigationSections } from "../frontend/src/data/navigation.ts";
import type { TenantModuleCode } from "../frontend/src/types/domain.ts";

const validModules = new Set<TenantModuleCode>([
  "ATHLETES",
  "ASSOCIATES",
  "CLUBS",
  "TEAMS",
  "GAMES",
  "LINEUPS",
  "CALLUPS",
  "COMPETITIONS",
  "EVENTS",
  "ATTENDANCE",
  "RANKINGS",
  "OFFICIAL_STATS",
  "FINANCE",
  "REPORTS",
  "DOCUMENTS",
  "COMMUNICATION",
  "GALLERY",
  "SETTINGS"
]);

const moduleNeutralClubPaths = new Set(["/"]);
const failures: string[] = [];

for (const section of navigationSections) {
  if (section.context !== "CLUB") {
    continue;
  }

  for (const item of section.items) {
    const entries = [
      { label: item.label, path: item.path },
      ...(item.children ?? []).map((child) => ({ label: `${item.label} > ${child.label}`, path: child.path }))
    ];

    for (const entry of entries) {
      const moduleCode = moduleForPath(entry.path);
      if (!moduleCode && !moduleNeutralClubPaths.has(entry.path)) {
        failures.push(`${entry.label} (${entry.path}) is not mapped to a tenant module.`);
        continue;
      }

      if (moduleCode && !validModules.has(moduleCode)) {
        failures.push(`${entry.label} (${entry.path}) maps to unknown tenant module ${moduleCode}.`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Navigation module audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Navigation module audit passed.");
