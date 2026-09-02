// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { SEO_PAGES } from "@/lib/seo-config";
import { getSeoPageConfigs } from "../../scripts/seo-routes.mjs";

describe("SEO metadata contract", () => {
  it("keeps every indexable title within the 65-character editorial budget", () => {
    const oversized = getSeoPageConfigs()
      .filter((page: { title: string; noIndex?: boolean }) => !page.noIndex && page.title.length > 65)
      .map((page: { route: string; title: string }) => `${page.route}: ${page.title}`);
    expect(oversized).toEqual([]);
  });

  it("uses the same catalog for prerender and hydrated hub metadata", () => {
    const prerenderByRoute = new Map<string, { route: string; title: string; description: string }>(
      getSeoPageConfigs().map((item: { route: string; title: string; description: string }) => [item.route, item]),
    );
    for (const seo of [
      SEO_PAGES.featuresIndex,
      SEO_PAGES.templatesIndex,
      SEO_PAGES.guidesIndex,
      SEO_PAGES.toolsIndex,
    ]) {
      expect(prerenderByRoute.get(seo.canonical)).toMatchObject({
        title: seo.title,
        description: seo.description,
      });
    }
    expect(prerenderByRoute.get("/tools")?.description).toBe(
      "Use Linktery's free UTM builder and URL QR code generator, then connect the result to managed links and analytics when needed.",
    );
  });

  it("references the current brand mark in favicon, social preview, and Organization schema", async () => {
    const index = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");
    expect(index).toContain('href="/favicon.svg"');
    expect(index).toContain('href="/favicon.png"');
    expect(index).toContain('content="https://linktery.com/og-image.png"');
    expect(index).toContain('"logo": "https://linktery.com/linktery-logo.png"');
    expect(index).not.toContain('"logo": "https://linktery.com/logo.webp"');

    const faviconSvg = fs.readFileSync(path.join(process.cwd(), "public", "favicon.svg"), "utf8");
    expect(faviconSvg).toContain('fill="#12C77A"');
    expect(faviconSvg).toContain('stroke="#071A11"');
    expect(faviconSvg).toContain('rx="196"');
    expect(faviconSvg).toContain('scale(.95)');

    const favicon = await sharp(path.join(process.cwd(), "public", "favicon.png")).metadata();
    const social = await sharp(path.join(process.cwd(), "public", "og-image.png")).metadata();
    expect([favicon.width, favicon.height]).toEqual([512, 512]);
    expect([social.width, social.height]).toEqual([1200, 630]);
  });
});
