import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readWorkspaceFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function between(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  expect(startIndex, `missing start marker: ${start}`).toBeGreaterThanOrEqual(0);
  expect(endIndex, `missing end marker: ${end}`).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

describe("Public API v1 expansion security contract", () => {
  const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
  const api = readWorkspaceFile("pocketbase/pb_hooks/api_v1.js");
  const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");
  const migration = readWorkspaceFile(
    "pocketbase/pb_migrations/1785630000_expand_public_api_v1.js",
  );

  it("retires arbitrary key creation without silently broadening old keys", () => {
    const legacyCreateRoute = between(
      hook,
      'routerAdd("POST", "/api/developer/keys"',
      'routerAdd("DELETE", "/api/developer/keys/{id}"',
    );

    expect(legacyCreateRoute).toContain("return c.json(410");
    expect(legacyCreateRoute).toContain('code: "single_key_only"');
    const legacyDeleteRoute = between(
      hook,
      'routerAdd("DELETE", "/api/developer/keys/{id}"',
      'routerAdd("GET", "/api/v1/links"',
    );
    expect(legacyDeleteRoute).toContain("return c.json(410");
    expect(legacyDeleteRoute).toContain('code: "single_key_only"');
    expect(migration).toContain(
      "Existing keys intentionally remain links:read only",
    );
    expect(migration).not.toMatch(/UPDATE\s+api_keys[\s\S]*?\bscopes\b/i);
    expect(utils).toContain(
      'normalizeApiScopes(keyRecord.get("scopes"), false)',
    );
  });

  it("exposes only the intended routes and scoped capabilities", () => {
    expect(utils).toContain('"links:read": true');
    expect(utils).toContain('"links:write": true');
    expect(utils).toContain('"profiles:read": true');
    expect(utils).toContain('"analytics:read": true');
    expect(utils).toContain(
      'var API_DEFAULT_SCOPES = ["links:read", "links:write", "profiles:read", "analytics:read"]',
    );

    expect(hook).toContain('routerAdd("POST", "/api/v1/links"');
    expect(hook).toContain('routerAdd("PATCH", "/api/v1/links/{id}"');
    expect(hook).toContain('routerAdd("GET", "/api/v1/profiles"');
    expect(hook).toContain('routerAdd("GET", "/api/v1/profiles/{id}"');
    expect(hook).toContain('routerAdd("GET", "/api/v1/links/{id}/analytics"');
    expect(hook).toContain(
      'routerAdd("GET", "/api/v1/profiles/{id}/links"',
    );
    expect(api.match(/authenticateApiRequest\(c, "links:write", "write"\)/g))
      .toHaveLength(2);
    expect(api.match(/authenticateApiRequest\(c, "profiles:read", "read"\)/g))
      .toHaveLength(3);
  });

  it("does not expose destructive Link deletion", () => {
    expect(hook).not.toMatch(
      /routerAdd\("DELETE", "\/api\/v1\/links(?:\/\{id\})?"/,
    );
    expect(api).not.toContain("deleteLink");
    expect(hook).toContain('PATCH {"active": false}');
  });

  it("uses a strict Link mutation field allowlist", () => {
    const allowlist = between(
      api,
      "var LINK_MUTATION_FIELDS = {",
      "var errorResponse = function",
    );
    const fields = Array.from(allowlist.matchAll(/"([a-z_]+)": true/g))
      .map((match) => match[1]);

    expect(fields).toEqual([
      "title",
      "slug",
      "domain",
      "destination_url",
      "active",
    ]);
    expect(api).toContain(
      "if (!Object.prototype.hasOwnProperty.call(allowedFields, keys[i]))",
    );
    expect(api).toContain('code: "unknown_field"');
    expect(api).toContain("contentLength > MAX_JSON_BODY_BYTES");
    expect(api).not.toContain("record.load(");
    expect(api).toContain("user_id: auth.user.id");
    expect(api).toContain("utils.sanitizeLinkSystemFields(record");
  });

  it("binds every record and relation lookup to the authenticated owner", () => {
    expect(api.match(/"id = \{:id\} && user_id = \{:userId\}"/g))
      .toHaveLength(2);
    expect(api).toContain(
      "WHERE pl.user_id = {:userId} AND pl.profile_id = {:profileId}",
    );
    expect(api).toContain(
      ".bind({ userId: auth.user.id, profileId: profileId })",
    );
    expect(api).toContain(
      "JOIN links l ON l.id = pl.link_id AND l.user_id = pl.user_id",
    );
    expect(api).not.toContain(
      "getOwnedLink($app, auth.user.id, assignments[i].get(\"link_id\"))",
    );
  });

  it("deduplicates Link creation inside the same transaction as the insert", () => {
    const createLink = between(
      api,
      "var createLink = function(c)",
      "var updateLink = function(c)",
    );

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS api_idempotency");
    expect(migration).toContain(
      "PRIMARY KEY (api_key_id, endpoint, idempotency_key)",
    );
    expect(migration).toContain("request_hash TEXT NOT NULL");
    expect(createLink).toContain("$app.runInTransaction((txApp) => {");
    expect(createLink).toContain("FROM api_idempotency");
    expect(createLink).toContain("txApp.save(record)");
    expect(createLink).toContain("INSERT INTO api_idempotency");
    expect(createLink).toContain("requestHash = $security.sha256(parsed.canonical)");
    expect(createLink).toContain('409, "idempotency_conflict"');
    expect(createLink).toContain("idempotent_replay: replayed");
  });

  it("uses ETags and rechecks If-Match in the update transaction", () => {
    const updateLink = between(
      api,
      "var updateLink = function(c)",
      "var parsePagination = function(c)",
    );

    expect(utils).toContain("var getApiLinkEtag = function(record)");
    expect(hook).toContain(
      'c.response.header().add("ETag", utils.getApiLinkEtag(record))',
    );
    expect(updateLink).toContain('c.request.header.get("If-Match")');
    expect(updateLink).toContain('428, "precondition_required"');
    expect(updateLink).toContain('412, "precondition_failed"');
    expect(updateLink).toContain("$app.runInTransaction((txApp) => {");
    expect(updateLink).toContain(
      "if (utils.getApiLinkEtag(record) !== ifMatch)",
    );
    expect(updateLink).toContain(
      'c.response.header().add("ETag", utils.getApiLinkEtag(saved))',
    );
  });

  it("persists independent read/write rate buckets and emits Retry-After", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS api_rate_limits");
    expect(migration).toContain("bucket_key TEXT PRIMARY KEY NOT NULL");
    expect(utils).toContain(
      'var bucketKey = String(keyId || "") + ":" + String(bucketKind || "read")',
    );
    expect(utils).toContain("INSERT INTO api_rate_limits");
    expect(utils).toContain("ON CONFLICT(bucket_key) DO UPDATE SET");
    expect(utils).toContain("RETURNING request_count");
    expect(utils).toContain(
      'rateKind === "analytics" ? "analytics" : "read"',
    );
    expect(utils).toContain("plan.apiWriteRatePerMinute");
    expect(utils).toContain("plan.apiRatePerMinute");
    expect(utils).toContain('c.response.header().add("Retry-After"');
    expect(utils).toContain("status: rate.unavailable ? 503 : 429");
    expect(utils).toContain("API_RATE_DENY_UNTIL[bucketKey] = resetAt");
  });

  it("bounds invalid Bearer lookups before querying SQLite", () => {
    const authentication = between(
      utils,
      "var authenticateApiRequest = function(c, requiredScope, rateKind)",
      "var applyApiResponseHeaders = function(c, authResult)",
    );
    expect(utils).toContain("var apiAuthLookupAllows = function(eventOrRequest, digest)");
    expect(utils).toContain("API_INVALID_AUTH_TOTAL < 600");
    expect(utils).toContain("API_INVALID_TOKEN_DENY");
    expect(authentication).toContain("if (!apiAuthLookupAllows(c, digest))");
    expect(authentication).toContain('code: "auth_rate_limit_exceeded"');
    expect(authentication.indexOf("apiAuthLookupAllows(c, digest)")).toBeLessThan(
      authentication.indexOf("$app.findFirstRecordByFilter"),
    );
  });

  it("canonicalizes managed destinations before redirect-loop checks", () => {
    expect(utils).toContain("var canonicalizeHttpPath = function(value)");
    expect(utils).toContain("var parseHttpRoutingUrl = function(value)");
    expect(utils).toContain('port === "443"');
    expect(utils).toContain('port === "80"');
    expect(utils).toContain("port = String(numericPort)");
    expect(utils).toContain("numericPort > 65535");
    expect(utils).toContain("require IDNs in explicit punycode");
    expect(utils).toContain('/^[\\x21-\\x7e]+$/.test(authority)');
    expect(utils).toContain('replace(/\\.+$/, "")');
    expect(utils).toContain("decodeURIComponent(path)");
    expect(utils).toContain("parsedUrl.hasCredentials");
    expect(utils).toContain("legacy runtime rows");
    expect(utils).not.toContain("if (!parsedUrl || parsedUrl.hasCredentials) return null");
  });

  it("caps request bodies and daily mutation/storage growth", () => {
    expect(hook.match(/\$apis\.bodyLimit\(64 \* 1024\)/g)).toHaveLength(2);
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS api_usage_daily");
    expect(migration).toContain("write_count INTEGER NOT NULL DEFAULT 0");
    expect(migration).toContain("create_count INTEGER NOT NULL DEFAULT 0");
    expect(migration).toContain("PRIMARY KEY (user_id, usage_date)");
    expect(api).toContain("consumeDailyMutationAllowance(txApp, auth.user.id, plan, true)");
    expect(api).toContain("consumeDailyMutationAllowance(txApp, auth.user.id, plan, false)");
    expect(api).toContain('"daily_create_limit_exceeded"');
    expect(api).toContain('"daily_write_limit_exceeded"');
  });

  it("keeps rate and daily limits across API key rotation", () => {
    expect(utils).toContain("var consumeApiKeyRefreshAllowance = function(app, userId, cooldownSeconds)");
    expect(utils).toContain('var bucketKey = "key-refresh:" + String(userId || "")');
    expect(hook).toContain("utils.consumeApiKeyRefreshAllowance(txApp, user.id, 300)");
    expect(hook).toContain('code: "key_refresh_rate_limited"');
    expect(hook).toContain("status = 'revoked' AND updated < datetime('now', '-7 days')");
    expect(migration).toContain("idx_api_keys_status_updated_cleanup");
  });

  it("keeps profile composition scope-correct and cleanup bounded", () => {
    expect(api).toContain('auth.scopes.indexOf("links:read") === -1');
    expect(api).toContain("utils.serializeApiLinkValues");
    expect(migration).toContain("idx_api_mutation_audit_created");
    expect(hook).toContain("LIMIT 5000");
    expect(hook).toContain("datetime('now', '-30 days')");
    expect(api).toContain("if (!replayed)");
  });
});
