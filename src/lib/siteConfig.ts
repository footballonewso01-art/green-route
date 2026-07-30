// Canonical product domain and shared redirect aliases are deliberately
// separate. Aliases may serve user slugs, but must never become the canonical
// host for system pages, SEO metadata or safe fallbacks.
export const PRIMARY_DOMAIN = "linktery.com";
export const PRIMARY_ORIGIN = `https://${PRIMARY_DOMAIN}`;

export const REDIRECT_ALIAS_DOMAINS = [
  "linktery.bio",
  "hotme.online",
  "hotmylinks.cc",
] as const;

export const DEFAULT_AVAILABLE_DOMAINS = [
  PRIMARY_DOMAIN,
  ...REDIRECT_ALIAS_DOMAINS,
];

export function isPrimaryWwwDomain(hostname: string): boolean {
  return hostname.trim().toLowerCase() === `www.${PRIMARY_DOMAIN}`;
}

export function isRedirectAliasDomain(hostname: string): boolean {
  const normalizedHostname = hostname.trim().toLowerCase();
  return (
    isPrimaryWwwDomain(normalizedHostname) ||
    REDIRECT_ALIAS_DOMAINS.some((domain) => domain === normalizedHostname)
  );
}

export function getAvailableDomains(configuredDomains?: string): string[] {
  const configured = (configuredDomains || "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  // Keep the primary domain first even if Vercel has an empty or differently
  // ordered VITE_AVAILABLE_DOMAINS value.
  return Array.from(new Set([
    PRIMARY_DOMAIN,
    ...(configured.length ? configured : DEFAULT_AVAILABLE_DOMAINS),
  ]));
}
