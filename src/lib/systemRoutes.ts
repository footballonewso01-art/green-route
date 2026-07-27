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
] as const;

export function isSystemRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return SYSTEM_ROUTE_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}
