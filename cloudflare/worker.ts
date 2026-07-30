import securityHeaders from "../config/security-headers.json";
import {
  isPrimaryWwwDomain,
  isRedirectAliasDomain,
} from "../src/lib/siteConfig";
import { isSystemRoute } from "../src/lib/systemRoutes";
import {
  createPrimaryRedirectUrl,
  decideEdgeRoute,
  isLikelyStaticAssetPath,
} from "./router";

interface AssetBinding {
  fetch(request: Request): Promise<Response>;
}

interface VersionMetadata {
  id?: string;
  tag?: string;
  timestamp?: string;
}

interface Env {
  ASSETS: AssetBinding;
  DEPLOY_ENV: "production" | "staging";
  ROUTING_MODE: "primary" | "alias";
  WORKER_VERSION?: VersionMetadata;
}

const INTERNAL_ASSETS = {
  landing: "/_linktery/landing",
  spa: "/_linktery/app-shell",
  notFound: "/_linktery/not-found",
} as const;

const BLOCKED_ARTIFACT_PATHS = new Set([
  "/index.html",
  "/landing.html",
  "/app-shell.html",
  "/404.html",
]);

function shouldForceNoIndex(request: Request, env: Env): boolean {
  const hostname = new URL(request.url).hostname.toLowerCase();
  return env.DEPLOY_ENV !== "production" || hostname.endsWith(".workers.dev");
}

function applyResponseHeaders(
  request: Request,
  env: Env,
  response: Response,
  options: {
    status?: number;
    noIndex?: boolean;
    contentType?: string;
    cacheControl?: string;
  } = {},
): Response {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(securityHeaders)) {
    headers.set(name, value);
  }
  if (options.noIndex || shouldForceNoIndex(request, env)) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  if (options.contentType) headers.set("Content-Type", options.contentType);
  if (options.cacheControl) headers.set("Cache-Control", options.cacheControl);
  if (env.WORKER_VERSION?.id) {
    headers.set("X-Linktery-Worker-Version", env.WORKER_VERSION.id);
  }

  return new Response(request.method === "HEAD" ? null : response.body, {
    status: options.status ?? response.status,
    statusText: response.statusText,
    headers,
  });
}

async function fetchAsset(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response> {
  const assetUrl = new URL(pathname, request.url);
  const headers = new Headers(request.headers);

  // Internal HTML artifacts are implementation details, not the originally
  // requested resource. Forwarding validators or Range headers can make the
  // asset binding return 304/412/206 for a shell that the Worker must turn into
  // a complete 200 or branded 404 response.
  for (const name of [
    "if-match",
    "if-none-match",
    "if-modified-since",
    "if-unmodified-since",
    "if-range",
    "range",
  ]) {
    headers.delete(name);
  }

  return env.ASSETS.fetch(new Request(assetUrl, {
    method: request.method,
    headers,
  }));
}

async function serveInternalHtml(
  request: Request,
  env: Env,
  pathname: string,
  options: { status?: number; noIndex?: boolean } = {},
): Promise<Response> {
  const assetResponse = await fetchAsset(request, env, pathname);
  if (!assetResponse.ok) {
    throw new Error("Required frontend artifact is unavailable.");
  }

  return applyResponseHeaders(request, env, assetResponse, {
    status: options.status,
    noIndex: options.noIndex,
    contentType: "text/html; charset=utf-8",
    cacheControl: "public, max-age=0, must-revalidate",
  });
}

async function serveRequestedAsset(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const assetResponse = await env.ASSETS.fetch(request);
  if (assetResponse.status === 404) return null;
  return applyResponseHeaders(request, env, assetResponse);
}

function redirectResponse(
  request: Request,
  env: Env,
  destination: string,
): Response {
  const currentUrl = new URL(request.url);
  const targetUrl = new URL(destination, currentUrl);
  targetUrl.search = currentUrl.search;

  return applyResponseHeaders(
    request,
    env,
    new Response(null, {
      status: 308,
      headers: { Location: targetUrl.toString() },
    }),
    { noIndex: shouldForceNoIndex(request, env) },
  );
}

function isAliasRequest(request: Request, env: Env): boolean {
  const hostname = new URL(request.url).hostname.toLowerCase();
  return env.ROUTING_MODE === "alias" || isRedirectAliasDomain(hostname);
}

function redirectToPrimary(
  request: Request,
  env: Env,
  pathname: string,
): Response {
  const canonical = createPrimaryRedirectUrl(request.url, pathname);

  return applyResponseHeaders(
    request,
    env,
    new Response(null, {
      status: 308,
      headers: { Location: canonical.toString() },
    }),
    { noIndex: true },
  );
}

async function handleAliasRequest(
  request: Request,
  env: Env,
): Promise<Response | null> {
  if (!isAliasRequest(request, env)) return null;

  const url = new URL(request.url);
  if (isPrimaryWwwDomain(url.hostname)) {
    return redirectToPrimary(request, env, url.pathname);
  }

  if (isLikelyStaticAssetPath(url.pathname)) {
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return applyResponseHeaders(request, env, assetResponse, {
        noIndex: true,
      });
    }
  }

  if (url.pathname === "/") {
    return redirectToPrimary(request, env, url.pathname);
  }

  const decision = decideEdgeRoute(url.pathname);
  if (decision.kind === "redirect") {
    return redirectToPrimary(request, env, decision.destination);
  }
  if (decision.kind === "spa" && decision.routeType === "system") {
    return redirectToPrimary(request, env, url.pathname);
  }

  // SEO namespaces are reserved from public slugs, but only routes with a
  // generated static asset should canonicalize from an alias. Unknown routes
  // must remain true 404s instead of becoming a redirect chain to an apex 404.
  if (isSystemRoute(url.pathname)) {
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return redirectToPrimary(request, env, url.pathname);
    }
  }

  return null;
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return applyResponseHeaders(
      request,
      env,
      new Response("Method not allowed.", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      }),
      { noIndex: true, cacheControl: "no-store" },
    );
  }

  const url = new URL(request.url);
  if (
    BLOCKED_ARTIFACT_PATHS.has(url.pathname) ||
    url.pathname.startsWith("/_linktery")
  ) {
    return serveInternalHtml(request, env, INTERNAL_ASSETS.notFound, {
      status: 404,
      noIndex: true,
    });
  }

  const aliasResponse = await handleAliasRequest(request, env);
  if (aliasResponse) return aliasResponse;

  const decision = decideEdgeRoute(url.pathname);

  switch (decision.kind) {
    case "landing":
      return serveInternalHtml(request, env, INTERNAL_ASSETS.landing);
    case "spa":
      return serveInternalHtml(request, env, INTERNAL_ASSETS.spa, {
        noIndex: decision.noIndex,
      });
    case "redirect":
      return redirectResponse(request, env, decision.destination);
    case "not-found": {
      if (url.pathname !== "/404") {
        const assetResponse = await serveRequestedAsset(request, env);
        if (assetResponse) return assetResponse;
      }
      return serveInternalHtml(request, env, INTERNAL_ASSETS.notFound, {
        status: 404,
        noIndex: true,
      });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch {
      return applyResponseHeaders(
        request,
        env,
        new Response("The Linktery frontend is temporarily unavailable.", {
          status: 500,
        }),
        { noIndex: true, cacheControl: "no-store" },
      );
    }
  },
};
