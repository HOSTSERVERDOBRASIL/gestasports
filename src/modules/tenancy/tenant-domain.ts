import { env } from "../../config/env.js";

const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeHostname(rawHost: string | null | undefined) {
  const cleanHost = (rawHost ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");

  return cleanHost;
}

export function platformHostname() {
  return normalizeHostname(env.SAAS_APP_HOST) || "gestasports.com.br";
}

export function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "";
}

export function isPlatformHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  const platformHost = platformHostname();
  return normalized === platformHost || normalized === `www.${platformHost}`;
}

export function isTenantSlug(value: string) {
  return TENANT_SLUG_PATTERN.test(value);
}

export function isValidHostname(value: string) {
  const hostname = normalizeHostname(value);

  if (!hostname || hostname.length > 253 || hostname.includes("..")) {
    return false;
  }

  return hostname.split(".").every((label) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

export function isPlatformSubdomain(hostname: string) {
  const normalized = normalizeHostname(hostname);
  const platformHost = platformHostname();
  return normalized.endsWith(`.${platformHost}`) && !isPlatformHostname(normalized);
}

export function tenantSlugFromHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  const platformHost = platformHostname();
  const suffix = `.${platformHost}`;

  if (isLocalHostname(normalized) || normalized === platformHost || !normalized.endsWith(suffix)) {
    return "";
  }

  const slug = normalized.slice(0, -suffix.length);
  return slug && !slug.includes(".") && isTenantSlug(slug) ? slug : "";
}

export function isProtectedPlatformDomain(hostname: string) {
  const normalized = normalizeHostname(hostname);
  return isLocalHostname(normalized) || isPlatformHostname(normalized);
}

export function tenantDefaults(slug: string) {
  const normalizedSlug = slug.toLowerCase();

  return {
    defaultSubdomain: `${normalizedSlug}.${platformHostname()}`,
    databaseName: `gestasports_${normalizedSlug.replaceAll("-", "_")}`
  };
}

export function tenantPrimaryUrl(slug: string) {
  return `https://${tenantDefaults(slug).defaultSubdomain}`;
}

export function tenantPathUrl(slug: string) {
  return `https://${platformHostname()}/${slug.toLowerCase()}`;
}
