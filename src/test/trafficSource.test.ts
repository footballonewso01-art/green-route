import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const read = (file: string) => readFileSync(file, "utf8");
const hooks = read("pocketbase/pb_hooks/main.pb.js");
const frontend = read("src/pages/RedirectHandler.tsx");
const module = { exports: {} };
runInNewContext(read("pocketbase/pb_hooks/utils.js"), { module });
type Request = { header: { get: (name: string) => string }; url: { query: () => URLSearchParams } };
const utils = module.exports as {
  normalizeAnalyticsReferrer: (value: string) => string;
  resolveAnalyticsSource: (referrer: string, utm?: string, profile?: boolean) => string;
  getRequestAnalyticsSource: (request: Request, profile?: boolean) => string;
  getTrackingDimensions: (request: Request) => { referrer: string; browser: string };
};
const request = (referrer: string, search = "", ua = "Mozilla/5.0 Chrome/140.0") => ({
  header: { get: (name: string) => ({ Referer: referrer, "User-Agent": ua }[name] || "") },
  url: { query: () => new URLSearchParams(search) },
});

// Execute the actual browser payload preparation and actual ingestion handler.
// These cover the transport boundary, not a second copy of the classifier.
const browserPayload = (referrer: string, search = "") => runInNewContext(
  `(() => { ${frontend.slice(frontend.indexOf("const urlParams = new URLSearchParams(window.location.search)", frontend.indexOf("const trackClick")), frontend.indexOf("// BUG-04"))}
    return {referrer, utm_source: urlParams.get("utm_source") || "", profile_id: sourceProfileId, profile_link_id: profileLinkId}; })()`,
  { URL, URLSearchParams, document: { referrer }, window: { location: { search } } },
);
function ingest(payload: object, overrides = {}) {
  const saved: Record<string, unknown>[] = [];
  const source = hooks.slice(hooks.indexOf('routerAdd("POST", "/api/track-click"'));
  const route = source.slice(0, source.indexOf('}, $apis.bodyLimit(4 * 1024));') + '}, $apis.bodyLimit(4 * 1024));'.length);
  let handler: (context: object) => unknown;
  runInNewContext(route, {
    routerAdd: (_method: string, _path: string, callback: typeof handler) => { handler = callback; },
    $apis: { bodyLimit: () => null }, __hooks: "hooks",
    DynamicModel: function (fields: object) { Object.assign(this, fields); },
    Record: function (_collection: unknown, data: object) { Object.assign(this, data); },
    require: () => ({ ...utils,
      isTrustedRedirectEdgeRequest: () => true, isTrackedAutomation: () => false,
      isTrustedAutomatedTraffic: () => false, clickRateLimitAllows: () => true,
      resolveProfileClickAttribution: () => ({ sourceProfileId: "", profileLinkId: "" }),
      resolveCountryFromIP: () => "US", isUniqueTrackedClick: () => true,
      ...overrides,
    }),
    $app: {
      findRecordById: () => ({ id: "123456789abcdef", get: () => true }),
      findCollectionByNameOrId: () => ({}), save: (record: Record<string, unknown>) => saved.push(record),
      logger: () => ({ error: (error: string) => { throw new Error(error); } }),
    },
  });
  const result = handler!({
    request: request("https://linktery.com/current-redirect"),
    response: { header: () => ({ add: () => {} }) },
    bindBody: (data: object) => Object.assign(data, { link_id: "123456789abcdef", ...payload }),
    json: (status: number, body: object) => ({ status, body }),
  });
  return { saved, result };
}

describe("customer traffic source classification", () => {
  it.each([
    ["https://pinterest.com/", "Pinterest"],
    ["https://snapchat.com/", "Snapchat"],
    ["https://snap.com/", "Snapchat"],
    ["https://twitter.com/", "Twitter"],
    ["https://x.com/", "Twitter"],
    ["https://t.co/short", "Twitter"],
    ["https://l.instagram.com/", "Instagram"],
    ["https://m.facebook.com/", "Facebook"],
    ["https://vm.tiktok.com/", "TikTok"],
    ["https://t.me/channel", "Telegram"],
    ["https://telegram.me/channel", "Telegram"],
    ["https://youtu.be/video", "YouTube"],
    ["https://lnkd.in/id", "LinkedIn"],
    ["https://www.reddit.com/", "Reddit"],
    ["https://threads.com/", "Threads"],
    ["https://www.google.co.uk/search", "Google"],
    ["https://www.google.com.ua/", "Google"],
    ["https://www.google.de/", "Google"],
    ["https://WWW.INSTAGRAM.COM:443/", "Instagram"],
    ["android-app://com.google.android.googlequicksearchbox/https/www.google.com", "Google App"],
    ["android-app://com.instagram.android", "Instagram"],
    ["https://example.org/?next=instagram.com", "example.org"],
    ["https://example.org/twitter.com", "example.org"],
    ["https://notinstagram.com/", "notinstagram.com"],
    ["https://instagram.com.example.org/", "instagram.com.example.org"],
    ["https://t.co.example.org/", "t.co.example.org"],
    ["https://google.com.example.org/", "google.com.example.org"],
    ["https://example.org/?app=com.google.android.googlequicksearchbox", "example.org"],
    ["", "Direct"],
  ])("uses the same source for server, profile, and browser traffic: %s", (referrer, expected) => {
    expect(utils.getRequestAnalyticsSource(request(referrer), true)).toBe(expected);
    expect(utils.getTrackingDimensions(request(referrer)).referrer).toBe(expected);
    const { saved, result } = ingest(browserPayload(referrer));
    expect(result).toEqual({ status: 202, body: { accepted: true } });
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ referrer: expected, is_unique: true, country: "US" });
  });

  it.each(["Snapchat", "Twitter", "Google App", "Profile", "Other", "Direct"])("accepts legacy client label %s", (label) => {
    expect(ingest({ referrer: label }).saved[0].referrer).toBe(label);
  });

  it("keeps incoming campaign tags explicit, with the same precedence across all paths", () => {
    const referrer = "https://www.google.com/";
    const search = "?utm_source=Telegram&utm_medium=paid";
    expect(utils.getRequestAnalyticsSource(request(referrer, search), true)).toBe("UTM: Telegram");
    expect(utils.getTrackingDimensions(request(referrer, search)).referrer).toBe("UTM: Telegram");
    expect(ingest(browserPayload(referrer, search)).saved[0].referrer).toBe("UTM: Telegram");
    expect(ingest(browserPayload("", search)).saved[0].referrer).toBe("UTM: Telegram");
    expect(utils.resolveAnalyticsSource("", "newsletter_sep")).toBe("UTM: newsletter_sep");
  });

  it("preserves profile click attribution and does not mistake a profile view for an outgoing click", () => {
    const referrer = "https://instagram.com/";
    const search = "?ref=profile&utm_source=telegram&profile_id=profile1&profile_link_id=card1";
    expect(utils.getRequestAnalyticsSource(request(referrer, search), true)).toBe("Profile");
    expect(utils.getTrackingDimensions(request(referrer, search)).referrer).toBe("UTM: Telegram");
    const resolveProfileClickAttribution = vi.fn(() => ({ sourceProfileId: "profile1", profileLinkId: "card1" }));
    const { saved } = ingest(browserPayload(referrer, search), { resolveProfileClickAttribution });
    expect(saved[0]).toMatchObject({ referrer: "Profile", source_profile_id: "profile1", profile_link_id: "card1" });
    expect(resolveProfileClickAttribution).toHaveBeenCalledWith(expect.anything(), "123456789abcdef", "profile1", "card1");
  });

  it.each(["<script>", "email@example.org", "x".repeat(65), "bad\nsource"])("ignores invalid UTM without losing observed source: %s", (utm) => {
    expect(utils.resolveAnalyticsSource("https://pinterest.com/", utm)).toBe("Pinterest");
  });

  it.each(["https://instagram.com@evil.example/", "javascript://instagram.com", "android-app://__proto__", "https://bad..example/", "https://" + "a".repeat(200) + ".example/"])("rejects malformed or unsupported authorities: %s", (referrer) => {
    expect(utils.normalizeAnalyticsReferrer(referrer)).toBe("Other");
  });

  it("does not infer a missing source from an in-app browser alone", () => {
    expect(utils.getTrackingDimensions(request("", "", "Instagram 390.0.0"))).toMatchObject({ browser: "Instagram", referrer: "Direct" });
  });

  it("does not forward referring page paths or query parameters in the browser payload", () => {
    expect(browserPayload("https://example.org/private?email=private@example.org").referrer).toBe("https://example.org");
  });

  it.each([
    { isTrustedRedirectEdgeRequest: () => false },
    { isTrackedAutomation: () => true },
    { isTrustedAutomatedTraffic: () => true },
    { clickRateLimitAllows: () => false },
  ])("preserves ingestion guards", (overrides) => {
    expect(ingest({ referrer: "https://pinterest.com/", utm_source: "telegram" }, overrides).saved).toHaveLength(0);
  });
});
