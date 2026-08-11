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
  POCKETBASE_ORIGIN: string;
  REDIRECT_ORIGIN_SECRET?: string;
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

async function serveAmbiguousOriginFallback(
  request: Request,
  env: Env,
): Promise<Response> {
  const assetResponse = await fetchAsset(request, env, INTERNAL_ASSETS.spa);
  if (!assetResponse.ok) {
    throw new Error("Required frontend artifact is unavailable.");
  }

  const marker = "<script>window.__LINKTERY_SUPPRESS_CLIENT_CLICK__=true;</script>";
  const source = await assetResponse.text();
  const html = source.includes("</head>")
    ? source.replace("</head>", `${marker}</head>`)
    : `${marker}${source}`;
  const headers = new Headers(assetResponse.headers);
  headers.delete("Content-Length");
  headers.delete("Content-Encoding");
  headers.delete("ETag");
  headers.delete("Last-Modified");

  return applyResponseHeaders(request, env, new Response(html, {
    status: 200,
    headers,
  }), {
    noIndex: true,
    contentType: "text/html; charset=utf-8",
    cacheControl: "private, no-store, max-age=0",
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

function getEdgeCountry(request: Request): string {
  const runtimeCountry = (request as Request & { cf?: { country?: string } }).cf?.country;
  const headerCountry = request.headers.get("CF-IPCountry") || "";
  const country = String(runtimeCountry || headerCountry).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(country) && country !== "XX" ? country : "";
}

/**
 * Resolve short links before booting the SPA. This preserves the original
 * social-app navigation context for deeplink handoffs and removes the React +
 * Records API round trips from the redirect hot path. A 404 means that the
 * slug may be a Public Profile (or missing), so the normal SPA resolver keeps
 * ownership of that response.
 */
async function resolvePublicSlugAtOrigin(
  request: Request,
  env: Env,
): Promise<Response | null> {
  if (request.method !== "GET") return null;

  const secret = String(env.REDIRECT_ORIGIN_SECRET || "");
  if (secret.length < 32) return null;

  let origin: URL;
  try {
    origin = new URL(env.POCKETBASE_ORIGIN);
    if (origin.protocol !== "https:") return null;
  } catch {
    return null;
  }

  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, origin);
  const headers = new Headers();

  for (const name of ["Accept", "Accept-Language", "Referer", "User-Agent"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  headers.set("X-Linktery-Redirect-Secret", secret);
  headers.set("X-Linktery-Public-Host", incomingUrl.hostname.toLowerCase());

  const clientIp = request.headers.get("CF-Connecting-IP") || "";
  if (clientIp) headers.set("X-Linktery-Client-IP", clientIp.slice(0, 128));
  const country = getEdgeCountry(request);
  if (country) headers.set("X-Linktery-Country", country);

  try {
    const timeoutSignal = typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(5_000)
      : undefined;
    const upstream = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers,
      redirect: "manual",
      signal: timeoutSignal,
    });

    // Require an authenticated backend acknowledgement. PocketBase's
    // unhandled c.next() response is an empty 200, so status alone cannot prove
    // that the shared secret was accepted or that the slug was resolved.
    if (upstream.headers.get("X-Linktery-Redirect-Origin") !== "v1") {
      return serveAmbiguousOriginFallback(request, env);
    }
    if (upstream.status === 404) return null;
    if (upstream.status >= 500) return serveAmbiguousOriginFallback(request, env);

    const publicHeaders = new Headers(upstream.headers);
    for (const name of [
      "X-Linktery-Redirect-Origin",
      "Fly-Request-Id",
      "Server",
      "Via",
      "X-Powered-By",
    ]) {
      publicHeaders.delete(name);
    }
    const publicUpstream = new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: publicHeaders,
    });

    return applyResponseHeaders(request, env, publicUpstream, {
      noIndex: true,
      cacheControl: "private, no-store, max-age=0",
    });
  } catch {
    // The origin may have persisted the click before a timeout/reset. Keep the
    // redirect available through React, but mark that fallback so its telemetry
    // cannot write the same click a second time.
    return serveAmbiguousOriginFallback(request, env);
  }
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
      if (decision.routeType === "public") {
        const resolved = await resolvePublicSlugAtOrigin(request, env);
        if (resolved) return resolved;
      }
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
