import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const secret = "local-test-redirect-secret-at-least-32-characters";

function createRecord(values: Record<string, unknown> = {}) {
  const data = {
    user_id: "owner0000000001", slug: "campaign", active: true,
    destination_url: "https://example.com/default", ...values,
  };
  return {
    id: "link00000000001",
    get: (key: string) => data[key],
    getString: (key: string) => typeof data[key] === "object"
      ? JSON.stringify(data[key]) : String(data[key] || ""),
  };
}

function createEvent(headers: Record<string, string> = {}, owner = false) {
  const responseHeaders = new Map<string, string>();
  return {
    request: {
      header: { get: (name: string) => headers[name] || "" },
      pathValue: () => "campaign",
      url: { query: () => ({ get: () => "linktery.com" }) },
    },
    auth: owner ? {
      id: "owner0000000001", collection: () => ({ name: "users" }), get: () => "user",
    } : null,
    response: { header: () => ({ add: (name: string, value: string) => responseHeaders.set(name, value) }) },
    json: (status: number, body: Record<string, unknown>) => ({ status, body, responseHeaders }),
  };
}

function loadHelpers(random = 0) {
  const module = { exports: {} };
  const math = Object.create(Math) as Math;
  math.random = () => random;
  runInNewContext(read("pocketbase/pb_hooks/utils.js"), {
    module, console, Math: math,
    $os: { getenv: (name: string) => name === "REDIRECT_ORIGIN_SECRET" ? secret : "" },
    $security: { equal: (left: string, right: string) => left === right },
    $http: { send: () => { throw new Error("Unexpected external lookup"); } },
  });
  return module.exports as {
    resolvePublicLinkDestination: (record: ReturnType<typeof createRecord>, event: ReturnType<typeof createEvent>) => {
      destination: string; botSafePage: boolean;
    };
  };
}

function resolveEndpoint(values: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  const main = read("pocketbase/pb_hooks/main.pb.js");
  const start = main.indexOf('routerAdd("GET", "/api/public/links/{slug}"');
  const end = main.indexOf('// Public Profile composition', start);
  let handler: (event: ReturnType<typeof createEvent>) => ReturnType<ReturnType<typeof createEvent>["json"]>;
  runInNewContext(main.slice(start, end), {
    __hooks: "hooks", require: () => loadHelpers(),
    routerAdd: (_method: string, _path: string, callback: typeof handler) => { handler = callback; },
    $app: {
      findFirstRecordByFilter: () => createRecord(values),
      logger: () => ({ error: () => undefined }),
    },
  });
  return handler(createEvent(headers));
}

describe("private routing rules / public resolved result", () => {
  const geoHeaders = {
    "X-Linktery-Redirect-Secret": secret, "X-Linktery-Country": "US",
    "User-Agent": "Mozilla/5.0 iPhone Instagram Mobile",
  };

  it("applies country overrides ahead of device/tier rules without exposing them", () => {
    const result = resolveEndpoint({
      device_targeting: { Mobile: "https://example.com/mobile" },
      geo_targeting: { US: "https://example.com/us", TIER_1: "https://example.com/tier1" },
      utm_source: "instagram",
    }, geoHeaders);
    expect(result.status).toBe(200);
    expect(result.body.destination_url).toBe("https://example.com/us?utm_source=instagram");
    expect(Object.keys(result.body).sort()).toEqual([
      "active", "destination_managed", "destination_url", "domain", "fb_pixel", "google_pixel", "id",
      "interstitial_enabled", "mode", "slug", "tiktok_pixel", "title",
    ].sort());
    expect(result.responseHeaders.get("Cache-Control")).toContain("no-store");
  });

  it("preserves tier targeting and selects exactly one A/B destination", () => {
    const record = createRecord({ geo_targeting: { TIER_1: "https://example.com/tier1" } });
    expect(loadHelpers().resolvePublicLinkDestination(record, createEvent(geoHeaders)).destination)
      .toBe("https://example.com/tier1");
    const split = createRecord({ ab_split: true, split_urls: ["https://example.com/variant"] });
    expect(loadHelpers(0.9).resolvePublicLinkDestination(split, createEvent()).destination)
      .toBe("https://example.com/variant");
  });

  it("does not trust spoofed country headers or map an edge request to Fly's location", () => {
    const record = createRecord({ geo_targeting: { US: "https://example.com/us", PL: "https://example.com/pl" } });
    const helper = loadHelpers().resolvePublicLinkDestination;
    expect(helper(record, createEvent({ "X-Linktery-Country": "US", "CF-IPCountry": "US" })).destination)
      .toBe("https://example.com/default");
    expect(helper(record, createEvent({
      "X-Linktery-Redirect-Secret": secret, "X-Linktery-Country": "XX", "Fly-Region": "waw",
    })).destination).toBe("https://example.com/default");
  });

  it("keeps the admin route override ahead of targeting, with the existing owner exemption", () => {
    const record = createRecord({
      system_route_active: true, system_route_override: "https://example.com/override",
      geo_targeting: { US: "https://example.com/us" }, ab_split: true,
      split_urls: ["https://example.com/variant"],
    });
    const helper = loadHelpers().resolvePublicLinkDestination;
    expect(helper(record, createEvent(geoHeaders)).destination).toBe("https://example.com/override");
    expect(helper(record, createEvent(geoHeaders, true)).destination).toBe("https://example.com/us");
  });

  it("does not mistake Instagram/Meta/Snapchat users for preview crawlers", () => {
    for (const userAgent of ["Instagram iPhone", "FBAN/FBIOS FBAV/1", "Snapchat Android"]) {
      const result = resolveEndpoint({ cloaking: true, safe_page_url: "https://example.com/safe", mode: "direct" }, {
        "User-Agent": userAgent,
      });
      expect(result.body.destination_url).toBe("https://example.com/default");
      expect(result.body.mode).toBe("direct");
    }
    const bot = resolveEndpoint({ cloaking: true, safe_page_url: "https://example.com/safe", mode: "direct" }, {
      "User-Agent": "facebookexternalhit/1.1",
    });
    expect(bot.body.destination_url).toBe("https://example.com/safe");
    expect(bot.body.mode).toBe("redirect");
  });

  it("rejects unavailable schedules and unsafe destinations without revealing configuration", () => {
    for (const values of [
      { start_at: "2999-01-01 00:00:00.000Z" },
      { expire_at: "2000-01-01 00:00:00.000Z" },
      { destination_url: "javascript:alert(1)" },
      { destination_url: "https://private:secret@example.com/" },
    ]) {
      const result = resolveEndpoint(values);
      expect(result.status).toBe(410);
      expect(Object.keys(result.body)).toEqual(["message"]);
    }
    expect(resolveEndpoint({}, { "X-Linktery-Redirect-Secret": "invalid" }).status).toBe(401);
  });
});
