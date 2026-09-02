import { describe, expect, it } from "vitest";
import { classifyAnalyticsTraffic } from "../../cloudflare/analyticsTraffic";

const classify = (
  headers: HeadersInit = {},
  cf?: { botManagement?: { score?: number; verifiedBot?: boolean } },
  expectNavigation = true,
) => classifyAnalyticsTraffic(
  { headers: new Headers(headers), cf },
  { expectNavigation },
);

describe("Public analytics traffic quality", () => {
  it.each([
    [
      "desktop Chrome navigation",
      {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
      },
    ],
    [
      "iOS Safari without Fetch Metadata",
      {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/18.6 Mobile/15E148 Safari/604.1",
      },
    ],
    [
      "Instagram in-app browser",
      {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 390.0.0",
      },
    ],
    [
      "TikTok in-app browser",
      {
        "User-Agent": "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/138.0 Mobile Safari/537.36 musical_ly_2023903040",
      },
    ],
    ["privacy browser with sparse headers", { "User-Agent": "Mozilla/5.0 Firefox/141.0" }],
    ["browser with all optional metadata removed", {}],
  ])("keeps %s in analytics", (_label, headers) => {
    expect(classify(headers)).toEqual({ automated: false });
  });

  it("does not infer automation from a shared IP, country or external referrer", () => {
    expect(classify({
      "CF-Connecting-IP": "203.0.113.10",
      "CF-IPCountry": "ZZ",
      Referer: "https://unknown-directory.example/profile",
      "User-Agent": "Mozilla/5.0 AppleWebKit/537.36 Chrome/140.0 Safari/537.36",
    })).toEqual({ automated: false });
  });

  it.each([
    ["iframe", { "Sec-Fetch-Dest": "iframe" }, "non_document_destination"],
    ["programmatic fetch", { "Sec-Fetch-Mode": "cors" }, "non_navigation_mode"],
    ["prefetch", { Purpose: "prefetch" }, "prefetch_or_prerender"],
    ["prerender", { "Sec-Purpose": "prefetch;prerender" }, "prefetch_or_prerender"],
    ["curl", { "User-Agent": "curl/8.12.1" }, "automation_user_agent"],
    ["headless browser", { "User-Agent": "Mozilla/5.0 HeadlessChrome/140.0" }, "automation_user_agent"],
    ["scanner", { "User-Agent": "zgrab/0.x" }, "automation_user_agent"],
  ])("filters high-confidence %s traffic", (_label, headers, reason) => {
    expect(classify(headers)).toEqual({ automated: true, reason });
  });

  it("uses only the extremely low end of Cloudflare's bot score", () => {
    expect(classify({}, { botManagement: { score: 1 } }).automated).toBe(true);
    expect(classify({}, { botManagement: { score: 5 } }).automated).toBe(true);
    expect(classify({}, { botManagement: { score: 6 } })).toEqual({ automated: false });
    expect(classify({}, { botManagement: { score: 30 } })).toEqual({ automated: false });
    expect(classify({}, { botManagement: { score: 99 } })).toEqual({ automated: false });
    expect(classify({}, { botManagement: { score: 0 } })).toEqual({ automated: false });
  });

  it("filters Cloudflare-verified bots without relying on their User-Agent", () => {
    expect(classify(
      { "User-Agent": "Mozilla/5.0" },
      { botManagement: { score: 99, verifiedBot: true } },
    )).toEqual({ automated: true, reason: "verified_bot" });
  });

  it("allows the expected CORS mode for click telemetry", () => {
    expect(classify({
      "User-Agent": "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile Safari/604.1",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
    }, undefined, false)).toEqual({ automated: false });
  });
});
