export const SYSTEM_ROUTE_ROOTS = [
  "/login",
  "/register",
  "/ref",
  "/dashboard",
  "/documentation",
  "/pricing",
  "/privacy",
  "/terms",
  "/alternatives",
  "/compare",
  "/solutions",
  "/features",
  "/tools",
  "/templates",
  "/guides",
  "/open-in-browser",
  "/admin",
  "/api",
  "/assets",
  "/auth",
  "/cdn-cgi",
  "/404",
] as const;

export const PUBLIC_RESERVED_SLUGS = SYSTEM_ROUTE_ROOTS.map((root) =>
  root.slice(1).toLowerCase(),
);

export const PUBLIC_SLUG_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export function isSystemRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return SYSTEM_ROUTE_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

export function isReservedPublicSlug(slug: string): boolean {
  return PUBLIC_RESERVED_SLUGS.includes(slug.trim().toLowerCase());
}

export function isValidPublicSlug(slug: string): boolean {
  return PUBLIC_SLUG_PATTERN.test(slug) && !isReservedPublicSlug(slug);
}
