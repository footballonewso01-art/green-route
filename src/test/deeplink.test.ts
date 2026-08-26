import { describe, expect, it } from "vitest";
import {
  buildAndroidBrowserIntent,
  buildIOSChromeExternalUrl,
  buildMetaExternalBrowserUrl,
  detectInAppBrowser,
  getDeeplinkDestinationName,
  getDeeplinkPrimaryAction,
  prepareAutomaticExternalHandoff,
} from "@/lib/deeplink";

describe("deeplink handoff", () => {
  it("detects Meta and Snapchat WebViews without treating real browsers as in-app", () => {
    expect(detectInAppBrowser("Mozilla/5.0 Instagram 390.0 Android")).toBe("instagram");
    expect(detectInAppBrowser("Mozilla/5.0 iPhone Barcelona 390.0")).toBe("threads");
    expect(detectInAppBrowser("Mozilla/5.0 TikTok iPhone")).toBe("tiktok");
    expect(detectInAppBrowser("Mozilla/5.0 FBAN/FBIOS FBAV/500.0")).toBe("facebook");
    expect(detectInAppBrowser("Mozilla/5.0 iPhone Snapchat/13.0")).toBe("snapchat");
    expect(detectInAppBrowser(
      "Mozilla/5.0 (Linux; Android 15; Pixel 9 Build/AP3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0 Mobile Safari/537.36",
    )).toBe("webview");
    expect(detectInAppBrowser(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22G86",
    )).toBe("webview");
    expect(detectInAppBrowser(
      "Mozilla/5.0 iPhone AppleWebKit/605.1.15 Mobile/22G86 Safari/604.1",
      "https://www.snapchat.com/",
    )).toBe("snapchat");
    expect(detectInAppBrowser("Mozilla/5.0 Chrome/140.0 Mobile Safari/537.36")).toBeNull();
    expect(detectInAppBrowser("Mozilla/5.0 iPhone AppleWebKit/605.1.15 Mobile/22G86 Safari/604.1")).toBeNull();
  });

  it("builds a user-gesture Android browser intent with a direct fallback", () => {
    const destination = "https://example.com/path?a=1";
    const intent = buildAndroidBrowserIntent(destination);

    expect(intent).toContain("intent://example.com/path?a=1#Intent;");
    expect(intent).toContain("package=com.android.chrome");
    expect(intent).toContain(`S.browser_fallback_url=${encodeURIComponent(destination)}`);
    expect(intent).not.toContain("linktery.com");
    expect(buildAndroidBrowserIntent("https://example.com/path?a=1#offer"))
      .toBe("https://example.com/path?a=1#offer");
  });

  it("uses the Meta app-owned external-browser handler only in matching iOS WebViews", () => {
    const destination = "https://example.com/checkout";
    const action = getDeeplinkPrimaryAction(destination, "Mozilla/5.0 iPhone Instagram");

    expect(action).toEqual({
      href: `instagram://extbrowser/?url=${encodeURIComponent(destination)}`,
      label: "Open in Browser",
    });
    expect(buildMetaExternalBrowserUrl(destination, "Mozilla/5.0 iPhone Barcelona"))
      .toBe(`barcelona://extbrowser/?url=${encodeURIComponent(destination)}`);
    expect(buildMetaExternalBrowserUrl(destination, "Mozilla/5.0 iPhone Safari/604.1")).toBeNull();
    expect(buildMetaExternalBrowserUrl("javascript:alert(1)", "Mozilla/5.0 iPhone Instagram")).toBeNull();
    expect(buildMetaExternalBrowserUrl("https://user:pass@example.com/private", "Mozilla/5.0 iPhone Instagram")).toBeNull();
    expect(buildMetaExternalBrowserUrl("https://example.com/\r\nprivate", "Mozilla/5.0 iPhone Instagram")).toBeNull();
  });

  it("uses user-tapped universal links for supported iOS destinations", () => {
    const destination = "https://www.youtube.com/watch?v=abc123";
    expect(getDeeplinkDestinationName(destination)).toBe("YouTube");
    expect(getDeeplinkPrimaryAction(destination, "Mozilla/5.0 iPhone Safari/604.1"))
      .toEqual({ href: destination, label: "Open YouTube" });
  });

  it("offers a user-tapped Chrome escape for Snapchat on iOS without changing Meta", () => {
    const destination = "https://example.com/checkout?a=1#offer";
    const snapchatUa = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/22G86 Snapchat/13.0";

    expect(buildIOSChromeExternalUrl(destination, snapchatUa))
      .toBe("googlechromes://example.com/checkout?a=1#offer");
    expect(getDeeplinkPrimaryAction(destination, snapchatUa)).toEqual({
      href: "googlechromes://example.com/checkout?a=1#offer",
      label: "Open in Chrome",
    });
    expect(buildIOSChromeExternalUrl(destination, "Mozilla/5.0 iPhone Instagram 390.0")).toBeNull();
    expect(getDeeplinkPrimaryAction(destination, "Mozilla/5.0 iPhone Instagram 390.0").href)
      .toBe(`instagram://extbrowser/?url=${encodeURIComponent(destination)}`);
  });

  it("prepares only one guarded automatic Android attempt", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) || null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const input = {
      destination: "https://example.com/offer",
      userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel Build/AP3A; wv) AppleWebKit/537.36 Version/4.0 Chrome/140.0 Mobile Safari/537.36",
      storage,
      scope: "summer-offer",
    };

    const first = prepareAutomaticExternalHandoff(input);
    expect(first?.href).toContain("intent://example.com/offer#Intent;");
    expect(first?.storageKey).not.toContain("example.com");
    expect(prepareAutomaticExternalHandoff(input)).toBeNull();
  });

  it("auto-attempts only in supported WebViews and requires a persistent guard", () => {
    const throwingStorage = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => undefined,
    };
    const destination = "https://example.com";

    expect(prepareAutomaticExternalHandoff({
      destination,
      userAgent: "Mozilla/5.0 iPhone Instagram",
      storage: {
        getItem: () => null,
        setItem: () => undefined,
      },
    })).toBeNull();
    expect(prepareAutomaticExternalHandoff({
      destination,
      userAgent: "Mozilla/5.0 Android Chrome/140",
      storage: throwingStorage,
    })).toBeNull();
    expect(prepareAutomaticExternalHandoff({
      destination,
      userAgent: "Mozilla/5.0 Android Instagram",
      storage: throwingStorage,
    })).toBeNull();
    expect(prepareAutomaticExternalHandoff({
      destination,
      userAgent: "Mozilla/5.0 iPhone Instagram",
      storage: throwingStorage,
    })).toBeNull();
  });
});
