import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const baseUrl = new URL(process.argv[2] || "http://127.0.0.1:8787");
const deployEnvironment = process.argv[3] || "staging";
if (!["production", "staging"].includes(deployEnvironment)) {
  throw new Error(`Unsupported smoke-test environment: ${deployEnvironment}`);
}
const globallyNoIndexed =
  deployEnvironment !== "production" ||
  baseUrl.hostname.toLowerCase().endsWith(".workers.dev");
const isLocalRuntime = ["127.0.0.1", "localhost", "[::1]"].includes(baseUrl.hostname);
const missingSlugPath = `/seo-smoke-missing-${crypto.randomUUID()}`;
const failures = [];

async function request(pathname, options = {}) {
  return fetch(new URL(pathname, baseUrl), {
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
    ...options,
  });
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function expectResponse({
  pathname,
  status,
  contains,
  excludes,
  noIndex,
  method = "GET",
}) {
  const response = await request(pathname, { method });
  const body = method === "HEAD" ? "" : await response.text();

  check(response.status === status, `${pathname}: expected ${status}, received ${response.status}`);
  if (contains) check(body.includes(contains), `${pathname}: missing ${contains}`);
  if (excludes) check(!body.includes(excludes), `${pathname}: unexpectedly contains ${excludes}`);
  if (noIndex !== undefined) {
    const robots = response.headers.get("x-robots-tag") || "";
    check(
      noIndex ? robots.includes("noindex") : !robots.includes("noindex"),
      `${pathname}: unexpected X-Robots-Tag ${robots || "(missing)"}`,
    );
  }
  check(
    (response.headers.get("content-security-policy") || "").includes("default-src 'self'"),
    `${pathname}: Content-Security-Policy is missing`,
  );
  return { response, body };
}

await expectResponse({
  pathname: "/",
  status: 200,
  contains: 'data-prerendered="true"',
  noIndex: globallyNoIndexed,
});
await expectResponse({
  pathname: "/pricing",
  status: 200,
  contains: '<link rel="canonical" href="https://linktery.com/pricing" />',
  noIndex: globallyNoIndexed,
});
await expectResponse({
  pathname: "/documentation",
  status: 200,
  contains: '<link rel="canonical" href="https://linktery.com/documentation" />',
  noIndex: globallyNoIndexed,
});
if (isLocalRuntime) {
  // The offline runtime has no resolver secret. These routes test that asset
  // filenames cannot swallow valid public slugs, so they retain the SPA shell.
  for (const pathname of ["/nasty", "/index", "/landing"]) {
    await expectResponse({
      pathname,
      status: 200,
      contains: '<meta name="robots" content="noindex, nofollow" />',
      excludes: 'data-prerendered="true"',
      noIndex: globallyNoIndexed,
    });
  }
} else {
  // Live environments can authoritatively resolve slugs. A random missing
  // address must be a real 404; do not depend on named customer fixtures.
  await expectResponse({
    pathname: missingSlugPath,
    status: 404,
    contains: '<meta name="robots" content="noindex, nofollow" />',
    noIndex: true,
  });
  const missingHead = await expectResponse({
    pathname: missingSlugPath,
    status: 404,
    noIndex: true,
    method: "HEAD",
  });
  check((await missingHead.response.text()).length === 0, "Missing-slug HEAD response must not include a body");
}
await expectResponse({
  pathname: "/dashboard/settings?tab=api",
  status: 200,
  noIndex: true,
});
await expectResponse({
  pathname: "/ref/lt_partner",
  status: 200,
  noIndex: true,
});
await expectResponse({ pathname: "/ref", status: 404, noIndex: true });
await expectResponse({
  pathname: "/compare/not-real",
  status: 404,
  noIndex: true,
});
await expectResponse({ pathname: "/foo/bar", status: 404, noIndex: true });
await expectResponse({ pathname: "/404", status: 404, noIndex: true });
await expectResponse({
  pathname: "/_linktery/app-shell",
  status: 404,
  noIndex: true,
});

for (const hubPath of ["/features", "/templates", "/guides", "/tools"]) {
  const { response } = await expectResponse({
    pathname: `${hubPath}?utm_source=smoke`,
    status: 200,
    contains: `<link rel="canonical" href="https://linktery.com${hubPath}" />`,
    noIndex: globallyNoIndexed,
  });
  check(
    !response.headers.has("location"),
    `${hubPath}: an indexable hub must not return a redirect`,
  );
}

const canonicalRedirect = await request("/Nasty/?lr_trace=smoke");
check(canonicalRedirect.status === 308, "/Nasty/: expected canonical 308");
const canonicalLocation = canonicalRedirect.headers.get("location");
check(Boolean(canonicalLocation), "/Nasty/: Location header is missing");
if (canonicalLocation) {
  const canonicalUrl = new URL(canonicalLocation, baseUrl);
  check(
    canonicalUrl.pathname === "/nasty",
    "/Nasty/: wrong canonical destination",
  );
  check(
    canonicalUrl.search === "?lr_trace=smoke",
    "/Nasty/: query string was not preserved",
  );
}

const comparisonRedirect = await request("/compare/urmybio-vs-taplink?lr_trace=comparison");
check(comparisonRedirect.status === 308, "/compare/urmybio-vs-taplink: expected canonical 308");
const comparisonLocation = comparisonRedirect.headers.get("location");
check(Boolean(comparisonLocation), "/compare/urmybio-vs-taplink: Location header is missing");
if (comparisonLocation) {
  const comparisonUrl = new URL(comparisonLocation, baseUrl);
  check(
    comparisonUrl.pathname === "/compare/taplink-vs-urmybio",
    "/compare/urmybio-vs-taplink: wrong canonical destination",
  );
  check(
    comparisonUrl.search === "?lr_trace=comparison",
    "/compare/urmybio-vs-taplink: query string was not preserved",
  );
}

await expectResponse({
  pathname: "/u%2F%5Cevil.example",
  status: 404,
  noIndex: true,
});

for (const [pathname, expectedStatus] of [
  ["/", 200],
  [isLocalRuntime ? "/nasty" : missingSlugPath, isLocalRuntime ? 200 : 404],
  ["/404", 404],
]) {
  const initialResponse = await request(pathname);
  const etag = initialResponse.headers.get("etag");
  check(Boolean(etag), `${pathname}: ETag is missing for conditional smoke test`);
  if (etag) {
    const conditionalResponse = await request(pathname, {
      headers: { "If-None-Match": etag },
    });
    check(
      [expectedStatus, 304].includes(conditionalResponse.status),
      `${pathname}: conditional request returned ${conditionalResponse.status}`,
    );
    check(
      conditionalResponse.status !== 500,
      `${pathname}: conditional request reached the frontend 500 fallback`,
    );
  }
}

const head = await expectResponse({
  pathname: "/dashboard/settings",
  status: 200,
  noIndex: true,
  method: "HEAD",
});
check((await head.response.text()).length === 0, "HEAD response must not include a body");

const post = await request("/nasty", { method: "POST" });
check(post.status === 405, `POST /nasty: expected 405, received ${post.status}`);
check(post.headers.get("allow") === "GET, HEAD", "POST /nasty: Allow header is wrong");

const assetsDir = path.join(process.cwd(), "dist-cloudflare", "assets");
const hashedAsset = fs
  .readdirSync(assetsDir)
  .find((fileName) => /\.[a-z0-9]+$/i.test(fileName));
if (!hashedAsset) {
  failures.push("No hashed asset found for cache smoke test");
} else {
  const assetResponse = await request(`/assets/${hashedAsset}`);
  check(assetResponse.status === 200, `asset ${hashedAsset}: expected 200`);
  check(
    (assetResponse.headers.get("cache-control") || "").includes("immutable"),
    `asset ${hashedAsset}: immutable Cache-Control is missing`,
  );
}

const mediaFiles = fs
  .readdirSync(path.join(process.cwd(), "dist-cloudflare"))
  .filter((fileName) => /\.(?:mp4|webm)$/i.test(fileName));
if (mediaFiles.length) {
  const rangeResponse = await request(`/${mediaFiles[0]}`, {
    headers: { Range: "bytes=0-127" },
  });
  check(
    [200, 206].includes(rangeResponse.status),
    `media range: expected 200/206, received ${rangeResponse.status}`,
  );
}

if (failures.length) {
  console.error(`Cloudflare HTTP smoke test failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("Cloudflare HTTP smoke test passed.");
