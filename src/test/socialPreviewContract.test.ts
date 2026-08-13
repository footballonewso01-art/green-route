import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readWorkspaceFile = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("automatic social preview production contract", () => {
  it("keeps crawler unfurls outside click and Profile View analytics", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const profilePreview = hook.indexOf("if (socialPreviewCrawler)");
    const profileView = hook.indexOf("utils.recordProfileView($app, c, publicProfile)");
    const linkPreview = hook.indexOf(
      "if (trustedEdgeRequest && requestedHost && socialPreviewCrawler)",
    );
    const redirectDecisioning = hook.indexOf("const redirectTraceValue", linkPreview);

    expect(profilePreview).toBeGreaterThan(-1);
    expect(profilePreview).toBeLessThan(profileView);
    expect(linkPreview).toBeGreaterThan(-1);
    expect(linkPreview).toBeLessThan(redirectDecisioning);
    expect(hook.slice(linkPreview, redirectDecisioning)).not.toContain("clickRecord");
    expect(hook.slice(linkPreview, redirectDecisioning)).not.toContain("resolveCountryFromIP");
  });

  it("uses a profile identity only for one visible owner-bound assignment", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const linkPreview = hook.indexOf(
      "if (trustedEdgeRequest && requestedHost && socialPreviewCrawler)",
    );
    const redirectDecisioning = hook.indexOf("const redirectTraceValue", linkPreview);
    const preview = hook.slice(linkPreview, redirectDecisioning);

    expect(preview).toContain("link_id = {:linkId} && user_id = {:userId} && visible = true");
    expect(preview).toContain("assignments.length === 1");
    expect(preview).toContain("id = {:profileId} && user_id = {:userId}");
    expect(preview).toContain('let imageUrl = "https://linktery.com/og-image.png"');
  });

  it("protects metadata lookup and centralizes production image URLs", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const worker = readWorkspaceFile("cloudflare/worker.ts");
    const config = readWorkspaceFile("wrangler.jsonc");

    expect(hook).toContain('routerAdd("GET", "/api/internal/social-preview/profile/{id}"');
    expect(hook).toContain('$os.getenv("SOCIAL_PREVIEW_ENABLED")');
    expect(hook).toContain("const socialPreviewCrawler = socialPreviewEnabled &&");
    expect(hook).toContain("utils.isTrustedRedirectEdgeRequest(c)");
    expect(hook).toContain('X-Linktery-Social-Preview-Origin", "v1"');
    expect(hook).toContain(': "linktery.com"');
    expect(worker).toContain("SOCIAL_PREVIEW_COORDINATOR");
    expect(worker).toContain("SOCIAL_PREVIEWS");
    expect(worker).toContain("claimSocialPreviewRenderBudget");
    expect(worker).toContain("cleanupOlderSocialPreviews");
    expect(worker).toContain('"Cache-Control": "public, max-age=21600"');
    expect(worker).toContain("getValidatedProfile");
    expect(config).toContain('"new_sqlite_classes": ["SocialPreviewCoordinator"]');
    expect(config).toContain('"bucket_name": "linktery-social-previews"');
    expect(config).toContain('"bucket_name": "linktery-social-previews-staging"');
  });
});
