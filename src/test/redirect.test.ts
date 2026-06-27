import { describe, it, expect } from "vitest";

function isRedirectLoop(finalDestination: string, currentUrl: string, domains: string[]): boolean {
  try {
    const destUrlObj = new URL(finalDestination, currentUrl);
    const currentUrlObj = new URL(currentUrl);
    const isOurDomain = destUrlObj.hostname === currentUrlObj.hostname ||
                         domains.includes(destUrlObj.hostname);
    
    return isOurDomain && 
           destUrlObj.pathname.toLowerCase().replace(/\/$/, "") === currentUrlObj.pathname.toLowerCase().replace(/\/$/, "");
  } catch (e) {
    return false;
  }
}

describe("Redirect Loop Detection", () => {
  const domains = ["linktery.com", "www.linktery.com"];

  it("should detect loop on same domain and same path", () => {
    expect(isRedirectLoop("https://linktery.com/my-slug", "https://linktery.com/my-slug", domains)).toBe(true);
    expect(isRedirectLoop("/my-slug", "https://linktery.com/my-slug", domains)).toBe(true);
  });

  it("should NOT detect loop on different domain and same path", () => {
    expect(isRedirectLoop("https://telegram.me/my-slug", "https://linktery.com/my-slug", domains)).toBe(false);
    expect(isRedirectLoop("https://instagram.com/my-slug", "https://linktery.com/my-slug", domains)).toBe(false);
  });

  it("should detect loop across our allowed alias domains", () => {
    expect(isRedirectLoop("https://linktery.com/my-slug", "https://linktery.com/my-slug", domains)).toBe(true);
    expect(isRedirectLoop("https://www.linktery.com/my-slug/", "https://linktery.com/my-slug", domains)).toBe(true);
  });

  it("should NOT detect loop on same domain but different path", () => {
    expect(isRedirectLoop("https://linktery.com/different-slug", "https://linktery.com/my-slug", domains)).toBe(false);
  });
});
