import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import SolutionDetailPage from "@/pages/SolutionDetailPage";
import { getSolutionDetail, publishedSolutionPaths } from "@/components/solutions/solutionDetailContent";
import { solutionGuides } from "@/components/solutions/solutionPresentation";
import professionsData from "@/data/professions.json";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";
import { SEO_PAGES } from "@/lib/seo-config";
import { SEO_CONTENT_PAGES } from "@/lib/seoContent";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const ignored = new Set(["initial", "animate", "whileInView", "viewport", "transition"]);
  const staticMotion = (tag: string) => (props: Record<string, unknown>) =>
    React.createElement(tag, Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))));
  return { motion: { div: staticMotion("div"), li: staticMotion("li") }, useReducedMotion: () => true };
});

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('meta, link[rel="canonical"], script[type="application/ld+json"]').forEach((node) => node.remove());
});

function renderPath(route: string) {
  return render(<MemoryRouter initialEntries={[route]}><Routes><Route path="/solutions/:solutionPath" element={<SolutionDetailPage />} /><Route path="/404" element={<p>Not found</p>} /></Routes></MemoryRouter>);
}

describe("Solution detail redesign", () => {
  it("defines every solution linked from the hub and every published profession page", () => {
    const expected = new Set([
      ...solutionGuides.map((item) => item.path),
      ...(professionsData as { slug: string }[]).map((item) => `/solutions/link-in-bio-for-${item.slug}`),
    ]);
    expect(new Set(publishedSolutionPaths)).toEqual(expected);
    expect(publishedSolutionPaths).toHaveLength(expected.size);
    for (const route of expected) {
      const solution = getSolutionDetail(route);
      expect(solution, route).toBeDefined();
      expect(solution?.path).toBe(route);
      expect(solution?.title.length).toBeGreaterThan(18);
      expect(solution?.lead.length).toBeGreaterThan(70);
      expect(solution?.steps).toHaveLength(3);
      expect(solution?.capabilities).toHaveLength(3);
      expect(solution?.faqs).toHaveLength(3);
      expect(solution?.related).toHaveLength(3);
      expect(solution?.seo.canonical).toBe(route);
    }
  });

  it("uses the current marketing shell and a complete, scenario-specific Shopify page", () => {
    renderPath("/solutions/shopify-smart-links");
    expect(screen.getByRole("heading", { level: 1, name: "Bring campaign traffic to the right storefront." })).toBeInTheDocument();
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelector('[data-solution-visual="commerce"]')).toBeInTheDocument();
    expect(document.querySelectorAll("[data-landing-footer]")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toHaveClass("marketing-header--landing");
    expect(document.querySelector('img[src="/logo.webp"]')).not.toBeInTheDocument();
    expect(screen.getByText("Store data stays in the store")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Explore geo targeting" })).toHaveLength(2);
    for (const link of screen.getAllByRole("link", { name: "Explore geo targeting" })) expect(link).toHaveAttribute("href", "/features/geo-targeting");
    expect(within(document.querySelector("main")!).getByRole("link", { name: "Start free" })).toHaveAttribute("href", "/register");
  });

  it.each([
    ["/solutions/bio-link-tool", "profile"],
    ["/solutions/shopify-smart-links", "commerce"],
    ["/solutions/geo-targeted-redirect", "routing"],
    ["/solutions/telegram-bio-link", "handoff"],
    ["/solutions/music-smart-links", "media"],
    ["/solutions/affiliate-smart-link-rotator", "rotation"],
    ["/solutions/youtube-smart-links", "campaign"],
    ["/solutions/ugc-portfolio", "portfolio"],
    ["/solutions/qr-code-biolink", "qr"],
  ])("gives %s its relevant %s visual", (route, visual) => {
    renderPath(route);
    expect(document.querySelector(`[data-solution-visual="${visual}"]`)).toBeInTheDocument();
    expect(screen.getAllByText(getSolutionDetail(route)!.visualTitle).length).toBeGreaterThan(0);
  });

  it("adapts the content and profile structure for a profession route", () => {
    renderPath("/solutions/link-in-bio-for-beauty-influencers");
    expect(screen.getByRole("heading", { level: 1, name: "Link in Bio for Beauty & Fashion Creators" })).toBeInTheDocument();
    expect(screen.getByText("Shop My Outfit on LTK (LiketoKnowit)")).toBeInTheDocument();
    expect(screen.getByText("A shoppable content index")).toBeInTheDocument();
    expect(screen.getByText(/Can I make the latest routine the first item/, { selector: "summary" })).toBeInTheDocument();
    expect(document.querySelector('[data-solution-visual="profile"]')).toBeInTheDocument();
  });

  it("keeps SEO, FAQ schema, breadcrumb, and canonical data on direct entry", () => {
    const route = "/solutions/shopify-smart-links";
    const solution = getSolutionDetail(route)!;
    renderPath(route);
    expect(document.title).toBe(solution.seo.title);
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute("content", solution.seo.description);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", PRIMARY_ORIGIN + route);
    const schema = JSON.parse(document.querySelector("#jsonld-structured")!.textContent!);
    expect(schema["@graph"][0].url).toBe(PRIMARY_ORIGIN + route);
    expect(schema["@graph"][1].itemListElement[2].item).toBe(PRIMARY_ORIGIN + route);
    const faqSchema = JSON.parse(document.querySelector("#jsonld-faq")!.textContent!);
    expect(faqSchema.mainEntity.map((item: { name: string }) => item.name)).toEqual(solution.faqs.map((item) => item.question));
    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByRole("link", { name: "Solutions" })).toHaveAttribute("href", "/solutions");
  });

  it("keeps product boundaries precise instead of repeating unsupported promises", () => {
    const allCopy = publishedSolutionPaths.map((route) => JSON.stringify(getSolutionDetail(route))).join(" ");
    expect(allCopy).not.toMatch(/guarantee(?:d|s)? native app/i);
    expect(allCopy).not.toMatch(/set custom (?:split )?weights|distribute traffic by custom weights/i);
    expect(allCopy).not.toMatch(/track(?:s|ing)? (?:sales|orders|purchases)/i);
    expect(getSolutionDetail("/solutions/affiliate-smart-link-rotator")?.boundary.text).toContain("custom split weights are not available");
    expect(getSolutionDetail("/solutions/qr-code-biolink")?.boundary.text).toContain("printed QR code is static");
    expect(getSolutionDetail("/solutions/shopify-smart-links")?.boundary.text).toContain("not add-to-cart events");
  });

  it("gives every profession its own scenario, constraint, and industry examples", () => {
    const professionRoutes = (professionsData as { slug: string }[])
      .map((item) => `/solutions/link-in-bio-for-${item.slug}`);
    const definitions = professionRoutes.map((route) => getSolutionDetail(route)!);
    expect(new Set(definitions.map((item) => item.useWhen))).toHaveLength(definitions.length);
    expect(new Set(definitions.map((item) => item.boundary.title))).toHaveLength(definitions.length);
    expect(new Set(definitions.flatMap((item) => item.faqs.map((entry) => entry.question))).size)
      .toBe(definitions.length * 3);

    const shingles = (definition: NonNullable<ReturnType<typeof getSolutionDetail>>) => {
      const words = [
        definition.lead,
        definition.useWhen,
        ...definition.steps.flatMap((item) => [item.title, item.text]),
        ...definition.capabilities.flatMap((item) => [item.title, item.text]),
        definition.boundary.title,
        definition.boundary.text,
        ...definition.faqs.flatMap((item) => [item.question, item.answer]),
      ].join(" ").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/);
      return new Set(words.slice(0, -4).map((_, index) => words.slice(index, index + 5).join(" ")));
    };
    const sets = definitions.map(shingles);
    let highestSimilarity = 0;
    for (let first = 0; first < sets.length; first += 1) {
      for (let second = first + 1; second < sets.length; second += 1) {
        const overlap = [...sets[first]].filter((item) => sets[second].has(item)).length;
        const union = new Set([...sets[first], ...sets[second]]).size;
        highestSimilarity = Math.max(highestSimilarity, overlap / union);
      }
    }
    expect(highestSimilarity).toBeLessThan(0.35);
  });

  it("links every solution CTA and related resource to a published route", () => {
    const publishedRoutes = new Set([
      ...Object.values(SEO_PAGES).map((item) => item.canonical),
      ...SEO_CONTENT_PAGES.map((item) => item.path),
      ...publishedSolutionPaths,
    ]);
    for (const route of publishedSolutionPaths) {
      const solution = getSolutionDetail(route)!;
      for (const destination of [solution.featureLink, ...solution.related]) {
        expect(publishedRoutes.has(destination.path), `${route} -> ${destination.path}`).toBe(true);
      }
    }
  });

  it("redirects an unknown solution slug to the existing not-found route", () => {
    renderPath("/solutions/not-a-real-solution");
    expect(screen.getByText("Not found")).toBeInTheDocument();
    expect(document.querySelector("[data-solution-detail]")).not.toBeInTheDocument();
  });

  it("uses shared tokens and dedicated tablet, mobile, narrow, and reduced-motion layouts", () => {
    const css = readFileSync(path.join(process.cwd(), "src/components/solutions/SolutionDetails.module.css"), "utf8");
    expect(css).toContain("var(--landing-content-max-width)");
    expect(css).toContain("var(--landing-page-gutter)");
    expect(css).toContain("background: var(--landing-paper)");
    expect(css).toContain("@media (max-width: 63.99rem)");
    expect(css).toContain("@media (max-width: 47.99rem)");
    expect(css).toContain("@media (max-width: 359px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).not.toMatch(/\.page\s*\{[^}]*overflow-x:\s*hidden/s);
  });
});
