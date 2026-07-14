import { describe, expect, it } from "vitest";
import {
  DEFAULT_AVAILABLE_DOMAINS,
  PRIMARY_DOMAIN,
  getAvailableDomains,
} from "@/lib/siteConfig";

describe("site domain configuration", () => {
  it("keeps linktery.com as the primary domain", () => {
    expect(PRIMARY_DOMAIN).toBe("linktery.com");
    expect(getAvailableDomains("hotme.online,linktery.bio")[0]).toBe(PRIMARY_DOMAIN);
  });

  it("preserves redirect aliases without promoting them to primary", () => {
    expect(getAvailableDomains("hotme.online,hotmylinks.cc")).toEqual([
      "linktery.com",
      "hotme.online",
      "hotmylinks.cc",
    ]);
  });

  it("falls back to all known domains when Vercel provides an empty value", () => {
    expect(getAvailableDomains("")).toEqual(DEFAULT_AVAILABLE_DOMAINS);
  });
});
