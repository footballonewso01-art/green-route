import { describe, expect, it } from "vitest";
import {
  DEFAULT_AVAILABLE_DOMAINS,
  PRIMARY_DOMAIN,
  getAvailableDomains,
  isCustomPublicHostname,
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

  it("recognizes customer hostnames without treating platform or preview hosts as custom", () => {
    expect(isCustomPublicHostname("brand.example")).toBe(true);
    expect(isCustomPublicHostname("links.brand.example")).toBe(true);
    expect(isCustomPublicHostname("linktery.com")).toBe(false);
    expect(isCustomPublicHostname("www.linktery.com")).toBe(false);
    expect(isCustomPublicHostname("linktery.bio")).toBe(false);
    expect(isCustomPublicHostname("preview.workers.dev")).toBe(false);
    expect(isCustomPublicHostname("preview.vercel.app")).toBe(false);
    expect(isCustomPublicHostname("localhost")).toBe(false);
    expect(isCustomPublicHostname("127.0.0.1")).toBe(false);
  });
});
