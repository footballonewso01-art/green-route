import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const baseUrl = new URL(process.argv[2] || "http://127.0.0.1:8787");
const deployEnvironment = process.argv[3] || "production";
if (deployEnvironment !== "production") {
  throw new Error("Alias smoke tests require a production artifact.");
}

const failures = [];

async function request(pathname, options = {}) {
  return fetch(new URL(pathname, baseUrl), {
    redirect: "manual",
    ...options,
  });
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function expectPrimaryRedirect(pathname, expectedPathname) {
  const response = await request(pathname);
  check(response.status === 308, `${pathname}: expected 308, received ${response.status}`);
  const location = response.headers.get("location");
  check(Boolean(location), `${pathname}: Location header is missing`);
  if (!location) return;

  const target = new URL(location);
  check(target.hostname === "linktery.com", `${pathname}: redirect host is ${target.hostname}`);
  check(target.pathname === expectedPathname, `${pathname}: redirect path is ${target.pathname}`);
  check(
    target.search === new URL(pathname, baseUrl).search,
    `${pathname}: redirect query string was not preserved`,
  );
}

await expectPrimaryRedirect("/?utm_source=alias-smoke", "/");
await expectPrimaryRedirect("/pricing?utm_source=alias-smoke", "/pricing");
await expectPrimaryRedirect("/dashboard/settings?tab=api", "/dashboard/settings");

for (const pathname of ["/nasty", "/index", "/landing"]) {
  const response = await request(pathname);
  const body = await response.text();
  check(response.status === 200, `${pathname}: expected SPA 200, received ${response.status}`);
  check(
    body.includes('<meta name="robots" content="noindex, nofollow" />'),
    `${pathname}: public SPA shell is missing`,
  );
}

for (const pathname of ["/foo/bar", "/compare/not-real", "/_linktery/app-shell"]) {
  const response = await request(pathname);
  check(response.status === 404, `${pathname}: expected 404, received ${response.status}`);
}

const post = await request("/nasty", { method: "POST" });
check(post.status === 405, `POST /nasty: expected 405, received ${post.status}`);
check(post.headers.get("allow") === "GET, HEAD", "POST /nasty: Allow header is wrong");

const assetsDir = path.join(process.cwd(), "dist-cloudflare", "assets");
const assetName = fs
  .readdirSync(assetsDir)
  .find((fileName) => /\.[a-z0-9]+$/i.test(fileName));
if (!assetName) {
  failures.push("No hashed asset found for alias cache smoke test");
} else {
  const assetResponse = await request(`/assets/${assetName}`);
  check(assetResponse.status === 200, `asset ${assetName}: expected 200`);
  check(
    (assetResponse.headers.get("cache-control") || "").includes("immutable"),
    `asset ${assetName}: immutable Cache-Control is missing`,
  );
}

if (failures.length) {
  console.error(`Cloudflare alias smoke test failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("Cloudflare alias smoke test passed.");
