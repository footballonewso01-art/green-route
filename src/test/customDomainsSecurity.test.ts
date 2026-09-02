import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeCustomDomainInput } from "@/lib/customDomains";
import { getPublicProfileCardHref } from "@/lib/publicAssets";
import { DEFAULT_AVAILABLE_DOMAINS } from "@/lib/siteConfig";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("custom domain security contract", () => {
  const hook = read("pocketbase/pb_hooks/custom_domains.pb.js");
  const service = read("pocketbase/pb_hooks/custom_domains.js");
  const migration = read("pocketbase/pb_migrations/1787950000_create_custom_domains.js");
  const provisioningMigration = read("pocketbase/pb_migrations/1787990000_create_custom_domain_provisioning_events.js");
  const worker = read("cloudflare/worker.ts");
  const utils = read("pocketbase/pb_hooks/utils.js");
  const apiGateway = read("cloudflare/api-worker.ts");
  const apiV1 = read("pocketbase/pb_hooks/api_v1.js");

  it("keeps lifecycle records private and enforces one owned target", () => {
    expect(migration).toContain("listRule: null");
    expect(migration).toContain("viewRule: null");
    expect(migration).toContain("createRule: null");
    expect(migration).toContain("idx_custom_domains_hostname");
    expect(migration).toContain("custom_domains_target_guard_insert");
    expect(migration).toContain("l.user_id = NEW.user_id");
    expect(migration).toContain("p.user_id = NEW.user_id");
  });

  it("keeps Cloudflare credentials server-side and masks provider failures", () => {
    expect(service).toContain('$os.getenv("CLOUDFLARE_SAAS_API_TOKEN")');
    expect(service).toContain('"Authorization": "Bearer " + config.token');
    expect(hook).toContain("Domain provisioning is temporarily unavailable. No DNS changes were made.");
    expect(hook).not.toContain("cloudflare_hostname_id: String(record.get");
    expect(read("src/lib/customDomains.ts")).not.toContain("CLOUDFLARE_SAAS_API_TOKEN");
    expect(read("src/lib/customDomains.ts")).toContain("response.domains.filter");
  });

  it("supports a fail-closed staged rollout without deleting configuration", () => {
    expect(service).toContain('$os.getenv("CUSTOM_DOMAINS_ENABLED")');
    expect(hook).toContain('if (!domains.featureEnabled()) return c.json(503');
    expect(hook).toContain("if (!domains.featureEnabled()) return c.json(404");
    expect(hook).toContain("if (!domains.featureEnabled()) return;");
  });

  it("enforces Free 0, Pro 2 and Agency 10 on the server before creating a reservation", () => {
    expect(utils).toContain("{ pro: 2, agency: 10 }");
    expect(service).toContain("MAX_CUSTOM_DOMAINS = 10");
    expect(hook).toContain("currentPlanConfig.limit <= 0");
    expect(hook).toContain("accountDomains.length >= currentPlanConfig.limit");
    expect(hook.indexOf("accountDomains.length >= currentPlanConfig.limit")).toBeLessThan(hook.indexOf("return c.json(201"));
  });

  it("persists provider allocation attempts across disconnects and rate-limits certificate pressure", () => {
    expect(provisioningMigration).toContain('name: "custom_domain_provisioning_events"');
    expect(provisioningMigration).toContain("listRule: null");
    expect(provisioningMigration).toContain("viewRule: null");
    expect(provisioningMigration).toContain("idx_cd_provision_owner_created");
    expect(service).toContain("CUSTOM_DOMAIN_PROVISIONING_LIMITS = { pro: 6, agency: 30 }");
    expect(service).toContain("GLOBAL_PROVISIONING_LIMIT_PER_MINUTE = 10");
    expect(service).toContain("reserveProvisioningAttempt(record, owner, planConfig)");
    expect(service).toContain("PROVISIONING_RETRY_MS");
    expect(service).not.toContain('$app.delete(event)');
  });

  it("prevents unverified hostname squatting while making verified ownership atomic", () => {
    expect(provisioningMigration).toContain("DROP INDEX IF EXISTS idx_custom_domains_hostname");
    expect(provisioningMigration).toContain("idx_custom_domains_hostname_lookup");
    expect(provisioningMigration).toContain("idx_custom_domains_verified_hostname");
    expect(provisioningMigration).toContain("WHERE dns_verified_at != '' OR provisioning_started_at != '' OR cloudflare_hostname_id != ''");
    expect(hook).toContain("hostname = {:hostname} && (user_id = {:userId} || dns_verified_at != '' || provisioning_started_at != '' || cloudflare_hostname_id != '')");
    expect(service).toContain("already been verified by another Linktery connection");
  });

  it("resolves custom roots strictly by hostname and stored target id", () => {
    expect(utils).toContain("resolveActiveCustomDomainTarget");
    expect(utils).toContain("hostname = {:hostname} && status = 'active' && target_type = {:targetType}");
    expect(utils).not.toContain("custom_domains.*slug");
    expect(worker).toContain('headers.set("X-Linktery-Custom-Domain-Root", "1")');
    expect(worker).toContain('url.pathname !== "/"');
    expect(hook).toContain("utils.isCustomDomainRecordWithinPlanLimit($app, owner, mapping)");
  });

  it("never accepts the legacy profile resolver contract on customer hostnames", () => {
    expect(worker).toContain("&& !isCustomDomainHostname(url.hostname)");
    expect(worker).toContain('const expectedAttestation = url.pathname === "/api/public/custom-domain"');
  });

  it("preserves www on customer hostnames in both React fallback resolvers", () => {
    const fallback = read("pocketbase/pb_hooks/main.pb.js");
    const guard = 'if (!customDomainRoot) requestedHost = requestedHost.replace(/^www\\./, "")';

    expect(fallback.split(guard)).toHaveLength(3);
  });

  it("blocks orphaned hostnames and never calls Cloudflare on public traffic", () => {
    expect(service).toContain("Disconnect the custom domain before deleting this");
    expect(hook).toContain('filter += targetType === "link" ? " && link_id = {:targetId}" : " && profile_id = {:targetId}"');
    expect(hook).toContain('filterParams = { userId: user.id }');
    expect(service).toContain("cleanupUserHostnamesBeforeDelete");
    expect(service).toContain("response.statusCode !== 404");
    expect(read("pocketbase/pb_hooks/main.pb.js")).toContain('cleanupUserHostnamesBeforeDelete(e)');
    expect(hook).toContain('cronAdd("reconcile_custom_domains"');
    const publicStart = hook.indexOf('routerAdd("GET", "/api/public/custom-domain"');
    const publicRoute = hook.slice(publicStart, hook.indexOf("// Prevent orphaned", publicStart));
    expect(publicRoute).not.toContain("domains.cloudflareRequest(");
  });

  it("does not expose domain lifecycle routes through API keys or the generic Records API", () => {
    expect(migration).toContain("listRule: null");
    expect(migration).toContain("createRule: null");
    expect(apiGateway).not.toContain("/v1/domains");
    expect(apiV1).not.toContain("custom_domains");
    expect(hook).toContain('user.collection().name !== "users"');
    expect(hook).toContain('String(record.get("user_id") || "") !== user.id');
  });

  it("loads domain destinations through an authenticated field-limited owner route", () => {
    expect(hook).toContain('routerAdd("GET", "/api/domains/targets"');
    expect(hook).toContain('filter = "user_id = {:userId}"');
    expect(hook).toContain('kind === "link" ? " && active = true"');
    expect(hook).toContain('name: String(record.get(labelField) || slug)');
    expect(read("src/components/settings/DomainTargetPicker.tsx")).toContain("listCustomDomainTargets");
    expect(read("src/components/settings/DomainTargetPicker.tsx")).not.toContain('.collection("links")');
  });

  it("normalizes friendly domain input without inventing a path", () => {
    expect(normalizeCustomDomainInput(" HTTPS://Brand.Example/path?q=1 ")).toBe("brand.example");
    expect(normalizeCustomDomainInput("links.brand.example.")).toBe("links.brand.example");
  });

  it("keeps profile card clicks on the Link router with attribution on custom hosts", () => {
    const result = getPublicProfileCardHref({ slug: "store", domain: "linktery.bio" }, "profile1", "card1", true);
    expect(result).toBe("https://linktery.bio/store?ref=profile&profile_id=profile1&profile_link_id=card1");
    expect(getPublicProfileCardHref({ slug: "store", domain: "evil.example" }, "profile1", "card1", true)).toMatch(/^https:\/\/linktery.com\/store/);
    expect(getPublicProfileCardHref({ slug: "store", domain: "linktery.bio" }, "profile1", "card1", false)).toMatch(/^\/store\?/);
  });

  it.each(DEFAULT_AVAILABLE_DOMAINS)("routes cards from %s to each Link's actual hostname", (profileHost) => {
    const path = "/store?ref=profile&profile_id=profile1&profile_link_id=card1";
    for (const linkHost of DEFAULT_AVAILABLE_DOMAINS) {
      const result = getPublicProfileCardHref({ slug: "store", domain: linkHost }, "profile1", "card1", false, profileHost);
      expect(result).toBe(linkHost === profileHost ? path : `https://${linkHost}${path}`);
    }
  });

  it("normalizes legacy domain values and safely encodes profile attribution", () => {
    expect(getPublicProfileCardHref({ slug: "store", domain: " LINKTERY.BIO. " }, "profile1", "card1", false, "linktery.com")).toMatch(/^https:\/\/linktery.bio\/store\?/);
    expect(getPublicProfileCardHref({ slug: "store", domain: "" }, "profile1", "card1", false, "linktery.bio")).toMatch(/^https:\/\/linktery.com\/store\?/);
    const url = new URL(getPublicProfileCardHref({ slug: "store", domain: "evil.example" }, "profile&1", "card#1", true, "brand.example"));
    expect(url.hostname).toBe("linktery.com");
    expect(url.searchParams.get("profile_id")).toBe("profile&1");
    expect(url.searchParams.get("profile_link_id")).toBe("card#1");
  });

  it.each(["localhost", "127.0.0.1", "[::1]", "linktery-frontend-staging.footballonewso01.workers.dev"])("keeps preview clicks on %s away from production", (host) => {
    expect(getPublicProfileCardHref({ slug: "store", domain: "linktery.bio" }, "profile1", "card1", false, host)).toMatch(/^\/store\?/);
  });
});
