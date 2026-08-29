import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

class TestRecord {
  id = "domain000000001";
  values: Record<string, unknown> = {
    hostname: "www.brand.example", user_id: "owner0000000001", target_type: "link", link_id: "link00000000001",
    status: "pending", ownership_token: "linktery-domain-proof", created: new Date().toISOString(),
  };
  get(name: string) { return this.values[name] || ""; }
  getString(name: string) { return String(this.get(name)); }
  set(name: string, value: unknown) { this.values[name] = value; }
}

let eventSequence = 0;
class TestEventRecord extends TestRecord {
  constructor(_collection?: unknown, values: Record<string, unknown> = {}) {
    super();
    eventSequence += 1;
    this.id = `event${String(eventSequence).padStart(10, "0")}`;
    this.values = { ...values, created: new Date().toISOString() };
  }
}

function setup() {
  const record = new TestRecord();
  const target = new TestRecord();
  target.id = "link00000000001";
  target.set("active", true);
  const owner = new TestRecord();
  owner.id = "owner0000000001";
  owner.set("plan", "agency");
  owner.set("plan_status", "active");
  owner.set("plan_expires_at", "2030-01-01 00:00:00.000Z");
  const environment: Record<string, string> = {
    CUSTOM_DOMAINS_ENABLED: "true", CLOUDFLARE_SAAS_API_TOKEN: "local-test-token",
    CLOUDFLARE_SAAS_ZONE_ID: "a".repeat(32), CLOUDFLARE_SAAS_CNAME_TARGET: "domains.linktery.com",
  };
  const send = vi.fn();
  const provisioningEvents: TestEventRecord[] = [];
  const app = {
    findRecordById: vi.fn((collection: string, id?: string) => collection === "custom_domains"
      ? record
      : collection === "users"
        ? owner
        : collection === "custom_domain_provisioning_events"
          ? provisioningEvents.find((event) => event.id === id)
          : target),
    findRecordsByFilter: vi.fn((collection: string) => collection === "custom_domains" ? [record] : collection === "custom_domain_provisioning_events" ? provisioningEvents : []),
    findCollectionByNameOrId: vi.fn((name: string) => ({ name })),
    save: vi.fn((saved: TestRecord) => {
      if (saved instanceof TestEventRecord && !provisioningEvents.some((event) => event.id === saved.id)) provisioningEvents.push(saved);
    }),
    delete: vi.fn(),
    runInTransaction: (fn: (value: unknown) => unknown) => fn(app),
    db: () => ({ newQuery: () => ({ bind: () => ({ execute: vi.fn() }) }) }),
    logger: () => ({ error: vi.fn() }),
  };
  const module = { exports: {} };
  runInNewContext(readFileSync(resolve("pocketbase/pb_hooks/custom_domains.js"), "utf8"), {
    module, $app: app, $http: { send },
    $security: { randomString: () => "local-test-operation-token" },
    $os: { getenv: (name: string) => environment[name] || "" },
    __hooks: "test-hooks",
    require: () => ({
      getEffectivePlanNameForUser: (user: TestRecord) => user.get("plan"),
      getCustomDomainLimitForPlan: (plan: string) => plan === "pro" ? 2 : plan === "agency" ? 10 : 0,
      isCustomDomainRecordWithinPlanLimit: (_app: unknown, user: TestRecord) => ["pro", "agency"].includes(String(user.get("plan"))),
    }),
    Record: TestEventRecord,
    BadRequestError: Error, ForbiddenError: Error,
  });
  const service = module.exports as {
    normalizeHostname(value: string): string;
    getOwnedTarget(user: { id: string }, type: string, id: string): unknown;
    verifyOwnershipDns(record: TestRecord): boolean;
    refreshRecord(record: TestRecord): TestRecord;
    disconnectRecord(record: TestRecord): void;
    updateFromCloudflare(record: TestRecord, result: unknown): void;
    getPlanConfigForUser(user: TestRecord): { plan: string; limit: number; provisioningLimit: number };
  };
  return { record, target, owner, environment, service, send, app, provisioningEvents };
}

describe("custom domain lifecycle behavior", () => {
  it("recognizes custom roots in loop prevention without collapsing www into the apex", () => {
    const target = new TestRecord();
    target.id = "link00000000001";
    const mapping = new TestRecord();
    const query = vi.fn((_collection: string, _filter: string, params: { hostname?: string }) => {
      if (params.hostname !== "www.brand.example") throw new Error("not found");
      return mapping;
    });
    const app = { findFirstRecordByFilter: query, findRecordById: () => target };
    const module = { exports: {} };
    runInNewContext(readFileSync(resolve("pocketbase/pb_hooks/utils.js"), "utf8"), {
      module, $app: app, $os: { getenv: () => "" }, BadRequestError: Error,
    });
    const helpers = module.exports as {
      findManagedShortLinkTarget(url: string, app: unknown): TestRecord | null;
      validateTargetingUrls(record: TestRecord, app: unknown, hostname?: string): void;
    };
    expect(helpers.findManagedShortLinkTarget("https://www.brand.example/", app)).toBe(target);
    expect(helpers.findManagedShortLinkTarget("https://brand.example/", app)).toBeNull();
    target.set("destination_url", "https://www.brand.example/");
    expect(() => helpers.validateTargetingUrls(target, app)).toThrow(/final destination/);
    target.set("destination_url", "https://new-brand.example/");
    expect(() => helpers.validateTargetingUrls(target, app, "new-brand.example")).toThrow(/points back/);
  });
  it("preserves exact www hosts and rejects reserved, malformed and private addresses", () => {
    const { service } = setup();
    expect(service.normalizeHostname(" WWW.Brand.Example. ")).toBe("www.brand.example");
    for (const hostname of ["linktery.com", "api.linktery.com", "foo.workers.dev", "127.0.0.1", "localhost", "*.brand.example", "a.example:443", "https://a.example", "-a.example", "a..example"]) {
      expect(() => service.normalizeHostname(hostname)).toThrow();
    }
  });

  it("rejects cross-account and inactive targets", () => {
    const { service, target } = setup();
    expect(() => service.getOwnedTarget({ id: "other0000000001" }, "link", target.id)).toThrow(/does not belong/);
    target.set("active", false);
    expect(() => service.getOwnedTarget({ id: "owner0000000001" }, "link", target.id)).toThrow(/Activate/);
  });

  it("maps paid plan entitlements to the server-side domain and provisioning limits", () => {
    const { service, owner } = setup();
    owner.set("plan", "pro");
    expect(service.getPlanConfigForUser(owner)).toEqual({ plan: "pro", limit: 2, provisioningLimit: 6 });
    owner.set("plan", "agency");
    expect(service.getPlanConfigForUser(owner)).toEqual({ plan: "agency", limit: 10, provisioningLimit: 30 });
    owner.set("plan", "creator");
    expect(service.getPlanConfigForUser(owner)).toEqual({ plan: "creator", limit: 0, provisioningLimit: 0 });
  });

  it("requires a tenant-specific DNS TXT before spending on Cloudflare provisioning", () => {
    const { service, send, record } = setup();
    send.mockReturnValue({ statusCode: 200, json: { Status: 0, Answer: [{ type: 16, data: '"someone-else"' }] } });
    service.refreshRecord(record);
    expect(record.get("status")).toBe("pending");
    expect(record.get("dns_verified_at")).toBe("");
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].url).toMatch(/^https:\/\/cloudflare-dns.com\/dns-query\?/);
  });

  it.each(["expired plan", "outside pilot", "feature disabled"])("does not provision a hostname for %s", (reason) => {
    const { service, send, record, owner, environment } = setup();
    if (reason === "expired plan") owner.set("plan", "free");
    if (reason === "outside pilot") environment.CUSTOM_DOMAINS_ALLOWED_USER_IDS = "someoneelse0001";
    if (reason === "feature disabled") environment.CUSTOM_DOMAINS_ENABLED = "false";
    service.refreshRecord(record);
    expect(send).not.toHaveBeenCalled();
    expect(record.get("status")).toBe("pending");
    expect(Date.parse(String(record.get("next_check_at")))).toBeGreaterThan(Date.now() + 23 * 3600 * 1000);
  });

  it.each(["www.brand.example", `${"a".repeat(60)}.brand.example`])("provisions %s with the appropriate certificate settings", (hostname) => {
    const { service, send, record, provisioningEvents } = setup();
    record.set("hostname", hostname);
    send.mockReturnValueOnce({ statusCode: 200, json: { Status: 0, Answer: [{ type: 16, data: '"linktery-domain-proof"' }] } });
    send.mockReturnValueOnce({ statusCode: 200, json: { success: true, result: [] } });
    send.mockReturnValueOnce({ statusCode: 200, json: { success: true, result: { id: "provider-hostname-123", hostname, status: "pending", ssl: { status: "pending" } } } });
    service.refreshRecord(record);
    const body = JSON.parse(send.mock.calls[2][0].body);
    expect(body.hostname).toBe(hostname);
    expect(body.ssl.settings.min_tls_version).toBe("1.2");
    expect(body.ssl.cloudflare_branding).toBe(hostname.length > 64 ? true : undefined);
    expect(record.get("provisioning_started_at")).not.toBe("");
    expect(provisioningEvents).toHaveLength(1);
    expect(provisioningEvents[0].get("outcome")).toBe("allocated");
  });

  it("does not repeat an ambiguous provider POST inside the 15-minute recovery window", () => {
    const { service, send, record, provisioningEvents } = setup();
    const dnsProof = { statusCode: 200, json: { Status: 0, Answer: [{ type: 16, data: '"linktery-domain-proof"' }] } };
    const noProviderRecord = { statusCode: 200, json: { success: true, result: [] } };
    send.mockReturnValueOnce(dnsProof);
    send.mockReturnValueOnce(noProviderRecord);
    send.mockImplementationOnce(() => { throw new Error("provider timeout"); });
    expect(() => service.refreshRecord(record)).toThrow(/provider timeout/);
    record.set("operation_token", "");
    record.set("operation_expires_at", "");
    send.mockReturnValueOnce(dnsProof);
    send.mockReturnValueOnce(noProviderRecord);
    service.refreshRecord(record);
    expect(send.mock.calls.filter(([input]) => input.method === "POST")).toHaveLength(1);
    expect(provisioningEvents).toHaveLength(1);
  });

  it("keeps the rolling provisioning budget after records are disconnected", () => {
    const { service, send, record, owner, provisioningEvents } = setup();
    owner.set("plan", "pro");
    for (let index = 0; index < 6; index += 1) {
      provisioningEvents.push(new TestEventRecord(undefined, {
        user_id: owner.id,
        domain_record_id: record.id,
        hostname: `brand-${index}.example`,
        plan: "pro",
        outcome: "allocated",
      }));
    }
    send.mockReturnValueOnce({ statusCode: 200, json: { Status: 0, Answer: [{ type: 16, data: '"linktery-domain-proof"' }] } });
    send.mockReturnValueOnce({ statusCode: 200, json: { success: true, result: [] } });
    expect(() => service.refreshRecord(record)).toThrow(/Monthly custom domain setup allowance reached/);
    expect(send.mock.calls.filter(([input]) => input.method === "POST")).toHaveLength(0);
    expect(provisioningEvents).toHaveLength(6);
  });

  it("recovers a previously timed-out provisioning by exact hostname, without a second POST", () => {
    const { service, send, record } = setup();
    send.mockReturnValueOnce({ statusCode: 200, json: { Status: 0, Answer: [{ type: 16, data: '"linktery-domain-" "proof"' }] } });
    send.mockReturnValueOnce({ statusCode: 200, json: { success: true, result: [{ id: "provider-hostname-123", hostname: "www.brand.example", status: "active", ssl: { status: "active", validation_records: [] } }] } });
    const result = service.refreshRecord(record);
    expect(result.get("status")).toBe("active");
    expect(result.get("cloudflare_hostname_id")).toBe("provider-hostname-123");
    expect(send.mock.calls.map(([input]) => input.method)).toEqual(["GET", "GET"]);
    expect(Date.parse(String(result.get("next_check_at")))).toBeGreaterThan(Date.now() + 23 * 3600 * 1000);
  });

  it("will not mark a zone-validated hostname active without tenant proof", () => {
    const { service, record } = setup();
    service.updateFromCloudflare(record, { hostname: "www.brand.example", status: "active", ssl: { status: "active" } });
    expect(record.get("status")).toBe("pending");
    expect(() => service.updateFromCloudflare(record, { hostname: "other.example" })).toThrow(/did not match/);
  });

  it("serializes verification/disconnection and makes no provider request while busy", () => {
    const { service, send, record } = setup();
    record.set("operation_expires_at", new Date(Date.now() + 30000).toISOString());
    expect(() => service.refreshRecord(record)).toThrow(/being updated/);
    expect(() => service.disconnectRecord(record)).toThrow(/being updated/);
    expect(send).not.toHaveBeenCalled();
  });

  it("preserves a working mapping on DNS transport failures but pauses it when proof is removed", () => {
    const first = setup();
    first.record.set("status", "active");
    first.record.set("dns_verified_at", new Date().toISOString());
    first.send.mockImplementation(() => { throw new Error("DNS resolver timeout"); });
    expect(() => first.service.refreshRecord(first.record)).toThrow();
    expect(first.record.get("status")).toBe("active");
    const second = setup();
    second.record.set("status", "active");
    second.record.set("dns_verified_at", new Date().toISOString());
    second.send.mockReturnValue({ statusCode: 200, json: { Status: 3 } });
    second.service.refreshRecord(second.record);
    expect(second.record.get("status")).toBe("pending");
    expect(second.record.get("dns_verified_at")).toBe("");
  });

  it("supports idempotent provider deletion without deleting the Link", () => {
    const { service, send, record, app } = setup();
    record.set("cloudflare_hostname_id", "provider-hostname-123");
    send.mockReturnValue({ statusCode: 404, json: {} });
    service.disconnectRecord(record);
    expect(app.delete).toHaveBeenCalledWith(record);
    expect(send.mock.calls[0][0].method).toBe("DELETE");
    expect(app.delete).toHaveBeenCalledOnce();
  });

  it("recovers a timed-out create during disconnect even after DNS proof was removed", () => {
    const { service, send, record, app } = setup();
    record.set("provisioning_started_at", new Date().toISOString());
    record.set("dns_verified_at", "");
    send.mockReturnValueOnce({ statusCode: 200, json: { success: true, result: [{ id: "provider-hostname-123", hostname: record.get("hostname") }] } });
    send.mockReturnValueOnce({ statusCode: 200, json: { success: true } });
    service.disconnectRecord(record);
    expect(send.mock.calls.map(([input]) => input.method)).toEqual(["GET", "DELETE"]);
    expect(app.delete).toHaveBeenCalledWith(record);
  });

  it("does not touch provider hostnames when removing an unverified local reservation", () => {
    const { service, send, record, app } = setup();
    service.disconnectRecord(record);
    expect(send).not.toHaveBeenCalled();
    expect(app.delete).toHaveBeenCalledWith(record);
  });
});
