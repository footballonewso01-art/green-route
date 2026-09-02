import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Link record and upload security", () => {
  const hook = read("pocketbase/pb_hooks/main.pb.js");
  const utils = read("pocketbase/pb_hooks/utils.js");
  const migration = read(
    "pocketbase/pb_migrations/1787830000_harden_link_records_and_image_uploads.js",
  );

  it("keeps raw Link records owner-only and exposes bounded public DTO routes", () => {
    expect(migration).toContain("links.listRule = ownerRule");
    expect(migration).toContain("links.viewRule = ownerRule");
    expect(hook).toContain('routerAdd("GET", "/api/public/links/{slug}"');
    expect(hook).toContain('routerAdd("GET", "/api/public/profiles/{slug}"');
    expect(hook).toContain('routerAdd("GET", "/api/public/slugs/{slug}/availability"');
    expect(hook).toContain('publicReadRateLimitAllows(c, "link:" + slug)');
    expect(hook).not.toContain('user_id: link.get("user_id")');
    expect(hook).toContain('utils.parseRecordJson(profile.getString("social_links"))');
  });

  it("forbids customer-controlled Link ownership transfer", () => {
    expect(hook).toContain('originalOwnerId !== authInfo.authUserId');
    expect(hook).toContain('requestedOwnerId !== originalOwnerId');
    expect(hook).toContain('throw new ForbiddenError("Link ownership cannot be changed.")');
  });

  it("enforces paid Link features on both create and update boundaries", () => {
    expect(utils).toContain("var enforceLinkFeatureEntitlements = function(app, record, user, isAdmin, isCreate)");
    expect(utils).toContain('plan.deepLinks === true');
    expect(utils).toContain('plan.cloaking === true');
    expect(utils).toContain('plan.geoTargeting === true');
    expect(utils).toContain('plan.abTesting === true');
    expect(utils).toContain('plan.pixels === true');
    expect(hook).toContain("utils.enforceLinkCreateOwnershipAndEntitlements(");
    expect(hook).toContain("utils.enforceLinkFeatureEntitlements($app, e.record, null, authInfo.isAdmin)");
  });

  it("accepts only passive raster uploads and rejects SVG data icons", () => {
    expect(migration).toContain('["image/jpeg", "image/png", "image/webp"]');
    expect(migration).not.toContain('"image/svg+xml"');
    expect(migration).not.toContain('"image/gif"');
    expect(utils).toContain("var validateCustomLinkIcon = function(record)");
    expect(utils).toContain("isSafeCustomIconDataUrl(iconValue)");
    expect(utils).toContain("data:image\\/(png|jpeg|webp)");
    expect(utils).not.toContain("data:image\\/(?:png|jpeg|svg");
  });

  it("checks actual custom-icon bytes and isolates legacy active file responses", () => {
    const module = { exports: {} };
    runInNewContext(utils, { module });
    const validate = (module.exports as { isSafeCustomIconDataUrl: (value: string) => boolean }).isSafeCustomIconDataUrl;
    expect(validate("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==")).toBe(true);
    expect(validate("data:image/png;base64," + Buffer.from('<svg onload="alert(1)"></svg>').toString("base64"))).toBe(false);
    expect(validate("data:image/svg+xml;base64," + Buffer.from("<svg/>").toString("base64"))).toBe(false);
    expect(validate("data:image/png;base64," + "A".repeat(700000))).toBe(false);
    const fileHook = read("pocketbase/pb_hooks/file_security.pb.js");
    expect(fileHook).toContain('"Content-Security-Policy", "sandbox; default-src \'none\'');
    expect(fileHook).toContain('"Content-Disposition", "attachment"');
    expect(fileHook).toContain('"X-Content-Type-Options", "nosniff"');
  });

  it("requires encrypted PocketBase settings in the production container", () => {
    const dockerfile = read("pocketbase/Dockerfile");
    const entrypoint = read("pocketbase/entrypoint.sh");
    expect(dockerfile).toContain('ENTRYPOINT ["/pb/entrypoint.sh"]');
    expect(entrypoint).toContain("--encryptionEnv=PB_ENCRYPTION_KEY");
    expect(entrypoint).toContain('${#key}');
  });
});
