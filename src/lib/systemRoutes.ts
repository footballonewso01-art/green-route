export const SYSTEM_ROUTE_ROOTS = [
  "/login",
  "/register",
  "/ref",
  "/dashboard",
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
  "/404",
] as const;

export const PUBLIC_RESERVED_SLUGS = SYSTEM_ROUTE_ROOTS.map((root) =>
  root.slice(1).toLowerCase(),
);

export function isSystemRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return SYSTEM_ROUTE_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

export function isReservedPublicSlug(slug: string): boolean {
  return PUBLIC_RESERVED_SLUGS.includes(slug.trim().toLowerCase());
}
