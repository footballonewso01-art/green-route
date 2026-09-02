import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const landingSource = readFileSync(path.join(process.cwd(), "src/pages/LandingPage.tsx"), "utf8");
const proofSource = readFileSync(path.join(process.cwd(), "src/components/landing/LandingSocialProof.tsx"), "utf8");
const proofStyles = readFileSync(path.join(process.cwd(), "src/components/landing/LandingSocialProof.module.css"), "utf8");
const heroStyles = readFileSync(path.join(process.cwd(), "src/styles/landing-rebrand.css"), "utf8");

describe("landing social proof", () => {
  it("renders directly after the rebranded hero and before the features section", () => {
    const heroEnd = landingSource.indexOf("<LandingSocialProof />");
    const featuresStart = landingSource.indexOf('{/* Features */}');

    expect(heroEnd).toBeGreaterThan(landingSource.indexOf("data-linktery-hero"));
    expect(featuresStart).toBeGreaterThan(heroEnd);
  });

  it("uses conservative, static production-backed totals", () => {
    expect(proofSource).toContain('value: "6M+"');
    expect(proofSource).toContain('value: "3150+"');
    expect(proofSource).toContain('value: "1100+"');
    expect(proofSource).not.toMatch(/countUp|setInterval|requestAnimationFrame/i);
  });

  it("keeps the section self-contained and supports reduced motion", () => {
    expect(proofSource).toContain('from "./LandingSocialProof.module.css"');
    expect(proofSource).toContain("useReducedMotion");
    expect(proofSource).toContain('id="social-proof"');
  });

  it("does not repeat the hero product pitch or add another CTA", () => {
    expect(proofSource).not.toContain("Explore the product");
    expect(proofSource).not.toContain("publish destinations");
    expect(proofSource).not.toContain("route visitors");
    expect(proofSource).not.toContain("creator, marketing, and business workflows");
  });

  it("keeps the three metric cards in one horizontal desktop row", () => {
    expect(proofStyles).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(proofSource).not.toContain("Linktery in use");
    expect(proofSource).not.toContain("A snapshot of the activity already happening across Linktery.");
  });

  it("shares the hero container width and responsive side gutters", () => {
    expect(heroStyles).toContain("--landing-content-max-width: 86rem;");
    expect(heroStyles).toMatch(/\.landing-hero__grid\s*\{[^}]*width: min\(100%, var\(--landing-content-max-width\)\)/);
    expect(proofStyles).toMatch(/\.inner\s*\{[^}]*width: min\(100%, var\(--landing-content-max-width\)\)/);
    expect(heroStyles).toMatch(/\.landing-hero\s*\{[^}]*padding: 7\.75rem var\(--landing-page-gutter\) 10\.25rem/);
    expect(proofStyles).toMatch(/\.section\s*\{[^}]*padding: clamp\(2\.25rem, 3\.5vw, 3\.5rem\) var\(--landing-page-gutter\) 0/);
    expect(heroStyles).toContain("--landing-page-gutter: clamp(1rem, 4vw, 4rem);");
    expect(heroStyles).toMatch(/@media \(min-width: 40rem\)\s*\{\s*:root\s*\{\s*--landing-page-gutter: clamp\(1\.5rem, 4vw, 4rem\)/);
  });

  it("reuses the hero card surfaces and pill-label language", () => {
    expect(proofStyles).toContain("background: color-mix(in oklch, var(--landing-paper-soft) 90%, white)");
    expect(proofStyles).toContain("border: 1px solid var(--landing-rule)");
    expect(proofStyles).toContain("background: var(--landing-media-text)");
    expect(proofStyles).toContain("text-transform: uppercase");
  });
});
