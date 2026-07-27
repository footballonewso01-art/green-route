import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const readWorkspaceFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

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

  it("rejects newly configured destinations that point to another managed short link", () => {
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");

    expect(utils).toContain("var findManagedShortLinkTarget = function(url)");
    expect(utils).toContain("Use the final destination URL instead of another Linktery short URL");
    expect(utils).toContain("validateTargetingUrls");
  });

  it("stops legacy multi-link cycles with a trace on client and server redirects", () => {
    const client = readWorkspaceFile("src/pages/RedirectHandler.tsx");
    const server = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");

    expect(client).toContain('new URLSearchParams(window.location.search).get("lr_trace")');
    expect(client).toContain('destUrlObj.searchParams.set("lr_trace"');
    expect(server).toContain('request.url.query().get("lr_trace")');
    expect(server).toContain("utils.appendRedirectTrace(finalDest, redirectTrace.concat([String(link.id)]))");
    expect(server).toContain("utils.getRedirectLoopHtml()");
    expect(server).toContain('c.request.pathValue("slug")');
    expect(server).not.toContain('c.pathParam("slug")');
  });

  it("keeps normal Instagram traffic out of the opt-in deeplink handoff", () => {
    const server = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");

    expect(server).toContain('const isDeeplinkEnabled = link.get("mode") === "direct"');
    expect(server).toContain("(hasPixels && !isBot) || (isDeeplinkEnabled && isInApp)");
    expect(server).toContain("isDeeplinkEnabled && isInApp");
    expect(server).not.toContain("x-safari-https://");
  });

  it("lets social preview crawlers follow the HTTP redirect even when pixels are configured", () => {
    const server = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");

    expect(server).toContain("hasPixels && !isBot");
    expect(server).toContain("facebookexternalhit");
  });

  it("uses a one-shot Android handoff without browser-scheme retry loops", () => {
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");
    const client = readWorkspaceFile("src/pages/RedirectHandler.tsx");
    const server = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");

    expect(utils).toContain("getDeeplinkHandoffHtml");
    expect(utils).toContain("package=com.android.chrome");
    expect(utils).toContain("now - previous < 15000");
    expect(utils).toContain("attempts the automatic handoff only once");
    expect(server).toContain("isDeeplinkEnabled && isInApp && !managedTarget");
    expect(client).not.toContain("redirect_attempts_");
    expect(client).not.toContain("x-safari-https://");
    expect(client).not.toContain("googlechrome://navigate");
  });
});
