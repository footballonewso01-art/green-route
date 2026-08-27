import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("production security hardening contract", () => {
  const main = read("pocketbase/pb_hooks/main.pb.js");
  const utils = read("pocketbase/pb_hooks/utils.js");
  const apiV1 = read("pocketbase/pb_hooks/api_v1.js");
  const apiWorker = read("cloudflare/api-worker.ts");
  const frontendWorker = read("cloudflare/worker.ts");

  it("makes Cloudflare the authenticated boundary for the Public API", () => {
    expect(apiWorker).toContain('headers.set("X-Linktery-API-Origin-Secret", String(env.API_ORIGIN_SECRET || ""))');
    expect(apiWorker).toContain('upstreamResponse.headers.get("X-Linktery-API-Origin") !== "v1"');
    expect(apiWorker).toContain("API_EDGE_RATE_LIMITER");
    expect(utils).toContain("isTrustedApiGatewayRequest");
    expect(utils).toContain("isApiGatewayEnforcementEnabled");
    expect(utils).toContain('c.response.header().add("X-Linktery-API-Origin", "v1")');
    expect(utils).not.toContain("API_AUTH_INVALID_GLOBAL");
  });

  it("never reflects arbitrary backend validation errors to API clients", () => {
    expect(apiV1).toContain("PUBLIC_MUTATION_VALIDATION_MESSAGES");
    expect(apiV1).toContain("getPublicMutationValidationMessage(err)");
    expect(apiV1).not.toContain('errorResponse(c, auth, 400, "invalid_request", safeMessage)');
  });

  it("pins Stripe products and authenticates webhook payloads", () => {
    expect(utils).toContain("STRIPE_PRICE_CATALOG");
    expect(utils).toContain("requireKnownStripeLineItemPrice");
    expect(main.match(/requireKnownStripeLineItemPrice/g)?.length).toBeGreaterThanOrEqual(3);
    expect(main).toContain('c.request.header.get("Stripe-Signature")');
    expect(main).toContain("rawBody = readerToString(c.request.body)");
    expect(main).toContain('$security.hs256(String(timestamp) + "." + rawBody, STRIPE_WEBHOOK_SECRET)');
    expect(main).toContain("Math.abs(nowSeconds - timestamp) > 300");
    expect(main).toContain("$apis.bodyLimit(64 * 1024)");
    expect(main).not.toContain('var planName = "pro"');
  });

  it("revokes API credentials when paid entitlement is lost", () => {
    expect(utils).toContain("getEffectivePlanNameForUser");
    expect(utils).toContain("revokeActiveApiKeysForUser");
    expect(main.match(/revokeActiveApiKeysForUser/g)?.length).toBeGreaterThanOrEqual(2);
    expect(main).toContain('subUser.set("plan_status", "canceled")');
    expect(main).toContain('user.set("plan_status", "active")');
    expect(main).toContain("Unable to reconcile API keys after account entitlement update");
  });

  it("keeps raw telemetry private and proxies bounded first-party events", () => {
    const migration = read("pocketbase/pb_migrations/1786470000_lock_client_telemetry_collections.js");
    const landing = read("src/pages/LandingPage.tsx");
    const auth = read("src/contexts/AuthContext.tsx");
    const redirect = read("src/pages/RedirectHandler.tsx");

    expect(migration).toContain('["analytics_events", "system_logs", "api_keys", "clicks"]');
    expect(migration).toContain("collection.listRule = null");
    expect(migration).toContain("collection.viewRule = null");
    expect(migration).toContain("collection.createRule = null");
    expect(migration).toContain("collection.updateRule = null");
    expect(migration).toContain("collection.deleteRule = null");
    expect(migration).toContain("'$.trustedProxy.headers', json_array('Fly-Client-IP')");
    expect(frontendWorker).toContain('url.pathname === "/api/telemetry"');
    expect(frontendWorker).toContain('url.pathname === "/api/track-click"');
    expect(frontendWorker).toContain("readBoundedBody");
    expect(landing).not.toContain('collection("analytics_events").create');
    expect(auth).not.toContain('collection("system_logs").create');
    expect(redirect).toContain('const trackingUrl = "/api/track-click"');
    expect(frontendWorker).toContain("resolvePublicLinkForBrowser");
    expect(frontendWorker).toContain('headers.set("X-Linktery-Country", country)');
    expect(utils).not.toContain("ip-api.com");
  });

  it("reveals a key only after an explicit authenticated action", () => {
    const settings = read("src/components/settings/ApiAccessSettings.tsx");
    expect(main).toContain('routerAdd("POST", "/api/developer/key/reveal"');
    expect(main.match(/secret: ""/g)?.length).toBeGreaterThanOrEqual(2);
    expect(settings).toContain('pb.send("/api/developer/key/reveal"');
    expect(settings).toContain("revealSecret");
    expect(settings).toContain("toggleReveal");
  });

  it("ships an exact browser-origin allowlist instead of wildcard CORS", () => {
    const dockerfile = read("pocketbase/Dockerfile");
    const entrypoint = read("pocketbase/entrypoint.sh");
    expect(dockerfile).toContain('ENTRYPOINT ["/pb/entrypoint.sh"]');
    expect(entrypoint).toContain("--origins=https://linktery.com,https://www.linktery.com");
    expect(entrypoint).not.toContain("--origins=*");
  });
});
