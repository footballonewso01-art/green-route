import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeTrackingPixels } from "@/lib/trackingPixels";

const readWorkspaceFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("tracking pixel security", () => {
  it("normalizes supported provider IDs", () => {
    expect(normalizeTrackingPixels({
      fb_pixel: " 123456789012345 ",
      google_pixel: " g-abcd1234 ",
      tiktok_pixel: " cdef12345678 ",
    })).toEqual({
      valid: true,
      meta: "123456789012345",
      google: "G-ABCD1234",
      tiktok: "CDEF12345678",
    });
  });

  it("rejects values that could break out of redirect scripts or URLs", () => {
    for (const input of [
      { fb_pixel: "1');alert(document.domain);//" },
      { google_pixel: `G-ABC" onload=alert(1)` },
      { tiktok_pixel: "ABC</script><script>alert(1)</script>" },
    ]) {
      expect(normalizeTrackingPixels(input).valid).toBe(false);
    }
  });

  it("enforces the same validation in record hooks and legacy runtime rendering", () => {
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");

    expect(utils).toContain("validateLinkTrackingPixels(record)");
    expect(utils).toContain("var getSafeLinkTrackingPixels = function(record)");
    expect(hook).toContain("utils.getSafeLinkTrackingPixels(link)");
    expect(hook).toContain("utils.safeJsonForHtml(fbPixel)");
    expect(hook).toContain("utils.safeJsonForHtml(googlePixel)");
    expect(hook).toContain("utils.safeJsonForHtml(tiktokPixel)");
    expect(hook).not.toContain("${fbPixel.trim()}");
    expect(hook).not.toContain("${googlePixel.trim()}");
    expect(hook).not.toContain("${tiktokPixel.trim()}");
  });

  it("routes bot-safe pages through the common URL and loop guard", () => {
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");

    expect(utils).toContain('checkUrl(record.get("safe_page_url"), "safe_page_url")');
    expect(hook).toContain("const botSafePage =");
    expect(hook).not.toContain('return c.redirect(302, link.get("safe_page_url"))');
    expect(hook).toContain("const managedTarget = utils.findManagedShortLinkTarget(finalDest)");
    expect(hook).toContain("const parsedFinalDestination = utils.parseHttpRoutingUrl(finalDest)");
    expect(hook).toContain("parsedFinalDestination.hasCredentials");
  });
});
