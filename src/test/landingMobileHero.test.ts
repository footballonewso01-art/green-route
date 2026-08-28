import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const landing = fs.readFileSync(
  path.join(process.cwd(), "src/pages/LandingPage.tsx"),
  "utf8",
);
const header = fs.readFileSync(
  path.join(process.cwd(), "src/components/MarketingHeader.tsx"),
  "utf8",
);
const footer = fs.readFileSync(
  path.join(process.cwd(), "src/components/Footer.tsx"),
  "utf8",
);

describe("landing mobile hero", () => {
  it("keeps the desktop product visual out of the mobile layout", () => {
    expect(landing).toContain("Desktop-only product visual");
    expect(landing).toContain('className="relative hidden w-full lg:col-span-6 lg:flex');
    expect(landing).toContain('import classicCoverPhone from "@/assets/mobila-classic-cover.webp"');
    expect(landing).toContain('media="(min-width: 1024px)" srcSet={classicCoverPhone}');
    expect(landing).toContain('src="data:image/svg+xml,');
    expect(landing).not.toContain('className="lg:col-span-6 flex justify-center');
  });

  it("uses the portrait asset at its natural ratio without the old oversized transforms", () => {
    expect(landing).toContain('data-landing-product-visual');
    expect(landing).toContain('width="941"');
    expect(landing).toContain('height="1672"');
    expect(landing).toContain('max-w-[352px]');
    expect(landing).toContain('xl:max-w-[384px]');
    expect(landing).toContain('2xl:max-w-[408px]');
    expect(landing).toContain('motion-safe:animate-float');
    expect(landing).not.toContain('lg:scale-[2.31]');
    expect(landing).not.toContain('lg:translate-x-[17%]');
  });

  it("aligns the desktop phone toward the outside of its column with a safe edge inset", () => {
    const visualClasses = landing.match(/data-landing-product-visual className="([^"]+)"/)?.[1];
    expect(visualClasses).toContain("lg:justify-end");
    expect(visualClasses).toContain("lg:pr-6 xl:pr-12");
    expect(visualClasses).not.toMatch(/(?:translate-x|scale)-/);
  });

  it("uses mobile-safe viewport, spacing, type, and form controls", () => {
    expect(landing).toContain("items-start overflow-hidden px-4 pb-14 pt-28");
    expect(landing).toContain("lg:min-h-[90vh] lg:items-center");
    expect(landing).toContain("text-[clamp(1.85rem,9.6vw,2.25rem)]");
    expect(landing).toContain('aria-label="Choose your Public Profile address"');
    expect(landing).toContain("prefersReducedMotion");
  });

  it("stacks the slug action below 360px without collapsing the input", () => {
    expect(landing).toContain("data-landing-slug-form");
    expect(landing).toContain("grid-cols-1 gap-1.5 rounded-2xl");
    expect(landing).toContain("min-[360px]:grid-cols-[minmax(0,1fr)_auto]");
    expect(landing).toContain("min-h-11 w-full whitespace-nowrap");
    expect(landing).toContain("min-[360px]:w-auto");
  });

  it("keeps pricing tracks shrinkable instead of masking horizontal overflow", () => {
    expect(landing).toContain("relative overflow-x-clip");
    expect(landing).toContain("data-pricing-grid");
    expect(landing).toContain("data-pricing-card");
    expect(landing).toContain("grid min-w-0 gap-8 md:grid-cols-3");
    expect(landing).toContain("min-w-0 flex-1 truncate");
    expect(landing).toContain("px-5 pb-8 pt-10");
  });

  it("uses semantic page structure and freezes the rotating headline for reduced motion", () => {
    expect(landing).toContain("<main>");
    expect(landing).toContain("</main>");
    expect(landing).toMatch(/if \(prefersReducedMotion\) \{\s*setWordIndex\(0\);\s*return;/);
    expect(landing).toContain("}, [prefersReducedMotion]);");
  });

  it("provides complete mobile navigation and a compact, tappable footer", () => {
    expect(header).toContain('aria-controls="mobile-marketing-navigation"');
    expect(header).toContain("aria-expanded={mobileOpen}");
    expect(header).toContain("Features");
    expect(header).toContain("Pricing");
    expect(header).toContain("Documentation");
    expect(header).toContain("Start free");
    expect(footer).toContain("Put your next link to work.");
    expect(footer).toContain('data-footer-cta="true"');
    expect(footer).toContain("pb-7 pt-10 sm:pb-8 sm:pt-12");
    expect(footer).toContain("lg:items-center");
    expect(footer).not.toContain("lg:items-end");
    expect(footer).toContain("min-h-11 items-center whitespace-nowrap");
    expect(footer).toContain('aria-label="Explore Linktery"');
    expect(footer).toContain('aria-label="Linktery resources"');
  });

  it("keeps the original rating social proof in the hero", () => {
    expect(landing).toContain("Rating social proof widget");
    expect(landing).toContain("Built for creators, marketers, and growing teams");
    expect(landing).toContain("[...Array(5)]");
    expect(landing).not.toContain("Factual product proof");
  });
});
