import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const landing = fs.readFileSync(
  path.join(process.cwd(), "src/pages/LandingPage.tsx"),
  "utf8",
);
const bootHtml = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");
const header = fs.readFileSync(
  path.join(process.cwd(), "src/components/MarketingHeader.tsx"),
  "utf8",
);
const footer = fs.readFileSync(
  path.join(process.cwd(), "src/components/Footer.tsx"),
  "utf8",
);
const footerCss = fs.readFileSync(
  path.join(process.cwd(), "src/components/Footer.module.css"),
  "utf8",
);
const heroAnalytics = fs.readFileSync(
  path.join(process.cwd(), "src/components/landing/HeroAnalyticsPreview.tsx"),
  "utf8",
);
const pricing = fs.readFileSync(
  path.join(process.cwd(), "src/components/landing/LandingPricing.tsx"),
  "utf8",
);
const pricingCss = fs.readFileSync(
  path.join(process.cwd(), "src/components/landing/LandingPricing.module.css"),
  "utf8",
);
const authContext = fs.readFileSync(
  path.join(process.cwd(), "src/contexts/AuthContext.tsx"),
  "utf8",
);

describe("landing mobile hero", () => {
  it("uses the isolated Linktery rebrand hero and real product assets", () => {
    expect(landing).toContain("data-linktery-hero");
    expect(landing).toContain("landing-rebrand landing-hero");
    expect(landing).toContain('import classicCoverPhone from "@/assets/mobila-classic-cover.webp"');
    expect(landing).toContain('import heroCreatorPortrait from "@/assets/hero-creator-portrait.webp"');
    expect(landing).toContain("src={heroCreatorPortrait}");
    expect(landing).not.toContain('src="/mainstat.webp"');
    expect(landing).not.toContain("linktery-logo-mark.svg");
    expect(landing).toContain("linktery.com/");
    expect(landing).not.toContain("https://stream.mux.com");
    expect(landing).not.toContain("hls.js");
  });

  it("bounds the portrait before hydration so prerendered HTML cannot flash the source image", () => {
    expect(bootHtml).toContain('href="/src/styles/landing-rebrand.css"');
    expect(landing).toContain('src={heroCreatorPortrait} alt="" width="116" height="61" decoding="async"');
  });

  it("keeps the profile product media at its declared aspect ratio without remote placeholders", () => {
    expect(landing).toContain('width="941"');
    expect(landing).toContain('height="1672"');
    expect(landing).not.toContain("images.unsplash.com");
  });

  it("provides three truthful product-proof slots that can accept video later", () => {
    expect(landing).toContain("data-hero-media-grid");
    expect(landing).toContain('data-video-slot="profile-story"');
    expect(landing).toContain('data-video-slot="routing"');
    expect(landing).toContain('data-video-slot="analytics"');
    expect(landing).toContain("Your profile becomes the destination.");
    expect(landing).toContain("Right visitor. Right destination.");
    expect(landing).toContain("Know what converts.");
  });

  it("keeps a real form CTA and the established reservation flow", () => {
    expect(landing).toContain('aria-label="Choose your Public Profile address"');
    expect(landing).toContain("data-landing-slug-form");
    expect(landing).toContain("await reserveStarterProfile(slug)");
    expect(landing).toContain("/register?profile=${encodeURIComponent(slug)}");
    expect(landing).toContain('surface: "hero_profile_slug"');
  });

  it("hides prerendered guest CTAs when a local auth snapshot is restored", () => {
    expect(bootHtml).toContain('document.documentElement.dataset.authSnapshot = "present"');
    expect(bootHtml).toContain('id="auth-snapshot-critical"');
    expect(header).toContain('data-auth-visibility="guest"');
    expect(landing).toContain('data-auth-visibility="guest"');
    expect(fs.readFileSync(path.join(process.cwd(), "src/styles/landing-rebrand.css"), "utf8")).toContain('html[data-auth-snapshot="present"] [data-auth-visibility="guest"]');
    expect(authContext).toContain('document.documentElement.dataset.authSnapshot = "present"');
    expect(authContext).toContain('}, [user]);');
    expect(authContext).not.toContain('const frame = window.requestAnimationFrame');
  });

  it("removes the auto-rotating headline and the old hero background video", () => {
    expect(landing).not.toContain("const words =");
    expect(landing).not.toContain("AnimatePresence");
    expect(landing).not.toContain("wordIndex");
    expect(landing).not.toContain('/mainvid.min.mp4');
    expect(landing).toContain("Make every");
    expect(landing).toContain("link work");
    expect(landing).toContain("harder.");
  });

  it("keeps pricing tracks shrinkable instead of masking horizontal overflow", () => {
    expect(landing).toContain("relative overflow-x-clip");
    expect(landing).toContain("<LandingPricing");
    expect(pricing).toContain("data-pricing-grid");
    expect(pricing).toContain("data-pricing-card");
    expect(pricingCss).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(pricingCss).toContain("min-width: 0");
    expect(pricingCss).toContain("@media (max-width: 63.99rem)");
  });

  it("uses semantic page structure", () => {
    expect(landing).toContain("<main>");
    expect(landing).toContain("</main>");
  });

  it("provides complete branded navigation and a compact, tappable footer", () => {
    expect(header).toContain('aria-controls="mobile-marketing-navigation"');
    expect(header).toContain("aria-expanded={mobileOpen}");
    expect(header).toContain("Features");
    expect(header).not.toContain("Templates");
    expect(header).toContain("Pricing");
    expect(header).toContain("Documentation");
    expect(header).toContain("Start free");
    expect(header).toContain("marketing-header--landing");
    expect(header).toContain('import BrandWordmark from "@/components/BrandWordmark"');
    expect(header).toContain('<BrandWordmark tone="dark" className="marketing-header__wordmark" />');
    expect(header).not.toContain("<span>Linktery</span>");
    expect(landing).toContain('<Footer variant="landing" />');
    expect(footer).toContain("Put your next link to work.");
    expect(footer).toContain('data-footer-cta="true"');
    expect(footer).toContain('data-landing-footer');
    expect(footer).toContain('label: "Linktery product"');
    expect(footer).toContain('label: "Discover Linktery"');
    expect(footer).toContain('label: "Linktery resources"');
    expect(footer).toContain('aria-label="Legal"');
    expect(footerCss).toContain("width: min(100%, var(--landing-content-max-width))");
    expect(footerCss).toContain("linear-gradient(to bottom, var(--landing-paper) 0 50%, var(--landing-media) 50% 100%)");
    expect(footerCss).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(footerCss).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(footerCss).toContain("min-height: 2.75rem");
    expect(footerCss).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("uses a focused audience strip instead of repeating product capabilities", () => {
    expect(landing).toContain("Built for");
    expect(landing).toContain("Creators");
    expect(landing).toContain("Coaches");
    expect(landing).toContain("Marketers");
    expect(landing).toContain("Online businesses");
    expect(landing).toContain('aria-label="Who Linktery is built for"');
    expect(landing).not.toContain("[...Array(5)]");
    expect(landing).not.toContain("Rating social proof widget");
  });

  it("keeps the footer CTA content-sized and mobile navigation in two columns", () => {
    const ctaRules = [...footerCss.matchAll(/\.ctaCard\s*\{([^}]+)\}/g)].map((match) => match[1]);
    expect(ctaRules.length).toBeGreaterThan(0);
    expect(ctaRules[0]).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(ctaRules[0]).toContain("align-items: center");
    for (const rule of ctaRules) {
      expect(rule).not.toMatch(/(?:min-)?height\s*:/);
    }

    const footerGridRules = [...footerCss.matchAll(/\.footerGrid\s*\{([^}]+)\}/g)].map((match) => match[1]);
    expect(footerGridRules.some((rule) => rule.includes("repeat(2, minmax(0, 1fr))"))).toBe(true);
    for (const rule of footerGridRules) {
      expect(rule).not.toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/);
    }
  });

  it("shows legible analytics proof instead of a cropped dashboard screenshot", () => {
    expect(landing).toContain("<HeroAnalyticsPreview />");
    expect(heroAnalytics).toContain("143,873");
    expect(heroAnalytics).toContain("Top country");
    expect(heroAnalytics).toContain("93%");
    expect(heroAnalytics).toContain("USA");
    expect(landing).not.toContain("/mainstat.webp");
  });

  it("uses the current seven-day refund window in shared pricing", () => {
    expect(pricing).toContain("7-day money-back guarantee");
    expect(pricing).not.toContain("30-day money-back guarantee");
  });
});
