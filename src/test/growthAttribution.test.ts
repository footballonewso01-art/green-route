import { beforeEach, describe, expect, it, vi } from "vitest";
import { acquisitionSource, marketingPath } from "@/lib/growthAttribution";

vi.mock("@/lib/pocketbase", () => ({ pb: { authStore: { isValid: false } } }));

describe("first-touch acquisition", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear(); sessionStorage.clear();
    window.history.replaceState({}, "", "/guides/how-to-track-link-clicks?token=private");
    Object.defineProperty(document, "referrer", { configurable: true, value: "https://www.google.com/search?q=links" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  it.each(["https://www.google.com/search", "https://www.google.co.uk/", "https://www.bing.com/", "https://duckduckgo.com/"])("recognizes %s as organic", (ref) => {
    expect(acquisitionSource("", ref, "linktery.com").medium).toBe("organic");
  });
  it("does not mislabel paid, internal or unknown sources as organic", () => {
    expect(acquisitionSource("?utm_source=google&utm_medium=cpc", "https://google.com/", "linktery.com").medium).toBe("cpc");
    expect(acquisitionSource("?msclkid=secret", "https://bing.com/", "linktery.com").medium).toBe("cpc");
    expect(acquisitionSource("", "https://google.com.evil.test/", "linktery.com").medium).toBe("referral");
    expect(acquisitionSource("", "https://linktery.bio/a", "linktery.com").source).toBe("direct");
    expect(acquisitionSource("", "", "linktery.com").medium).toBe("");
  });
  it("excludes private paths and strips query strings", () => {
    expect(marketingPath("/features/link-analytics?email=private#form")).toBe("/features/link-analytics");
    for (const path of ["/dashboard/links/secret", "/register", "/sainte", "//evil.com", "/profiles/secret"]) expect(marketingPath(path)).toBe("");
  });
  it("preserves the first SEO path through signup and navigation", async () => {
    const { trackMarketingPageView, trackGrowthEvent } = await import("@/lib/telemetry");
    trackMarketingPageView("/guides/how-to-track-link-clicks");
    trackMarketingPageView("/guides/how-to-track-link-clicks");
    expect(fetch).toHaveBeenCalledTimes(1);
    window.history.replaceState({}, "", "/register?utm_source=other&email=secret");
    trackGrowthEvent("signup_completed");
    const calls = vi.mocked(fetch).mock.calls;
    const view = JSON.parse(calls[0][1]!.body as string);
    const signup = JSON.parse(calls[1][1]!.body as string);
    expect(signup).toMatchObject({ landing_path: "/guides/how-to-track-link-clicks", path: "/register", source: "google.com", medium: "organic", journey_id: view.journey_id });
    expect(JSON.stringify(signup)).not.toContain("secret");
    expect(localStorage.getItem("linktery_growth_context_v1")).not.toContain("private");
  });
  it("keeps the same journey when storage is blocked", async () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    const { trackGrowthEvent } = await import("@/lib/telemetry");
    trackGrowthEvent("signup_started"); trackGrowthEvent("signup_completed");
    const payloads = vi.mocked(fetch).mock.calls.map((call) => JSON.parse(call[1]!.body as string));
    expect(payloads[0].journey_id).toBe(payloads[1].journey_id);
    expect(payloads[1].medium).toBe("organic");
    spy.mockRestore();
  });
  it("does not invent the landing page of a legacy context", async () => {
    localStorage.setItem("linktery_growth_context_v1", JSON.stringify({ journeyId: "old_journey_123456", source: "bing.com", capturedAt: Date.now() }));
    const { trackGrowthEvent } = await import("@/lib/telemetry");
    trackGrowthEvent("signup_started");
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).landing_path).toBe("");
  });
});
