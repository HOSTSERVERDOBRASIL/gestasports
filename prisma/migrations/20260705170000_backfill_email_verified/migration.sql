-- Accounts that exist before this feature shipped (and anything created outside the
-- self-service invite-register flow, e.g. by an admin or the superadmin panel) were never
-- through an email verification step. Treat them as verified so the login gate added
-- alongside this migration doesn't lock out existing users.
UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;
