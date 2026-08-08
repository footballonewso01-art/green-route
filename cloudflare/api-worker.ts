import { PUBLIC_API_DOMAIN } from "../src/lib/siteConfig";

interface Env {
  DEPLOY_ENV: "production" | "staging";
  UPSTREAM_API_ORIGIN: string;
}

interface PublicApiRoute {
  methods: readonly string[];
  pattern: RegExp;
}

const API_VERSION = "1";
const MAX_JSON_BODY_BYTES = 64 * 1024;
const UPSTREAM_TIMEOUT_MS = 15_000;

const PUBLIC_API_ROUTES: readonly PublicApiRoute[] = [
  { pattern: /^\/v1\/links$/, methods: ["GET", "POST"] },
  { pattern: /^\/v1\/links\/[a-z0-9]{15}$/, methods: ["GET", "PATCH"] },
  { pattern: /^\/v1\/links\/[a-z0-9]{15}\/analytics$/, methods: ["GET"] },
  { pattern: /^\/v1\/profiles$/, methods: ["GET"] },
  { pattern: /^\/v1\/profiles\/[a-z0-9]{15}$/, methods: ["GET"] },
  { pattern: /^\/v1\/profiles\/[a-z0-9]{15}\/links$/, methods: ["GET"] },
] as const;

const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "authorization",
  "content-type",
  "idempotency-key",
  "if-match",
  "user-agent",
] as const;

const STRIPPED_RESPONSE_HEADERS = [
  "connection",
  "content-length",
  "fly-request-id",
  "server",
  "set-cookie",
  "transfer-encoding",
  "via",
  "x-powered-by",
] as const;

function requestId(): string {
  return crypto.randomUUID();
}

function apiHeaders(requestIdValue: string, source?: Headers): Headers {
  const headers = source ? new Headers(source) : new Headers();
  for (const name of STRIPPED_RESPONSE_HEADERS) headers.delete(name);

  headers.set("Cache-Control", "no-store");
  headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Linktery-API-Version", API_VERSION);
  if (!headers.has("X-Request-Id")) headers.set("X-Request-Id", requestIdValue);
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
  if (env.DEPLOY_ENV !== "production") return true;
  return new URL(request.url).hostname.toLowerCase() === PUBLIC_API_DOMAIN;
}

function isSafePath(pathname: string): boolean {
  return (
    pathname.startsWith("/v1/") &&
    !pathname.includes("%") &&
    !pathname.includes("\\") &&
    !pathname.includes("//")
  );
}

function upstreamHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Accept", headers.get("Accept") || "application/json");
  headers.set("X-Forwarded-Host", PUBLIC_API_DOMAIN);
  headers.set("X-Forwarded-Proto", "https");
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

  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
    return jsonError(
      413,
      "payload_too_large",
      "The request body is too large.",
      requestIdValue,
    );
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_JSON_BODY_BYTES) {
    return jsonError(
      413,
      "payload_too_large",
      "The request body is too large.",
      requestIdValue,
    );
  }
  return body;
}

function rewriteLocation(headers: Headers): void {
  const location = headers.get("location");
  if (!location) return;

  if (location.startsWith("/api/v1")) {
    headers.set("Location", location.replace(/^\/api\/v1/, "/v1"));
  }
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

  if (!route.methods.includes(request.method)) {
    return jsonError(
      405,
      "method_not_allowed",
      "This method is not allowed for the requested endpoint.",
      edgeRequestId,
      { Allow: route.methods.join(", ") },
    );
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
      headers: upstreamHeaders(request),
      body,
      redirect: "manual",
      signal: timeoutController.signal,
    });
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
