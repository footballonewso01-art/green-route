import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, it, expect } from "vitest";

const readWorkspaceFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const redirectOriginSecret = "test-redirect-origin-secret-at-least-32-chars";

function loadRedirectTraceHelpers(metaEscapeValue = "true"): {
  appendRedirectTrace: (url: string, trace: string[]) => string;
  setHttpUrlQueryParams: (url: string, params: Record<string, string>) => string;
  resolveCountryFromIP: (request: { header: { get: (name: string) => string } }) => string;
  buildAndroidBrowserIntent: (destination: string) => string;
  buildMetaExternalBrowserUrl: (destination: string, userAgent: string) => string;
  buildIOSChromeExternalUrl: (destination: string, userAgent: string, referrer?: string) => string;
  getInAppBrowser: (userAgent: string, referrer?: string) => string;
  getDeeplinkHandoffHtml: (
    destination: string,
    userAgent: string,
    pixelScripts: string,
    attemptScope: string,
    referrer?: string,
  ) => string;
} {
  const moduleContainer = { exports: {} };
  runInNewContext(readWorkspaceFile("pocketbase/pb_hooks/utils.js"), {
    module: moduleContainer,
    exports: moduleContainer.exports,
    console,
    $os: { getenv: (name: string) => {
      if (name === "DEEPLINK_META_ESCAPE_ENABLED") return metaEscapeValue;
      if (name === "REDIRECT_ORIGIN_SECRET") return redirectOriginSecret;
      return "";
    } },
    $security: { equal: (left: string, right: string) => left === right },
    $http: { send: () => { throw new Error("Geo HTTP fallback must not run"); } },
  });
  return moduleContainer.exports as {
    appendRedirectTrace: (url: string, trace: string[]) => string;
    setHttpUrlQueryParams: (url: string, params: Record<string, string>) => string;
    resolveCountryFromIP: (request: { header: { get: (name: string) => string } }) => string;
    buildAndroidBrowserIntent: (destination: string) => string;
    buildMetaExternalBrowserUrl: (destination: string, userAgent: string) => string;
    buildIOSChromeExternalUrl: (destination: string, userAgent: string, referrer?: string) => string;
    getInAppBrowser: (userAgent: string, referrer?: string) => string;
    getDeeplinkHandoffHtml: (
      destination: string,
      userAgent: string,
      pixelScripts: string,
      attemptScope: string,
      referrer?: string,
    ) => string;
  };
}

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

    expect(utils).toContain("var findManagedShortLinkTarget = function(url, app)");
    expect(utils).toContain("var parseHttpRoutingUrl = function(value)");
    expect(utils).toContain("var canonicalizeHttpPath = function(value)");
    expect(utils).toContain("findManagedShortLinkTarget(urlStr, app || $app)");
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
    expect(server).toContain("redirectTrace.length >= 8");
    expect(client).toContain("if (trace.length >= 8)");
    expect(client).toContain("exceeded the safe hop limit");
    expect(server).toContain("utils.getRedirectLoopHtml()");
    expect(server).toContain('c.request.pathValue("slug")');
    expect(server).not.toContain('c.pathParam("slug")');
  });

  it("replaces every literal or encoded legacy trace with one server trace", () => {
    const { appendRedirectTrace } = loadRedirectTraceHelpers();
    const trace = ["aaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbb"];
    const result = appendRedirectTrace(
      "https://linktery.bio/next?lr_trace=poison&keep=1&LR_TRACE=second&lr%5Ftrace=encoded&lr%255Ftrace=double#section",
      trace,
    );

    expect(result).toBe(
      "https://linktery.bio/next?keep=1&lr_trace=aaaaaaaaaaaaaaa.bbbbbbbbbbbbbbb#section",
    );
    const parsed = new URL(result);
    expect(parsed.searchParams.getAll("lr_trace")).toEqual([
      "aaaaaaaaaaaaaaa.bbbbbbbbbbbbbbb",
    ]);
    expect(
      Array.from(parsed.searchParams.keys()).filter(
        (name) => decodeURIComponent(name).toLowerCase() === "lr_trace",
      ),
    ).toEqual(["lr_trace"]);
  });

  it("keeps normal Instagram traffic out of the opt-in deeplink handoff", () => {
    const server = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");

    expect(server).toContain('const isDeeplinkEnabled = link.get("mode") === "direct"');
    expect(server).toContain("(hasPixels && !isBot) || (isDeeplinkEnabled && isInApp && !isBot)");
    expect(server).toContain("isDeeplinkEnabled && isInApp && !isBot");
    expect(server).not.toContain("x-safari-https://");
  });

  it("serves social preview metadata before redirect targeting or pixel execution", () => {
    const server = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");

    expect(server).toContain("socialPreviewCrawler");
    expect(server).toContain('c.response.header().add("X-Linktery-Social-Preview", "v1")');
    expect(server).toContain("utils.getSocialPreviewHtml");
    expect(server.indexOf("if (trustedEdgeRequest && requestedHost && socialPreviewCrawler)"))
      .toBeLessThan(server.indexOf("const redirectTraceValue"));
    expect(server).toContain("hasPixels && !isBot");
    expect(server).toContain("utils.isTrackedAutomation(uaStr)");
    expect(utils).toContain("facebookexternalhit");
    expect(server).toContain("ttq.load(${utils.safeJsonForHtml(tiktokPixel)})");
    expect(server).not.toContain("ttq.initialize(${utils.safeJsonForHtml(tiktokPixel)})");
    expect(server).toContain("window.location.replace(dest); }, 450)");
  });

  it("uses one-shot external handoffs without browser-scheme retry loops", () => {
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");
    const client = readWorkspaceFile("src/pages/RedirectHandler.tsx");
    const server = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");

    expect(utils).toContain("getDeeplinkHandoffHtml");
    expect(utils).toContain("package=com.android.chrome");
    expect(utils).toContain('sessionStorage.setItem(key, "attempted")');
    expect(utils).toContain("attempts the automatic handoff only once");
    expect(server).toContain("isDeeplinkEnabled && isInApp && !isBot && !managedTarget");
    expect(client).not.toContain("redirect_attempts_");
    expect(client).toContain("__LINKTERY_SUPPRESS_CLIENT_CLICK__");
    expect(client).not.toContain("x-safari-https://");
    expect(client).not.toContain("googlechrome://navigate");
    expect(utils).toContain("instagram://extbrowser/?url=");
  });

  it("detects Snapchat and unbranded mobile WebViews without changing Meta routing", () => {
    const helpers = loadRedirectTraceHelpers();
    const destination = "https://example.com/checkout";
    const androidSnapWebView = "Mozilla/5.0 (Linux; Android 15; Pixel Build/AP3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0 Mobile Safari/537.36";
    const iosSnapchat = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/22G86 Snapchat/13.0";
    const iosInstagram = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/22G86 Instagram 390.0";

    expect(helpers.getInAppBrowser(androidSnapWebView)).toBe("In-app browser");
    expect(helpers.getInAppBrowser(iosSnapchat)).toBe("Snapchat");
    expect(helpers.buildIOSChromeExternalUrl(destination, iosSnapchat))
      .toBe("googlechromes://example.com/checkout");

    const snapchatHtml = helpers.getDeeplinkHandoffHtml(destination, iosSnapchat, "", "link-id");
    expect(snapchatHtml).toContain('href="googlechromes://example.com/checkout"');
    expect(snapchatHtml).toContain("Open in Chrome");
    expect(snapchatHtml).not.toContain("var action = \"googlechromes://");

    expect(helpers.getInAppBrowser(iosInstagram)).toBe("Instagram");
    expect(helpers.buildMetaExternalBrowserUrl(destination, iosInstagram))
      .toBe(`instagram://extbrowser/?url=${encodeURIComponent(destination)}`);
    const instagramHtml = helpers.getDeeplinkHandoffHtml(destination, iosInstagram, "", "link-id");
    expect(instagramHtml).toContain("instagram://extbrowser/?url=");
    expect(instagramHtml).not.toContain("googlechromes://");
  });

  it("renders a guarded iOS Instagram escape without exposing an unsafe destination", () => {
    const helpers = loadRedirectTraceHelpers();
    const destination = "https://example.com/checkout?a=1&b=2";
    const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Instagram 390.0";

    expect(helpers.buildMetaExternalBrowserUrl(destination, userAgent)).toBe(
      `instagram://extbrowser/?url=${encodeURIComponent(destination)}`,
    );
    expect(helpers.buildMetaExternalBrowserUrl("javascript:alert(1)", userAgent)).toBe("");
    expect(helpers.buildMetaExternalBrowserUrl("https://user:pass@example.com/private", userAgent)).toBe("");
    expect(helpers.buildMetaExternalBrowserUrl("https://example.com/\r\nprivate", userAgent)).toBe("");
    expect(loadRedirectTraceHelpers("false").buildMetaExternalBrowserUrl(destination, userAgent)).toBe("");
    expect(helpers.buildAndroidBrowserIntent("https://example.com/app#checkout"))
      .toBe("https://example.com/app#checkout");

    const html = helpers.getDeeplinkHandoffHtml(destination, userAgent, "", "link-id");
    expect(html).toContain("instagram://extbrowser/?url=");
    expect(html).toContain("sessionStorage.getItem(key)");
    expect(html).toContain("window.location.replace(action)");
    expect(html).toContain("Continue inside Instagram");
    expect(html).not.toContain("x-safari-");
    expect(html).not.toContain("googlechromes://");

    const htmlWithPixel = helpers.getDeeplinkHandoffHtml(
      destination,
      userAgent,
      "<script>window.pixelLoaded = true;</script>",
      "link-id",
    );
    expect(html).toContain("var delay = 0;");
    expect(htmlWithPixel).toContain("var delay = 450;");
    expect(helpers.getDeeplinkHandoffHtml(
      destination,
      "Mozilla/5.0 Android Instagram",
      "",
      "link-id",
    )).toContain("var delay = 120;");
  });

  it("replaces UTM parameters without duplicates and preserves flags and fragments", () => {
    const helpers = loadRedirectTraceHelpers();
    const result = helpers.setHttpUrlQueryParams(
      "https://example.com/path?flag&utm_source=old&utm_source=older&utm%5Fmedium=legacy#section",
      {
        utm_source: "new source",
        utm_medium: "social/media",
        utm_campaign: "launch",
      },
    );

    expect(result).toBe(
      "https://example.com/path?flag&utm_source=new%20source&utm_medium=social%2Fmedia&utm_campaign=launch#section",
    );
  });

  it("does not mistake Cloudflare/Fly egress for a visitor country", () => {
    const helpers = loadRedirectTraceHelpers();
    const makeRequest = (country: string) => ({
      header: {
        get: (name: string) => ({
          "X-Linktery-Redirect-Secret": redirectOriginSecret,
          "X-Linktery-Country": country,
          "Fly-Client-IP": "203.0.113.10",
          "Fly-Region": "fra",
        }[name] || ""),
      },
    });

    expect(helpers.resolveCountryFromIP(makeRequest("US"))).toBe("US");
    expect(helpers.resolveCountryFromIP(makeRequest("XX"))).toBe("Unknown");
    expect(helpers.resolveCountryFromIP(makeRequest("T1"))).toBe("Unknown");
  });

  it("signals Public Profile fallthrough explicitly to the trusted edge", () => {
    const server = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");

    const secretRejectionIndex = server.indexOf("if (providedEdgeSecret && !trustedEdgeRequest)");
    const firstLinkLookupIndex = server.indexOf('$app.findFirstRecordByFilter(', secretRejectionIndex);
    expect(secretRejectionIndex).toBeGreaterThan(-1);
    expect(firstLinkLookupIndex).toBeGreaterThan(secretRejectionIndex);
    expect(server.slice(secretRejectionIndex, firstLinkLookupIndex)).not.toContain("clickRecord");
    expect(server).toContain("const continueWithPublicFrontend = function()");
    expect(server).toContain('c.response.header().add("X-Linktery-Redirect-Origin", "v1")');
    expect(server).toContain('return c.json(404, { message: "Public frontend route required" })');
    expect(server).toContain("return continueWithPublicFrontend()");
    expect(server).toContain('trustedEdgeRequest && link.get("system_route_active") === true');
    expect(server).toContain('link.get("mode") === "landing" || link.get("interstitial_enabled") === true');
    expect(server).toContain("if (!trustedEdgeRequest)");
    expect(server).toContain('return c.json(500, { message: "Redirect resolver temporarily unavailable" })');
  });

  it("rejects malformed encoded slugs without a client-side navigation gadget", () => {
    const client = readWorkspaceFile("src/pages/RedirectHandler.tsx");

    expect(client).toContain("isValidPublicSlug(rawUsername)");
    expect(client).not.toContain('username.startsWith("u/")');
    expect(client).not.toContain('username.replace("u/", "")');
    expect(client).not.toContain("useNavigate");
  });
});
