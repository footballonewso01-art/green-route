import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createPrimaryRedirectUrl,
  decideEdgeRoute,
  isLikelyStaticAssetPath,
  isValidPublicSlug,
} from "../../cloudflare/router";

const readWorkspaceFile = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("Cloudflare edge routing contract", () => {
  it("keeps malformed alias paths on the canonical host", () => {
    const target = createPrimaryRedirectUrl(
      "https://www.linktery.com//evil.example?source=alias",
      "//evil.example",
    );

    expect(target.origin).toBe("https://linktery.com");
    expect(target.pathname).toBe("//evil.example");
    expect(target.search).toBe("?source=alias");
  });

  it("serves the prerendered landing artifact at the root", () => {
    expect(decideEdgeRoute("/")).toEqual({ kind: "landing" });
  });

  it.each([
    ["/features", "/features/link-management"],
    ["/tools", "/tools/utm-builder"],
    ["/templates", "/templates/link-in-bio"],
    ["/guides", "/guides/what-is-link-management"],
  ])("keeps the legacy redirect for %s", (source, destination) => {
    expect(decideEdgeRoute(source)).toEqual({
      kind: "redirect",
      destination,
      status: 308,
    });
  });

  it.each([
    "/login",
    "/register",
    "/auth",
    "/open-in-browser",
    "/dashboard",
    "/dashboard/settings",
    "/admin/users/abc",
    "/ref/lt_partner",
  ])("serves protected/system SPA route %s as noindex", (route) => {
    expect(decideEdgeRoute(route)).toEqual({
      kind: "spa",
      routeType: "system",
      noIndex: true,
    });
  });

  it("keeps /ref itself as an actual 404", () => {
    expect(decideEdgeRoute("/ref")).toEqual({ kind: "not-found" });
  });

  it.each([
    "/nasty",
    "/index",
    "/landing",
    "/app-shell",
    "/features-nasty",
    "/pricing-offer",
    "/api-creator",
    "/a",
    `/${"a".repeat(64)}`,
    "/a--b",
  ])("keeps valid customer slug %s on the SPA resolver", (route) => {
    expect(decideEdgeRoute(route)).toEqual({
      kind: "spa",
      routeType: "public",
      noIndex: false,
    });
  });

  it.each([
    "/404",
    "/api",
    "/assets",
    "/documentation",
    "/compare",
    "/compare/not-real",
    "/features/not-real",
    "/does/not/exist",
    "/missing.js",
    "/assets/missing.js",
    "/-bad",
    "/bad-",
    `/${"a".repeat(65)}`,
    "/юзер",
    "/_linktery/app-shell",
    "/foo//bar",
    "/foo%2Fbar",
    "/foo\\bar",
  ])("returns a true not-found decision for %s", (route) => {
    expect(decideEdgeRoute(route)).toEqual({ kind: "not-found" });
  });

  it.each([
    ["/Nasty", "/nasty"],
    ["/Pricing", "/pricing"],
    ["/Documentation/", "/documentation"],
    ["/dashboard/settings/", "/dashboard/settings"],
    ["/landing/", "/landing"],
  ])("canonicalizes %s with a 308", (source, destination) => {
    expect(decideEdgeRoute(source)).toEqual({
      kind: "redirect",
      destination,
      status: 308,
    });
  });

  it("uses exactly the same public slug boundary as PocketBase", () => {
    expect(isValidPublicSlug("a")).toBe(true);
    expect(isValidPublicSlug("a--b")).toBe(true);
    expect(isValidPublicSlug("a".repeat(64))).toBe(true);
    expect(isValidPublicSlug("-bad")).toBe(false);
    expect(isValidPublicSlug("bad-")).toBe(false);
    expect(isValidPublicSlug("a".repeat(65))).toBe(false);
    expect(isValidPublicSlug("pricing")).toBe(false);
    expect(isValidPublicSlug("documentation")).toBe(false);
    expect(isValidPublicSlug("cdn-cgi")).toBe(false);
    expect(isValidPublicSlug("_linktery")).toBe(false);
  });

  it("only delegates asset-looking alias paths to the static binding", () => {
    expect(isLikelyStaticAssetPath("/assets/index-abc.js")).toBe(true);
    expect(isLikelyStaticAssetPath("/favicon.png")).toBe(true);
    expect(isLikelyStaticAssetPath("/robots.txt")).toBe(true);
    expect(isLikelyStaticAssetPath("/pricing")).toBe(false);
    expect(isLikelyStaticAssetPath("/nasty")).toBe(false);
  });

  it("keeps heavy static assets free while routing HTML and slugs explicitly", () => {
    const config = JSON.parse(readWorkspaceFile("wrangler.jsonc")) as {
      assets: {
        not_found_handling: string;
        html_handling: string;
        run_worker_first: string[];
      };
    };

    expect(config.assets.not_found_handling).toBe("none");
    expect(config.assets.html_handling).toBe("drop-trailing-slash");
    expect(config.assets.run_worker_first).toEqual(
      expect.arrayContaining([
        "/*",
        "!/assets/*",
        "!/*.png",
        "!/*.webp",
        "!/*.mp4",
      ]),
    );
    expect(readWorkspaceFile("cloudflare/worker.ts")).toContain(
      "const assetResponse = await serveRequestedAsset(request, env)",
    );
    expect(readWorkspaceFile("wrangler.jsonc")).not.toContain(
      '"single-page-application"',
    );
    expect(readWorkspaceFile("wrangler.jsonc")).not.toContain('"404-page"');
  });

  it("generates the release sitemap without mutating tracked source files", () => {
    const generator = readWorkspaceFile("scripts/generate-sitemap.mjs");

    expect(generator).toContain('"dist", "sitemap.xml"');
    expect(generator).not.toContain('"public", "sitemap.xml"');
  });

  it("bootstraps the candidate Worker only when production traffic is disabled", () => {
    const uploader = readWorkspaceFile(
      "scripts/upload-cloudflare-candidate.mjs",
    );

    expect(uploader).toContain("wranglerConfig.workers_dev !== false");
    expect(uploader).toContain('Object.hasOwn(wranglerConfig, "routes")');
    expect(uploader).toContain('Object.hasOwn(wranglerConfig, "custom_domains")');
    expect(uploader).toContain('checkOutput.includes("10007")');
  });

  it("expects production preview URLs to remain globally noindex", () => {
    const smoke = readWorkspaceFile("scripts/smoke-cloudflare.mjs");

    expect(smoke).toContain(
      'baseUrl.hostname.toLowerCase().endsWith(".workers.dev")',
    );
  });

  it("keeps routine frontend deploys on Cloudflare", () => {
    const packageJson = JSON.parse(readWorkspaceFile("package.json")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["deploy:prod"]).toContain(
      "cf:deploy:production",
    );
    expect(packageJson.scripts["deploy:staging"]).toContain(
      "cf:deploy:staging",
    );
    expect(packageJson.scripts["deploy:prod"]).not.toContain("vercel");
    expect(packageJson.scripts["deploy:staging"]).not.toContain("vercel");
    expect(packageJson.scripts["release:check:production"]).toContain(
      "cf:dry-run:alias",
    );
    expect(packageJson.scripts["rollback:vercel:prod"]).toContain(
      "vercel --prod",
    );

    const deployWorkflow = readWorkspaceFile(".agent/workflows/deploy.md");
    expect(deployWorkflow).toContain("Cloudflare Workers Static Assets");
    expect(deployWorkflow).toContain("npm run deploy:prod");
    expect(deployWorkflow).not.toContain("*.vercel.app");
    expect(deployWorkflow).not.toContain("Hot-patch hooks only");
  });

  it("bounds Windows Wrangler shutdown during local smoke tests", () => {
    const localSmokeRunner = readWorkspaceFile(
      "scripts/run-cloudflare-smoke.mjs",
    ).replace(/\r\n/g, "\n");

    expect(localSmokeRunner).toContain('spawnSync(\n      "taskkill"');
    expect(localSmokeRunner).toContain("timeout: 10_000");
    expect(localSmokeRunner).toContain("windowsHide: true");
    expect(localSmokeRunner).toContain("AbortSignal.timeout(2_000)");
    expect(localSmokeRunner).toContain('stream.removeAllListeners("data")');
    expect(localSmokeRunner).toContain("runtime.unref()");

    for (const smokeScript of [
      "scripts/smoke-cloudflare.mjs",
      "scripts/smoke-cloudflare-alias.mjs",
    ]) {
      expect(readWorkspaceFile(smokeScript)).toContain(
        "AbortSignal.timeout(10_000)",
      );
    }
  });
});
