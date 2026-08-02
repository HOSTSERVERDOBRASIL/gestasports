# Improvement Roadmap

Generated from the BMAD project scan on 2026-06-24.

## Priority 1: Frontend Performance and Navigation

Status: started.

- Keep route-level lazy loading in `frontend/src/routes/AppRoutes.tsx`.
- Preserve authenticated shell while lazy pages load.
- Continue splitting large domain files when changing them, especially `OperationsPages.tsx`, `ProductAreaPages.tsx`, `ArchivePages.tsx`, and `FinanceiroPage.tsx`.
- Watch production build output for chunks above 500 KB.

## Visual System Rule

Status: active.

- Preserve the GestaSports layout language: dense operational screens, compact cards, clear topbar/sidebar hierarchy, and sports-management workflows.
- Tenant/user configuration owns brand color decisions through CSS variables such as `--brand-primary`, `--brand-accent`, `--brand-menu`, `--shell-*`, and `--surface-*`.
- New shared UI should avoid hardcoded brand colors. Use fixed colors only for semantic states such as error, success, warning, Pix/payment status, or domain visuals such as the football pitch.
- Primary actions, active navigation, focus rings, highlights, and loading states should derive from configurable brand variables.

## Priority 2: Tenant Safety and Module Gating

- Keep `src/modules/tenancy/tenant-context.ts` aligned with every operational Prisma model that owns `tenantId`.
- Run `npm run test:tenant-scope` when adding tenant-owned models; control-plane SaaS models must stay explicit exceptions.
- Keep backend module gating in `src/modules/auth/auth.plugin.ts` aligned with frontend `frontend/src/data/navigation.ts`.
- Run `npm run test:navigation-modules` when adding club menu items so every navigable club route is gated by an enabled module.
- Add review checklist items for new tenant-owned models and new tenant modules.

## Priority 3: API Contract Confidence

- Document new endpoint groups in `docs/api-contracts-backend.md`.
- Add focused integration tests for auth, tenant blocking, and finance-critical endpoints.
- Prefer shared request/response types or generated schemas for high-risk endpoints.

## Priority 4: Frontend Maintainability

- Extract reusable table, empty-state, status badge, and form patterns from large page files.
- Keep new route pages lazy-loaded.
- Move repeated localStorage preference handling into small hooks when files are touched.

## Priority 5: Production Readiness

- Keep `npm run check` green before deploy.
- Validate `/health` against the target production database.
- Run `prisma migrate deploy` before starting a new production image.
- Review `.env.production` against `docs/deployment-guide.md` before each client rollout.

## Recently Completed

- Installed BMAD for Codex.
- Generated BMAD brownfield documentation under `docs/`.
- Reduced the main frontend bundle from roughly 1.37 MB to roughly 102 KB by lazy-loading route pages.
- Added an authenticated page-level loading boundary so sidebar and topbar remain visible during lazy page navigation.
- Migrated shared navigation, focus, primary actions, and loading states toward configurable theme/tenant color variables.
- Added a tenant scope registry audit to catch new tenant-owned Prisma models that are not protected by the tenant context plugin.
- Added a navigation module audit to catch club menu entries that are not tied to tenant module availability.
