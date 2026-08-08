import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readWorkspaceFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("public API foundation hardening", () => {
  const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
  const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");
  const migration = readWorkspaceFile(
    "pocketbase/pb_migrations/1785201000_harden_public_api_foundation.js",
  );
  const apiKeyMigration = readWorkspaceFile(
    "pocketbase/pb_migrations/1785201100_create_api_keys.js",
  );
  const singleKeyMigration = readWorkspaceFile(
    "pocketbase/pb_migrations/1785290000_enable_single_revealable_api_key.js",
  );

  it("locks every raw clicks collection operation", () => {
    expect(migration).toContain("clicks.listRule = null");
    expect(migration).toContain("clicks.viewRule = null");
    expect(migration).toContain("clicks.createRule = null");
    expect(migration).toContain("clicks.updateRule = null");
    expect(migration).toContain("clicks.deleteRule = null");
  });

  it("enables the configured PocketBase global rate limiter", () => {
    expect(migration).toContain("$.rateLimits.enabled");
    expect(migration).toContain("json('true')");
  });

  it("derives click uniqueness on the server and limits telemetry abuse", () => {
    expect(hook.match(/utils\.clickRateLimitAllows\(c, link\.id\)/g)).toHaveLength(2);
    expect(hook.match(/utils\.isUniqueTrackedClick\(c, link\.id\)/g)).toHaveLength(2);
    expect(hook).not.toContain('"is_unique": data.is_unique === true');
    expect(hook).not.toContain("gr_visit_");
    expect(utils).toContain("CLICK_RATE_BY_IP_AND_LINK");
    expect(utils).toContain("$security.sha256");
  });

  it("validates reserved slugs on all public resource mutations", () => {
    expect(utils).toContain("var validateLinkRecordForMutation");
    expect(hook.match(/utils\.validateLinkRecordForMutation\(\$app, e\.record\)/g))
      .toHaveLength(2);
    expect(hook.match(/utils\.validatePublicSlug\(e\.record\.get\("slug"\)\)/g))
      .toHaveLength(2);
    expect(migration).toContain("prevent_reserved_link_slug_on_insert");
    expect(migration).toContain("prevent_reserved_profile_slug_on_insert");
  });

  it("keeps one revealable API key behind custom lifecycle routes", () => {
    expect(apiKeyMigration).toContain("name: \"api_keys\"");
    expect(apiKeyMigration).toContain("listRule: null");
    expect(apiKeyMigration).toContain("viewRule: null");
    expect(apiKeyMigration).toContain("createRule: null");
    expect(apiKeyMigration).toContain("updateRule: null");
    expect(apiKeyMigration).toContain("deleteRule: null");
    expect(apiKeyMigration).toContain("idx_api_keys_hash");
    expect(singleKeyMigration).toContain('name: "encrypted_secret"');
    expect(singleKeyMigration).toContain("idx_api_keys_one_active_per_user");
    expect(hook).toContain('routerAdd("GET", "/api/developer/key"');
    expect(hook).toContain('routerAdd("POST", "/api/developer/key/refresh"');
    expect(hook).toContain("txApp.findRecordsByFilter");
    expect(hook).toContain("utils.createManagedApiKey(txApp, user.id)");
    expect(utils).toContain("$security.sha256(pepper + \":\" + String(token || \"\"))");
    expect(utils).toContain("$security.encrypt");
    expect(utils).toContain("$security.decrypt");
    expect(utils).toContain("API_KEY_ENCRYPTION_KEY");
    expect(utils).toContain('"agency": { "links": -1, "publicProfiles": 25, "monthlyPrice": 29, "analytics": true, "customSlug": true, "apiKeys": 1');
  });

  it("authenticates v1 exclusively with scoped Bearer keys", () => {
    expect(hook).toContain('routerAdd("GET", "/api/v1/links"');
    expect(hook).toContain('routerAdd("GET", "/api/v1/links/{id}"');
    expect(hook).toContain('utils.authenticateApiRequest(c, "links:read")');
    expect(utils).toContain('c.request.header.get("Authorization")');
    expect(utils).toContain("consumeApiRateLimit(user.id");
    expect(utils).toContain("key_prefix = {:prefix} && secret_hash = {:digest}");
    expect(utils).not.toContain('query.get("api_key")');
  });
});
