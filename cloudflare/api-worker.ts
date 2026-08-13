import { PUBLIC_API_DOMAIN } from "../src/lib/siteConfig";
import { readBoundedBody } from "./requestBody";

interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface Env {
  DEPLOY_ENV: "production" | "staging";
  UPSTREAM_API_ORIGIN: string;
  PUBLIC_API_HOSTNAME: string;
  API_ORIGIN_SECRET?: string;
  API_EDGE_RATE_LIMITER?: RateLimitBinding;
}

interface PublicApiRoute {
  methods: readonly string[];
  pattern: RegExp;
  query: readonly string[];
}

const API_VERSION = "1";
const MAX_JSON_BODY_BYTES = 64 * 1024;
const UPSTREAM_TIMEOUT_MS = 15_000;

const PUBLIC_API_ROUTES: readonly PublicApiRoute[] = [
  { pattern: /^\/v1\/links$/, methods: ["GET", "POST"], query: ["page", "per_page"] },
  { pattern: /^\/v1\/links\/[a-z0-9]{15}$/, methods: ["GET", "PATCH"], query: [] },
  { pattern: /^\/v1\/links\/[a-z0-9]{15}\/analytics$/, methods: ["GET"], query: ["period"] },
  { pattern: /^\/v1\/profiles$/, methods: ["GET"], query: ["page", "per_page"] },
  { pattern: /^\/v1\/profiles\/[a-z0-9]{15}$/, methods: ["GET"], query: [] },
  { pattern: /^\/v1\/profiles\/[a-z0-9]{15}\/links$/, methods: ["GET"], query: ["page", "per_page"] },
] as const;

const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "authorization",
  "content-type",
  "idempotency-key",
  "if-match",
  "user-agent",
] as const;

const SAFE_UPSTREAM_RESPONSE_HEADERS = [
  "content-type",
  "etag",
  "location",
  "retry-after",
  "www-authenticate",
] as const;

function requestId(): string {
  return crypto.randomUUID();
}

function apiHeaders(requestIdValue: string, source?: Headers): Headers {
  const headers = new Headers();
  if (source) {
    for (const name of SAFE_UPSTREAM_RESPONSE_HEADERS) {
      const value = source.get(name);
      if (value) headers.set(name, value);
    }
    source.forEach((value, name) => {
      if (/^x-ratelimit-[a-z0-9-]+$/i.test(name)) headers.set(name, value);
    });
  }

  headers.set("Cache-Control", "no-store");
  headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Strict-Transport-Security", "max-age=31536000");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Linktery-API-Version", API_VERSION);
  headers.set("X-Request-Id", requestIdValue);
  return headers;
}

function jsonError(
  status: number,
  code: string,
  message: string,
  requestIdValue: string,
  extraHeaders?: HeadersInit,
): Response {
  const headers = apiHeaders(requestIdValue);
  headers.set("Content-Type", "application/json; charset=utf-8");
  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, name) => headers.set(name, value));
  }

  return new Response(JSON.stringify({
    error: { code, message },
    request_id: requestIdValue,
  }), { status, headers });
}

function matchedRoute(pathname: string): PublicApiRoute | undefined {
  return PUBLIC_API_ROUTES.find((route) => route.pattern.test(pathname));
}

function isExpectedHostname(request: Request, env: Env): boolean {
  const expected = String(env.PUBLIC_API_HOSTNAME || (
    env.DEPLOY_ENV === "production" ? PUBLIC_API_DOMAIN : ""
  )).trim().toLowerCase();
  return expected.length > 0 && new URL(request.url).hostname.toLowerCase() === expected;
}

function isSafePath(pathname: string): boolean {
  return (
    pathname.startsWith("/v1/") &&
    !pathname.includes("%") &&
    !pathname.includes("\\") &&
    !pathname.includes("//")
  );
}

function getClientIp(request: Request): string {
  const value = String(request.headers.get("CF-Connecting-IP") || "").trim();
  return value && value.length <= 128 && /^[0-9a-f:.]+$/i.test(value) ? value : "unknown";
}

function getClientCountry(request: Request): string {
  const runtimeCountry = (request as Request & { cf?: { country?: string } }).cf?.country;
  const value = String(runtimeCountry || request.headers.get("CF-IPCountry") || "")
    .trim()
    .toUpperCase();
  return /^[A-Z]{2}$/.test(value) ? value : "";
}

function upstreamHeaders(request: Request, env: Env, requestIdValue: string): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Accept", headers.get("Accept") || "application/json");
  headers.set("X-Forwarded-Host", new URL(request.url).hostname.toLowerCase());
  headers.set("X-Forwarded-Proto", "https");
  headers.set("X-Linktery-API-Origin-Secret", String(env.API_ORIGIN_SECRET || ""));
  headers.set("X-Linktery-API-Request-Id", requestIdValue);
  headers.set("X-Linktery-API-Client-IP", getClientIp(request));
  const country = getClientCountry(request);
  if (country) headers.set("X-Linktery-API-Country", country);
  return headers;
}

async function proxyBody(
  request: Request,
  requestIdValue: string,
): Promise<ArrayBuffer | Response | undefined> {
  if (request.method !== "POST" && request.method !== "PATCH") return undefined;

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return jsonError(
      415,
      "unsupported_media_type",
      "Requests with a body must use application/json.",
      requestIdValue,
    );
  }

  const bodyResult = await readBoundedBody(request, MAX_JSON_BODY_BYTES);
  if (bodyResult.ok === false) {
    return jsonError(
      bodyResult.reason === "too_large" ? 413 : 400,
      bodyResult.reason === "too_large" ? "payload_too_large" : "invalid_request_body",
      bodyResult.reason === "too_large"
        ? "The request body is too large."
        : "The request body could not be read.",
      requestIdValue,
    );
  }
  return bodyResult.body;
}

function rewriteLocation(headers: Headers): void {
  const location = headers.get("location");
  if (!location) return;

  if (location.startsWith("/api/v1/")) {
    headers.set("Location", location.replace(/^\/api\/v1/, "/v1"));
    return;
  }
  if (!location.startsWith("/v1/")) headers.delete("Location");
}

function hasOnlyAllowedQuery(url: URL, route: PublicApiRoute): boolean {
  const allowed = new Set(route.query);
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key)) return false;
  }
  return true;
}

export async function handlePublicApiRequest(
  request: Request,
  env: Env,
  upstreamFetch: typeof fetch = fetch,
): Promise<Response> {
  const edgeRequestId = requestId();
  const url = new URL(request.url);

  if (!isExpectedHostname(request, env) || !isSafePath(url.pathname)) {
    return jsonError(404, "not_found", "The requested API endpoint was not found.", edgeRequestId);
  }

  const route = matchedRoute(url.pathname);
  if (!route) {
    return jsonError(404, "not_found", "The requested API endpoint was not found.", edgeRequestId);
  }

  if (!hasOnlyAllowedQuery(url, route)) {
    return jsonError(400, "invalid_query", "The request contains an unsupported query parameter.", edgeRequestId);
  }

  if (!route.methods.includes(request.method)) {
    return jsonError(
      405,
      "method_not_allowed",
      "This method is not allowed for the requested endpoint.",
      edgeRequestId,
      { Allow: route.methods.join(", ") },
    );
  }

  const originSecret = String(env.API_ORIGIN_SECRET || "");
  if (originSecret.length < 32 || !env.API_EDGE_RATE_LIMITER) {
    return jsonError(503, "api_unavailable", "The API is temporarily unavailable.", edgeRequestId);
  }

  try {
    const rate = await env.API_EDGE_RATE_LIMITER.limit({ key: getClientIp(request) });
    if (!rate.success) {
      return jsonError(429, "rate_limit_exceeded", "Too many requests. Try again shortly.", edgeRequestId, {
        "Retry-After": "60",
      });
    }
  } catch {
    return jsonError(503, "api_unavailable", "The API is temporarily unavailable.", edgeRequestId);
  }

  let body: ArrayBuffer | Response | undefined;
  try {
    body = await proxyBody(request, edgeRequestId);
  } catch {
    return jsonError(400, "invalid_request_body", "The request body could not be read.", edgeRequestId);
  }
  if (body instanceof Response) return body;

  const upstreamOrigin = new URL(env.UPSTREAM_API_ORIGIN);
  const upstreamUrl = new URL(url.pathname.replace(/^\/v1/, "/api/v1"), upstreamOrigin);
  upstreamUrl.search = url.search;
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstreamResponse = await upstreamFetch(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders(request, env, edgeRequestId),
      body,
      redirect: "manual",
      signal: timeoutController.signal,
    });
    if (upstreamResponse.headers.get("X-Linktery-API-Origin") !== "v1") {
      return jsonError(502, "upstream_unavailable", "The API is temporarily unavailable. Please retry shortly.", edgeRequestId);
    }
    if (upstreamResponse.status >= 500) {
      return jsonError(502, "upstream_unavailable", "The API is temporarily unavailable. Please retry shortly.", edgeRequestId);
    }
    const headers = apiHeaders(edgeRequestId, upstreamResponse.headers);
    rewriteLocation(headers);

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  } catch (error) {
    const timedOut =
      timeoutController.signal.aborted ||
      (error instanceof Error && error.name === "AbortError");
    return jsonError(
      timedOut ? 504 : 502,
      timedOut ? "upstream_timeout" : "upstream_unavailable",
      timedOut
        ? "The API took too long to respond. Please retry shortly."
        : "The API is temporarily unavailable. Please retry shortly.",
      edgeRequestId,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handlePublicApiRequest(request, env);
  },
};
