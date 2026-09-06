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
  PUBLIC_SLUG_PATTERN,
} from "./router";
import {
  createSocialPreviewCardHtml,
  isValidSocialPreviewProfile,
  parseSocialPreviewImagePath,
  type SocialPreviewAssetPath,
  type SocialPreviewProfile,
} from "./socialPreview";
import { readBoundedBody } from "./requestBody";
import { classifyAnalyticsTraffic } from "./analyticsTraffic";

interface AssetBinding {
  fetch(request: Request): Promise<Response>;
}

interface VersionMetadata {
  id?: string;
  tag?: string;
  timestamp?: string;
}

interface BrowserRunBinding {
  quickAction(action: "screenshot", options: Record<string, unknown>): Promise<Response>;
}

interface R2ObjectBody {
  body: ReadableStream<Uint8Array>;
  size: number;
  httpEtag: string;
}

interface R2ObjectMetadata {
  size: number;
  httpEtag: string;
}

interface R2ListedObject {
  key: string;
}

interface R2BucketBinding {
  get(key: string): Promise<R2ObjectBody | null>;
  head(key: string): Promise<R2ObjectMetadata | null>;
  put(
    key: string,
    value: ArrayBuffer,
    options?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
  list(options?: {
    prefix?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{
    objects: R2ListedObject[];
    truncated: boolean;
    cursor?: string;
  }>;
  delete(keys: string | string[]): Promise<void>;
}

interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}

interface DurableObjectNamespaceBinding {
  idFromName(name: string): object;
  get(id: object): DurableObjectStub;
}

interface DurableObjectTransaction {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
}

interface DurableObjectStorage {
  transaction<T>(callback: (transaction: DurableObjectTransaction) => Promise<T>): Promise<T>;
}

interface DurableObjectState {
  storage: DurableObjectStorage;
}

interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface WorkerCacheStorage {
  default: Cache;
}

interface Env {
  ASSETS: AssetBinding;
  DEPLOY_ENV: "production" | "staging";
  ROUTING_MODE: "primary" | "alias";
  POCKETBASE_ORIGIN: string;
  REDIRECT_ORIGIN_SECRET?: string;
  EDGE_TELEMETRY_RATE_LIMITER?: RateLimitBinding;
  BROWSER?: BrowserRunBinding;
  SOCIAL_PREVIEWS?: R2BucketBinding;
  SOCIAL_PREVIEW_COORDINATOR?: DurableObjectNamespaceBinding;
  SOCIAL_PREVIEW_MAX_DAILY_RENDERS?: string;
  WORKER_VERSION?: VersionMetadata;
}

interface GeneratedPreview {
  bytes: ArrayBuffer;
  etag: string;
  source: "r2" | "generated";
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
  } else {
    // Static Assets responses may be served from a different edge cache than
    // the Worker code. Never let a stale staging/preview header keep an
    // otherwise indexable production page out of search results.
    headers.delete("X-Robots-Tag");
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
  options: { status?: number; noIndex?: boolean; cacheControl?: string } = {},
): Promise<Response> {
  const assetResponse = await fetchAsset(request, env, pathname);
  if (!assetResponse.ok) {
    throw new Error("Required frontend artifact is unavailable.");
  }

  return applyResponseHeaders(request, env, assetResponse, {
    status: options.status,
    noIndex: options.noIndex,
    contentType: "text/html; charset=utf-8",
    cacheControl: options.cacheControl ?? "public, max-age=0, must-revalidate",
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

function getEdgeClientIp(request: Request): string {
  const value = String(request.headers.get("CF-Connecting-IP") || "").trim();
  return value && value.length <= 128 && /^[0-9a-f:.]+$/i.test(value) ? value : "unknown";
}

function attachAnalyticsTrafficQuality(
  headers: Headers,
  request: Request,
  expectNavigation: boolean,
): void {
  const decision = classifyAnalyticsTraffic(
    request as Request & {
      cf?: { botManagement?: { score?: number; verifiedBot?: boolean } };
    },
    { expectNavigation },
  );
  if (!decision.automated) return;

  // PocketBase accepts these headers only alongside the private edge-origin
  // secret. Never forward a client-supplied quality override.
  headers.set("X-Linktery-Traffic-Quality", "automated");
  if (decision.reason) headers.set("X-Linktery-Traffic-Reason", decision.reason);
}

function isCustomDomainHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!normalized || normalized === "localhost" || normalized.endsWith(".localhost")) return false;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(normalized)) return false;
  if (
    normalized.endsWith(".workers.dev") ||
    normalized.endsWith(".pages.dev") ||
    normalized.endsWith(".vercel.app")
  ) return false;
  if (normalized === "linktery.com" || isPrimaryWwwDomain(normalized) || isRedirectAliasDomain(normalized)) return false;
  return /^[a-z0-9](?:[a-z0-9.-]{2,251}[a-z0-9])$/.test(normalized);
}

async function handleFirstPartyServiceRequest(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (
    url.pathname === "/api/public/custom-domain" ||
    /^\/api\/public\/(?:links|profiles)\/[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(url.pathname)
  ) {
    return resolvePublicLinkForBrowser(request, env);
  }
  if (url.pathname === "/api/geo") {
    if (request.method !== "GET") {
      return applyResponseHeaders(request, env, new Response("Method not allowed.", {
        status: 405,
        headers: { Allow: "GET" },
      }), { noIndex: true, cacheControl: "no-store" });
    }
    return applyResponseHeaders(request, env, new Response(JSON.stringify({
      country: getEdgeCountry(request) || "Unknown",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    }), { noIndex: true, cacheControl: "no-store" });
  }

  const isClick = url.pathname === "/api/track-click";
  const isTelemetry = url.pathname === "/api/telemetry";
  const isCampaignVisit = /^\/api\/campaigns\/visit\/[a-z0-9_-]{8,40}$/.test(url.pathname);
  const isOnboarding = url.pathname === "/api/onboarding/profile-reservation"
    || url.pathname === "/api/onboarding/profile-claim";
  if (!isClick && !isTelemetry && !isCampaignVisit && !isOnboarding) return null;
  if (request.method !== "POST") {
    return applyResponseHeaders(request, env, new Response("Method not allowed.", {
      status: 405,
      headers: { Allow: "POST" },
    }), { noIndex: true, cacheControl: "no-store" });
  }

  const secret = String(env.REDIRECT_ORIGIN_SECRET || "");
  if (secret.length < 32 || !env.EDGE_TELEMETRY_RATE_LIMITER) {
    return applyResponseHeaders(request, env, new Response(null, { status: 503 }), {
      noIndex: true,
      cacheControl: "no-store",
    });
  }

  const contentType = String(request.headers.get("Content-Type") || "").toLowerCase();
  const validContentType = isClick
    ? contentType.startsWith("application/x-www-form-urlencoded")
    : contentType.startsWith("application/json");
  if (!validContentType) {
    return applyResponseHeaders(request, env, new Response(null, { status: 415 }), {
      noIndex: true,
      cacheControl: "no-store",
    });
  }

  try {
    const rate = await env.EDGE_TELEMETRY_RATE_LIMITER.limit({ key: getEdgeClientIp(request) });
    if (!rate.success) {
      // Analytics must never block navigation or expose an abuse-control
      // oracle. A dropped event is still acknowledged to the browser.
      return applyResponseHeaders(request, env, new Response(null, { status: isOnboarding ? 429 : 202 }), {
        noIndex: true,
        cacheControl: "no-store",
      });
    }
  } catch {
    return applyResponseHeaders(request, env, new Response(null, { status: isOnboarding ? 503 : 202 }), {
      noIndex: true,
      cacheControl: "no-store",
    });
  }

  const bodyResult = await readBoundedBody(request, isClick ? 4 * 1024 : 8 * 1024);
  if (bodyResult.ok === false) {
    return applyResponseHeaders(request, env, new Response(null, {
      status: bodyResult.reason === "too_large" ? 413 : 400,
    }), { noIndex: true, cacheControl: "no-store" });
  }

  const origin = new URL(env.POCKETBASE_ORIGIN);
  const upstreamUrl = new URL(url.pathname, origin);
  const headers = new Headers({
    "Accept": "application/json",
    "Content-Type": contentType,
    "X-Linktery-Redirect-Secret": secret,
    "X-Linktery-Public-Host": url.hostname.toLowerCase(),
    "X-Linktery-Request-Id": (request.headers.get("CF-Ray") || crypto.randomUUID()).slice(0, 128),
    "X-Linktery-Client-IP": getEdgeClientIp(request),
  });
  const country = getEdgeCountry(request);
  if (country) headers.set("X-Linktery-Country", country);
  for (const name of [
    "Authorization",
    "Purpose",
    "Referer",
    "Sec-Fetch-Dest",
    "Sec-Fetch-Mode",
    "Sec-Purpose",
    "User-Agent",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (isClick || isCampaignVisit) attachAnalyticsTrafficQuality(headers, request, false);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body: bodyResult.body,
      redirect: "manual",
      signal: typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(isOnboarding ? 5_000 : 3_000) : undefined,
    });
    const validOrigin = isOnboarding
      ? upstream.headers.get("X-Linktery-Service-Origin") === "v1"
      : isCampaignVisit
        ? upstream.headers.get("X-Linktery-Campaign-Origin") === "v1"
        : upstream.headers.get("X-Linktery-Telemetry-Origin") === "v1";
    if (!validOrigin) {
      return applyResponseHeaders(request, env, new Response(null, { status: 502 }), {
        noIndex: true,
        cacheControl: "no-store",
      });
    }
    if (isOnboarding || isCampaignVisit) {
      const body = await upstream.text();
      return applyResponseHeaders(request, env, new Response(body, {
        status: upstream.status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }), { noIndex: true, cacheControl: "no-store" });
    }
    return applyResponseHeaders(request, env, new Response(null, {
      status: upstream.status >= 200 && upstream.status < 300 ? 202 : 502,
    }), { noIndex: true, cacheControl: "no-store" });
  } catch {
    return applyResponseHeaders(request, env, new Response(null, { status: isOnboarding ? 503 : 202 }), {
      noIndex: true,
      cacheControl: "no-store",
    });
  }
}

// Fixed-path, read-only resolver, not a generic PocketBase proxy. This keeps
// fallback targeting at the same trusted Geo/IP boundary as /slug redirects.
async function resolvePublicLinkForBrowser(request: Request, env: Env): Promise<Response> {
  const jsonResponse = (status: number, body: string) => applyResponseHeaders(
    request, env, new Response(body, {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    }), { noIndex: true, cacheControl: "private, no-store" },
  );
  if (request.method !== "GET") return jsonResponse(405, '{"message":"Method not allowed."}');
  const secret = String(env.REDIRECT_ORIGIN_SECRET || "");
  if (secret.length < 32) return jsonResponse(503, '{"message":"Link resolution is temporarily unavailable."}');

  const url = new URL(request.url);
  const origin = new URL(env.POCKETBASE_ORIGIN);
  if (origin.protocol !== "https:") return jsonResponse(503, '{"message":"Link resolution is temporarily unavailable."}');
  // Ignore incoming domain/query overrides and all client-supplied internal
  // headers. Only edge-provided country/IP and the actual hostname are trusted.
  const upstreamUrl = new URL(url.pathname, origin);
  const isPublicProfileResolver = url.pathname.startsWith("/api/public/profiles/");
  if (isPublicProfileResolver) {
    const page = url.searchParams.get("page") || "1";
    if (!/^[1-9][0-9]{0,4}$/.test(page)) return jsonResponse(400, '{"message":"Invalid page."}');
    upstreamUrl.searchParams.set("page", page);
    // The legacy production profile hook reads domain from query parameters.
    // Only forward the actual request hostname, never the client's override.
    upstreamUrl.searchParams.set("domain", url.hostname.toLowerCase());
  }
  const headers = new Headers({
    Accept: "application/json",
    "X-Linktery-Redirect-Secret": secret,
    "X-Linktery-Public-Host": url.hostname.toLowerCase(),
    "X-Linktery-Client-IP": getEdgeClientIp(request),
    "X-Linktery-Request-Id": (request.headers.get("CF-Ray") || crypto.randomUUID()).slice(0, 128),
  });
  if (isCustomDomainHostname(url.hostname)) {
    headers.set("X-Linktery-Custom-Domain-Root", "1");
  }
  const country = getEdgeCountry(request);
  if (country) headers.set("X-Linktery-Country", country);
  for (const name of ["Authorization", "User-Agent", "Referer"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET", headers, redirect: "manual",
      signal: typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(5_000) : undefined,
    });
    const expectedAttestation = url.pathname === "/api/public/custom-domain"
      ? "X-Linktery-Custom-Domain-Origin"
      : "X-Linktery-Public-Resolver";
    const resolverAttested = upstream.headers.get(expectedAttestation) === "v1";
    // Temporary compatibility for the current first-party production profile
    // resolver. Never extend that legacy contract to customer hostnames: the
    // custom-domain path must be attested and resolved by its exact stored
    // hostname mapping, including during a staggered backend/edge rollout.
    const legacyProfileResponse = isPublicProfileResolver
      && !isCustomDomainHostname(url.hostname)
      && !upstream.headers.has("X-Linktery-Public-Resolver")
      && String(upstream.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json");
    if ((!resolverAttested && !legacyProfileResponse)
        || ![200, 404, 410, 429].includes(upstream.status)) {
      return jsonResponse(503, '{"message":"Link resolution is temporarily unavailable."}');
    }
    return jsonResponse(upstream.status, await upstream.text());
  } catch {
    return jsonResponse(503, '{"message":"Link resolution is temporarily unavailable."}');
  }
}

function isSocialPreviewRequest(request: Request): boolean {
  return /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot(?:-LinkExpanding)?|Discordbot|TelegramBot|WhatsApp|SkypeUriPreview|Pinterestbot|Snap URL Preview|Viber|vkShare/i
    .test(request.headers.get("User-Agent") || "");
}

async function fetchSocialPreviewProfile(
  env: Env,
  asset: SocialPreviewAssetPath,
): Promise<SocialPreviewProfile | null> {
  const secret = String(env.REDIRECT_ORIGIN_SECRET || "");
  if (secret.length < 32) return null;

  let origin: URL;
  try {
    origin = new URL(env.POCKETBASE_ORIGIN);
    if (origin.protocol !== "https:") return null;
  } catch {
    return null;
  }

  const metadataUrl = new URL(
    `/api/internal/social-preview/profile/${asset.profileId}`,
    origin,
  );
  metadataUrl.searchParams.set("version", asset.version);

  try {
    const response = await fetch(metadataUrl.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-Linktery-Redirect-Secret": secret,
      },
      redirect: "manual",
      signal: typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(3_000)
        : undefined,
    });
    if (
      !response.ok ||
      response.headers.get("X-Linktery-Social-Preview-Origin") !== "v1"
    ) {
      return null;
    }

    const payload: unknown = await response.json();
    if (!isValidSocialPreviewProfile(payload)) return null;
    if (payload.id !== asset.profileId || payload.version !== asset.version) return null;
    return payload;
  } catch {
    return null;
  }
}

function getSocialPreviewAvatarUrl(env: Env, profile: SocialPreviewProfile): string {
  if (!profile.avatarFile) return "";
  try {
    const origin = new URL(env.POCKETBASE_ORIGIN);
    origin.pathname = `/api/files/pbc_pub_profiles/${profile.id}/${encodeURIComponent(profile.avatarFile)}`;
    origin.search = "";
    origin.hash = "";
    return origin.toString();
  } catch {
    return "";
  }
}

async function serveSocialPreviewFallback(
  request: Request,
  env: Env,
): Promise<Response> {
  const assetResponse = await fetchAsset(request, env, "/og-image.png");
  if (!assetResponse.ok) {
    return applyResponseHeaders(request, env, new Response("Preview unavailable", {
      status: 503,
    }), {
      noIndex: true,
      cacheControl: "no-store",
    });
  }
  return applyResponseHeaders(request, env, assetResponse, {
    noIndex: true,
    cacheControl: "no-store",
  });
}

function getSocialPreviewObjectKey(asset: SocialPreviewAssetPath): string {
  return `profiles/${asset.profileId}/${asset.version}.png`;
}

function getSocialPreviewObjectPrefix(asset: SocialPreviewAssetPath): string {
  return `profiles/${asset.profileId}/`;
}

function getSocialPreviewResponseHeaders(
  asset: SocialPreviewAssetPath,
  etag: string,
  contentLength?: number,
): Headers {
  const headers = new Headers({
    "Content-Type": "image/png",
    // A bounded edge TTL lets profile deletion or privacy changes retire a
    // previously shared avatar promptly. R2 still prevents browser rerenders.
    "Cache-Control": "public, max-age=21600",
    "CDN-Cache-Control": "public, max-age=21600",
    "ETag": etag || `"social-${asset.profileId}-${asset.version}"`,
  });
  if (contentLength !== undefined) {
    headers.set("Content-Length", String(contentLength));
  }
  return headers;
}

async function cleanupOlderSocialPreviews(
  bucket: R2BucketBinding,
  asset: SocialPreviewAssetPath,
  currentKey: string,
): Promise<void> {
  let cursor: string | undefined;
  do {
    const page = await bucket.list({
      prefix: getSocialPreviewObjectPrefix(asset),
      cursor,
      limit: 100,
    });
    const obsolete = page.objects
      .map((object) => object.key)
      .filter((key) => key !== currentKey);
    if (obsolete.length > 0) await bucket.delete(obsolete);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

function getDailyPreviewRenderLimit(env: Env): number {
  const parsed = Number.parseInt(String(env.SOCIAL_PREVIEW_MAX_DAILY_RENDERS || ""), 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(25_000, parsed)) : 1_000;
}

async function claimSocialPreviewRenderBudget(env: Env): Promise<boolean> {
  const namespace = env.SOCIAL_PREVIEW_COORDINATOR;
  if (!namespace) return false;
  const day = new Date().toISOString().slice(0, 10);
  const id = namespace.idFromName(`budget:${env.DEPLOY_ENV}:${day}`);
  const response = await namespace.get(id).fetch(new Request("https://preview.internal/budget/claim", {
    method: "POST",
    headers: {
      "X-Linktery-Preview-Limit": String(getDailyPreviewRenderLimit(env)),
    },
  }));
  return response.status === 204;
}

async function renderAndStoreSocialPreview(
  env: Env,
  asset: SocialPreviewAssetPath,
  profile: SocialPreviewProfile,
): Promise<GeneratedPreview | null> {
  const bucket = env.SOCIAL_PREVIEWS;
  if (!bucket) return null;
  const objectKey = getSocialPreviewObjectKey(asset);
  const stored = await bucket.get(objectKey);
  if (stored) {
    return {
      bytes: await new Response(stored.body).arrayBuffer(),
      etag: stored.httpEtag,
      source: "r2",
    };
  }

  if (!env.BROWSER) return null;
  if (!(await claimSocialPreviewRenderBudget(env))) return null;

  const profileHost = profile.domain || "linktery.com";
  const profileUrl = `https://${profileHost}/${profile.slug}`;
  const cardHtml = createSocialPreviewCardHtml(
    profile,
    getSocialPreviewAvatarUrl(env, profile),
    profileUrl,
  );
  const screenshot = await env.BROWSER.quickAction("screenshot", {
    html: cardHtml,
    viewport: {
      width: 1200,
      height: 630,
      deviceScaleFactor: 1,
    },
    screenshotOptions: {
      type: "png",
      captureBeyondViewport: false,
    },
    // Raw HTML has no application boot. This short wait only gives the
    // PocketBase avatar enough time to load; the card has a styled fallback
    // initial if the image origin is unavailable.
    waitForTimeout: 900,
    actionTimeout: 10_000,
  });
  const contentType = String(screenshot.headers.get("Content-Type") || "").toLowerCase();
  if (!screenshot.ok || !contentType.startsWith("image/")) return null;

  const bytes = await screenshot.arrayBuffer();
  if (bytes.byteLength < 1_000 || bytes.byteLength > 5_000_000) return null;

  const etag = `"social-${asset.profileId}-${asset.version}"`;
  await bucket.put(objectKey, bytes.slice(0), {
    httpMetadata: {
      contentType: "image/png",
      cacheControl: "public, max-age=21600",
    },
    customMetadata: {
      profileId: asset.profileId,
      version: asset.version,
    },
  });
  try {
    await cleanupOlderSocialPreviews(bucket, asset, objectKey);
  } catch {
    // The current immutable image is already durable. Stale-version cleanup is
    // best-effort and must never turn a successful render into a failure.
  }

  return { bytes, etag, source: "generated" };
}

export class SocialPreviewCoordinator {
  private generationQueue: Promise<unknown> = Promise.resolve();
  private validatedProfile: {
    version: string;
    value: SocialPreviewProfile;
    expiresAt: number;
  } | null = null;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {}

  private async claimBudget(request: Request): Promise<Response> {
    const requestedLimit = Number.parseInt(
      request.headers.get("X-Linktery-Preview-Limit") || "",
      10,
    );
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(25_000, requestedLimit))
      : 1_000;
    const allowed = await this.state.storage.transaction(async (transaction) => {
      const used = (await transaction.get<number>("renders")) || 0;
      if (used >= limit) return false;
      await transaction.put("renders", used + 1);
      return true;
    });
    return new Response(null, { status: allowed ? 204 : 429 });
  }

  private async getValidatedProfile(
    asset: SocialPreviewAssetPath,
  ): Promise<SocialPreviewProfile | null> {
    if (
      this.validatedProfile?.version === asset.version &&
      this.validatedProfile.expiresAt > Date.now()
    ) {
      return this.validatedProfile.value;
    }
    const profile = await fetchSocialPreviewProfile(this.env, asset);
    if (!profile) {
      this.validatedProfile = null;
      return null;
    }
    this.validatedProfile = {
      version: asset.version,
      value: profile,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };
    return profile;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/budget/claim" && request.method === "POST") {
      return this.claimBudget(request);
    }

    const asset = parseSocialPreviewImagePath(url.pathname);
    if (!asset || (request.method !== "GET" && request.method !== "HEAD")) {
      return new Response("Not found", { status: 404 });
    }

    const objectKey = getSocialPreviewObjectKey(asset);
    if (request.method === "HEAD") {
      const stored = await this.env.SOCIAL_PREVIEWS?.head(objectKey);
      if (!stored) return new Response(null, { status: 404 });
      return new Response(null, {
        status: 200,
        headers: getSocialPreviewResponseHeaders(asset, stored.httpEtag, stored.size),
      });
    }

    // One Durable Object owns every version of a profile. Queueing requests
    // prevents an old and newly edited profile from rendering simultaneously;
    // repeated requests for the same version hit R2 when their turn begins.
    const generation = this.generationQueue.then(async () => {
      const profile = await this.getValidatedProfile(asset);
      if (!profile) return null;
      return renderAndStoreSocialPreview(this.env, asset, profile);
    });
    this.generationQueue = generation.then(
      () => undefined,
      () => undefined,
    );
    const result = await generation;
    if (!result) return new Response("Preview unavailable", { status: 503 });

    return new Response(result.bytes.slice(0), {
      status: 200,
      headers: getSocialPreviewResponseHeaders(asset, result.etag, result.bytes.byteLength),
    });
  }
}

async function serveSocialPreviewImage(
  request: Request,
  env: Env,
  context: WorkerExecutionContext,
  asset: SocialPreviewAssetPath,
): Promise<Response> {
  const cacheUrl = new URL(request.url);
  cacheUrl.search = "";
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });

  try {
    const cached = await (caches as unknown as WorkerCacheStorage).default.match(cacheKey);
    if (cached) {
      return applyResponseHeaders(request, env, cached, {
        noIndex: true,
        contentType: "image/png",
        cacheControl: "public, max-age=21600",
      });
    }
  } catch {
    // Cache availability must never decide whether a shared link works.
  }

  try {
    const namespace = env.SOCIAL_PREVIEW_COORDINATOR;
    if (!namespace || !env.SOCIAL_PREVIEWS) {
      return serveSocialPreviewFallback(request, env);
    }
    const id = namespace.idFromName(`${env.DEPLOY_ENV}:profile:${asset.profileId}`);
    const coordinatorUrl = new URL(request.url);
    coordinatorUrl.hostname = "preview.internal";
    coordinatorUrl.protocol = "https:";
    const response = await namespace.get(id).fetch(new Request(coordinatorUrl, {
      method: request.method,
    }));
    if (!response.ok) return serveSocialPreviewFallback(request, env);

    if (request.method === "HEAD") {
      return applyResponseHeaders(request, env, response, {
        noIndex: true,
        contentType: "image/png",
        cacheControl: "public, max-age=21600",
      });
    }

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength < 1_000 || bytes.byteLength > 5_000_000) {
      return serveSocialPreviewFallback(request, env);
    }
    const headers = new Headers(response.headers);
    const cacheResponse = new Response(bytes.slice(0), { status: 200, headers });
    context.waitUntil(
      (caches as unknown as WorkerCacheStorage).default
        .put(cacheKey, cacheResponse)
        .catch(() => undefined),
    );

    return applyResponseHeaders(request, env, new Response(bytes, {
      status: 200,
      headers,
    }), {
      noIndex: true,
      contentType: "image/png",
      cacheControl: "public, max-age=21600",
    });
  } catch {
    return serveSocialPreviewFallback(request, env);
  }
}

type CustomDomainLookup =
  | { kind: "resolved"; targetType: "link" | "profile"; targetId: string; slug: string }
  | { kind: "not-found" }
  | { kind: "unavailable" };
type ResolvedCustomDomainLookup = Extract<CustomDomainLookup, { kind: "resolved" }>;

function parseCustomDomainLookup(payload: unknown): ResolvedCustomDomainLookup | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as { type?: unknown; id?: unknown; slug?: unknown };
  const targetType = value.type === "link" || value.type === "profile" ? value.type : null;
  const targetId = String(value.id || "");
  const slug = String(value.slug || "");
  if (!targetType || !/^[a-z0-9]{15}$/.test(targetId) || !PUBLIC_SLUG_PATTERN.test(slug)) return null;
  return { kind: "resolved", targetType, targetId, slug };
}

async function lookupCustomDomainAtOrigin(
  request: Request,
  env: Env,
  context: WorkerExecutionContext,
): Promise<CustomDomainLookup> {
  const secret = String(env.REDIRECT_ORIGIN_SECRET || "");
  if (secret.length < 32) return { kind: "unavailable" };
  let origin: URL;
  try {
    origin = new URL(env.POCKETBASE_ORIGIN);
    if (origin.protocol !== "https:") return { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }

  const incomingUrl = new URL(request.url);
  const hostname = incomingUrl.hostname.toLowerCase();
  const cache = typeof caches !== "undefined"
    ? (caches as unknown as { default: Cache }).default
    : null;
  const cacheKey = new Request(`https://custom-domain-mapping.linktery.internal/${encodeURIComponent(hostname)}`);
  if (cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const parsed = parseCustomDomainLookup(await cached.json());
        if (parsed) return parsed;
      }
    } catch {
      // Cache failures never change routing correctness; use the origin.
    }
  }
  const headers = new Headers({
    Accept: "application/json",
    "X-Linktery-Redirect-Secret": secret,
    "X-Linktery-Public-Host": hostname,
    "X-Linktery-Custom-Domain-Root": "1",
    "X-Linktery-Request-Id": (request.headers.get("CF-Ray") || crypto.randomUUID()).slice(0, 128),
    "X-Linktery-Client-IP": getEdgeClientIp(request),
  });

  try {
    const upstream = await fetch(new URL("/api/public/custom-domain", origin), {
      method: "GET",
      headers,
      redirect: "manual",
      signal: typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(5_000) : undefined,
    });
    if (upstream.headers.get("X-Linktery-Custom-Domain-Origin") !== "v1") {
      return { kind: "unavailable" };
    }
    if (upstream.status === 404) return { kind: "not-found" };
    if (upstream.status !== 200) return { kind: "unavailable" };
    const parsed = parseCustomDomainLookup(await upstream.json());
    if (!parsed) return { kind: "unavailable" };
    if (cache) {
      const cachedResponse = new Response(JSON.stringify({
        type: parsed.targetType,
        id: parsed.targetId,
        slug: parsed.slug,
      }), {
        headers: {
          "Cache-Control": "public, max-age=30",
          "Content-Type": "application/json; charset=utf-8",
        },
      });
      context.waitUntil(cache.put(cacheKey, cachedResponse).catch(() => undefined));
    }
    return parsed;
  } catch {
    return { kind: "unavailable" };
  }
}

async function handleCustomDomainRequest(
  request: Request,
  env: Env,
  context: WorkerExecutionContext,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!isCustomDomainHostname(url.hostname)) return null;

  if (url.pathname === "/robots.txt") {
    return applyResponseHeaders(request, env, new Response("User-agent: *\nDisallow: /\n", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    }), { noIndex: true });
  }
  if (url.pathname === "/sitemap.xml") {
    return applyResponseHeaders(request, env, new Response("Not found", { status: 404 }), { noIndex: true });
  }

  if (isLikelyStaticAssetPath(url.pathname)) {
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return applyResponseHeaders(request, env, assetResponse, { noIndex: true });
    }
  }
  if (url.pathname !== "/") {
    return serveInternalHtml(request, env, INTERNAL_ASSETS.notFound, {
      status: 404,
      noIndex: true,
    });
  }

  const lookup = await lookupCustomDomainAtOrigin(request, env, context);
  if (lookup.kind === "not-found") {
    return serveInternalHtml(request, env, INTERNAL_ASSETS.notFound, {
      status: 404,
      noIndex: true,
    });
  }
  if (lookup.kind === "unavailable") {
    return applyResponseHeaders(request, env, new Response(
      "This custom domain is temporarily unavailable.",
      { status: 503 },
    ), { noIndex: true, cacheControl: "private, no-store" });
  }

  const internalUrl = new URL(request.url);
  internalUrl.pathname = `/${lookup.slug}`;
  const internalRequest = new Request(internalUrl.toString(), {
    method: request.method,
    headers: request.headers,
    redirect: "manual",
  });
  const resolved = await resolvePublicSlugAtOrigin(internalRequest, env, true, request);
  if (resolved) return resolved;

  // Profiles and Link modes that deliberately use the React experience keep
  // the public URL at the hostname root. The client independently obtains the
  // same strict mapping through /api/public/custom-domain.
  return serveInternalHtml(request, env, INTERNAL_ASSETS.spa, { noIndex: true });
}

/**
 * The redirect endpoint uses 404 for profiles and React-only Link modes too.
 * Only two attested, read-only misses prove that the public URL is absent.
 * Never turn an outage, rate limit, or legacy/unattested response into a 404.
 */
async function resolveMissingPublicSlug(
  request: Request,
  env: Env,
  origin: URL,
  trustedHeaders: Headers,
): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  const headers = new Headers(trustedHeaders);
  headers.set("Accept", "application/json");
  const signal = typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(5_000)
    : undefined;

  try {
    // Check profiles first: that is the usual reason for the SPA fallback.
    for (const resource of ["profiles", "links"]) {
      const upstream = await fetch(new URL(`/api/public/${resource}${pathname}`, origin), {
        method: "GET",
        headers,
        redirect: "manual",
        signal,
      });
      const confirmedMissing = upstream.status === 404
        && upstream.headers.get("X-Linktery-Public-Resolver") === "v1";
      await upstream.body?.cancel();
      if (!confirmedMissing) return null;
    }
  } catch {
    return null;
  }

  return serveInternalHtml(request, env, INTERNAL_ASSETS.notFound, {
    status: 404,
    noIndex: true,
    // A just-created profile/link must not inherit a cached negative lookup.
    cacheControl: "private, no-store, max-age=0",
  });
}

/**
 * Resolve short links before booting the SPA. This preserves the original
 * social-app navigation context for deeplink handoffs and removes the React +
 * Records API round trips from the redirect hot path. Ambiguous 404 responses
 * are checked separately without recording another click or profile view.
 */
async function resolvePublicSlugAtOrigin(
  request: Request,
  env: Env,
  customDomainRoot = false,
  analyticsSignalRequest: Request = request,
): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;

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

  for (const name of [
    "Accept",
    "Accept-Language",
    "Purpose",
    "Referer",
    "Sec-Fetch-Dest",
    "Sec-Fetch-Mode",
    "Sec-Fetch-Site",
    "Sec-Fetch-User",
    "Sec-Purpose",
    "User-Agent",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  attachAnalyticsTrafficQuality(headers, analyticsSignalRequest, true);

  headers.set("X-Linktery-Redirect-Secret", secret);
  headers.set("X-Linktery-Public-Host", incomingUrl.hostname.toLowerCase());
  if (customDomainRoot) headers.set("X-Linktery-Custom-Domain-Root", "1");
  const requestId = request.headers.get("CF-Ray") || crypto.randomUUID();
  headers.set("X-Linktery-Request-Id", requestId.slice(0, 128));

  const clientIp = request.headers.get("CF-Connecting-IP") || "";
  if (clientIp) headers.set("X-Linktery-Client-IP", clientIp.slice(0, 128));
  const country = getEdgeCountry(request);
  if (country) headers.set("X-Linktery-Country", country);

  // Ordinary HEAD probes must never hit /slug: that endpoint records visits.
  // The existing custom-domain lookup already confirmed its root target.
  if (request.method === "HEAD" && !isSocialPreviewRequest(request)) {
    return customDomainRoot ? null : resolveMissingPublicSlug(request, env, origin, headers);
  }

  try {
    const timeoutSignal = typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(5_000)
      : undefined;
    const upstream = await fetch(upstreamUrl.toString(), {
      // PocketBase owns a GET route. For crawler HEAD probes, resolve the same
      // metadata contract and strip the response body at the Worker boundary.
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
    if (upstream.status === 404) {
      await upstream.body?.cancel();
      return customDomainRoot ? null : resolveMissingPublicSlug(request, env, origin, headers);
    }
    if (upstream.status >= 500) return serveAmbiguousOriginFallback(request, env);

    const isSocialPreview =
      isSocialPreviewRequest(request) &&
      upstream.headers.get("X-Linktery-Social-Preview") === "v1";
    const publicHeaders = new Headers(upstream.headers);
    for (const name of [
      "X-Linktery-Redirect-Origin",
      "X-Linktery-Social-Preview",
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
      cacheControl: isSocialPreview
        ? "public, max-age=60, s-maxage=300, stale-while-revalidate=300"
        : "private, no-store, max-age=0",
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

async function handleRequest(
  request: Request,
  env: Env,
  context: WorkerExecutionContext,
): Promise<Response> {
  const serviceResponse = await handleFirstPartyServiceRequest(request, env);
  if (serviceResponse) return serviceResponse;

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
  const customDomainResponse = await handleCustomDomainRequest(request, env, context);
  if (customDomainResponse) return customDomainResponse;
  const socialPreviewAsset = parseSocialPreviewImagePath(url.pathname);
  if (socialPreviewAsset) {
    if (isAliasRequest(request, env)) {
      return redirectToPrimary(request, env, url.pathname);
    }
    return serveSocialPreviewImage(request, env, context, socialPreviewAsset);
  }
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
  async fetch(
    request: Request,
    env: Env,
    context: WorkerExecutionContext = { waitUntil: () => undefined },
  ): Promise<Response> {
    try {
      return await handleRequest(request, env, context);
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
