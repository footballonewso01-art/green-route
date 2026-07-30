import {
  isValidPublicSlug,
  isSystemRoute,
  PUBLIC_SLUG_PATTERN,
} from "../src/lib/systemRoutes";
import { PRIMARY_ORIGIN } from "../src/lib/siteConfig";

export { isValidPublicSlug, PUBLIC_SLUG_PATTERN };

export function createPrimaryRedirectUrl(
  requestUrl: string,
  pathname: string,
): URL {
  const source = new URL(requestUrl);
  const target = new URL(PRIMARY_ORIGIN);
  target.pathname = pathname;
  target.search = source.search;
  return target;
}

const LEGACY_REDIRECTS: Readonly<Record<string, string>> = {
  "/features": "/features/link-management",
  "/tools": "/tools/utm-builder",
  "/templates": "/templates/link-in-bio",
  "/guides": "/guides/what-is-link-management",
};

const SPA_EXACT_ROUTES = new Set([
  "/login",
  "/register",
  "/auth",
  "/open-in-browser",
]);

export type EdgeRouteDecision =
  | { kind: "landing" }
  | { kind: "spa"; routeType: "system" | "public"; noIndex: boolean }
  | { kind: "redirect"; destination: string; status: 308 }
  | { kind: "not-found" };

function isSpaPrefixRoute(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/ref/")
  );
}

function isCanonicalizablePath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (LEGACY_REDIRECTS[pathname]) return true;
  if (SPA_EXACT_ROUTES.has(pathname) || isSpaPrefixRoute(pathname)) return true;
  if (isSystemRoute(pathname)) return true;

  const parts = pathname.slice(1).split("/");
  return parts.length === 1 && isValidPublicSlug(parts[0]);
}

function decideCanonicalPath(pathname: string): EdgeRouteDecision {
  if (pathname === "/") return { kind: "landing" };

  const legacyDestination = LEGACY_REDIRECTS[pathname];
  if (legacyDestination) {
    return { kind: "redirect", destination: legacyDestination, status: 308 };
  }

  if (SPA_EXACT_ROUTES.has(pathname) || isSpaPrefixRoute(pathname)) {
    return { kind: "spa", routeType: "system", noIndex: true };
  }

  if (pathname === "/404") return { kind: "not-found" };

  const segments = pathname.slice(1).split("/");
  if (segments.length === 1 && isValidPublicSlug(segments[0])) {
    return { kind: "spa", routeType: "public", noIndex: false };
  }

  // A matching static SEO asset should have been served before the Worker.
  // Missing reserved namespaces must remain true 404s instead of soft-404 SPA
  // responses.
  return { kind: "not-found" };
}

export function decideEdgeRoute(pathname: string): EdgeRouteDecision {
  if (
    !pathname.startsWith("/") ||
    pathname.includes("%") ||
    pathname.includes("\\") ||
    pathname.includes("//") ||
    pathname.startsWith("/_linktery")
  ) {
    return { kind: "not-found" };
  }

  const withoutTrailingSlash =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  const canonicalPath = withoutTrailingSlash.toLowerCase();

  if (
    canonicalPath !== pathname &&
    isCanonicalizablePath(canonicalPath)
  ) {
    return { kind: "redirect", destination: canonicalPath, status: 308 };
  }

  return decideCanonicalPath(pathname);
}

export function isLikelyStaticAssetPath(pathname: string): boolean {
  return (
    pathname.startsWith("/assets/") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\/[^/]+\.[a-z0-9]{1,12}$/i.test(pathname)
  );
}
