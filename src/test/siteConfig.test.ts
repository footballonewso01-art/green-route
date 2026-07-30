import { describe, expect, it } from "vitest";
import {
  DEFAULT_AVAILABLE_DOMAINS,
  PRIMARY_DOMAIN,
  getAvailableDomains,
  isPrimaryWwwDomain,
  isRedirectAliasDomain,
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

  it("redirects only known aliases and leaves preview hosts testable", () => {
    expect(isRedirectAliasDomain("linktery.bio")).toBe(true);
    expect(isRedirectAliasDomain("www.linktery.com")).toBe(true);
    expect(isRedirectAliasDomain("linktery.com")).toBe(false);
    expect(isRedirectAliasDomain("candidate.workers.dev")).toBe(false);
    expect(isRedirectAliasDomain("preview.vercel.app")).toBe(false);
    expect(isPrimaryWwwDomain("www.linktery.com")).toBe(true);
    expect(isPrimaryWwwDomain("linktery.bio")).toBe(false);
  });
});
