import process from "node:process";

const baseUrl = new URL(process.argv[2] || "https://api.linktery.com");
const requestTimeoutMs = 10_000;

async function request(pathname, init = {}) {
  return fetch(new URL(pathname, baseUrl), {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const unauthorized = await request("/v1/links");
assert(unauthorized.status === 401, `Expected API authentication 401, received ${unauthorized.status}.`);
assert(
  unauthorized.headers.get("x-linktery-api-version") === "1",
  "The branded API version header is missing.",
);
assert(
  unauthorized.headers.get("cache-control")?.includes("no-store"),
  "API responses must not be cached.",
);
const unauthorizedBody = await unauthorized.json();
assert(unauthorizedBody?.error, "The authentication failure is not a structured API error.");

const internalRoute = await request("/api/collections/users/records");
assert(internalRoute.status === 404, `Internal PocketBase route returned ${internalRoute.status}.`);

const unsupportedMethod = await request("/v1/links/aaaaaaaaaaaaaaa", { method: "DELETE" });
assert(unsupportedMethod.status === 405, `Unsupported method returned ${unsupportedMethod.status}.`);
assert(unsupportedMethod.headers.get("allow") === "GET, PATCH", "Unexpected Allow header.");

console.log(`Public API smoke checks passed for ${baseUrl.origin}.`);
