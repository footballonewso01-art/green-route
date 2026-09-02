import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import SeoHubPage from "@/pages/SeoHubPage";
import SeoResourceLayout from "@/components/SeoResourceLayout";
import { SEO_CONTENT_PAGES } from "@/lib/seoContent";
import { featurePresentation, getFeatureAvailability } from "@/components/features/featurePresentation";
import { PLANS } from "@/lib/plans";
import { SEO_PAGES } from "@/lib/seo-config";
import { PRIMARY_ORIGIN, PUBLIC_API_BASE_URL } from "@/lib/siteConfig";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const ignored = new Set(["initial", "whileInView", "viewport", "transition"]);
  const staticMotion = (tag: string) => (props: Record<string, unknown>) =>
    React.createElement(tag, Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))));
  return { motion: { span: staticMotion("span"), div: staticMotion("div") }, useReducedMotion: () => true };
});

const pages = SEO_CONTENT_PAGES.filter((page) => page.kind === "feature");

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('meta, link[rel="canonical"], script[type="application/ld+json"]').forEach((element) => element.remove());
});

function renderDetail(slug: string) {
  const page = pages.find((item) => item.path === `/features/${slug}`);
  if (!page) throw new Error(`Unknown feature fixture: ${slug}`);
  return render(<MemoryRouter initialEntries={[page.path]}><SeoResourceLayout page={page} /></MemoryRouter>);
}

describe("feature marketing redesign", () => {
  it("includes every existing feature exactly once in the categorized catalog", () => {
    render(<MemoryRouter><SeoHubPage kind="feature" /></MemoryRouter>);
    expect(document.querySelectorAll("[data-feature-resource]")).toHaveLength(pages.length);
    for (const page of pages) {
      expect(featurePresentation[page.path]).toBeDefined();
      expect(document.querySelectorAll(`[data-feature-resource="${page.path}"]`)).toHaveLength(1);
    }
    expect(screen.getByRole("navigation", { name: "Feature categories" }).querySelectorAll("a")).toHaveLength(3);
    expect(document.title).toBe(SEO_PAGES.featuresIndex.title);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", `${PRIMARY_ORIGIN}/features`);
    const schema = JSON.parse(document.querySelector("#jsonld-structured")!.textContent!);
    expect(schema["@graph"].find((item: Record<string, unknown>) => item["@type"] === "ItemList").itemListElement).toHaveLength(pages.length);
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll('img[src="/logo.webp"]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-landing-footer]')).toHaveLength(1);
    expect(document.querySelector('main a[href="/register"]')).not.toBeInTheDocument();
    expect(screen.queryByText(/More control/)).not.toBeInTheDocument();
  });

  it.each(pages)("preserves all content, canonical and schemas for $path", (page) => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    render(<MemoryRouter initialEntries={[page.path]}><SeoResourceLayout page={page} /></MemoryRouter>);
    expect(document.querySelector("[data-feature-marketing]")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-landing-footer]')).toHaveLength(1);
    expect(document.querySelector('main a[href="/register"]')).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: page.title })).toBeInTheDocument();
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByText(page.lead)).toBeInTheDocument();
    expect(screen.getByText(getFeatureAvailability(page.path))).toBeInTheDocument();
    for (const directory of screen.getAllByRole("navigation", { name: "Feature directory" })) {
      const activeLink = directory.querySelector('[aria-current="page"]');
      expect(activeLink).toHaveAttribute("href", page.path);
      expect(directory.querySelectorAll('a[href^="/features/"]')).toHaveLength(pages.length);
    }
    for (const section of page.sections) {
      expect(screen.getByRole("heading", { name: section.heading })).toBeInTheDocument();
      for (const text of [...section.paragraphs, ...section.bullets]) expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    for (const highlight of page.highlights) {
      expect(screen.getByRole("heading", { name: highlight.title })).toBeInTheDocument();
      expect(screen.getByText(highlight.text)).toBeInTheDocument();
    }
    for (const faq of page.faqs) {
      expect(screen.getByText(faq.question).tagName).toBe("SUMMARY");
      expect(screen.getByText(faq.answer)).toBeInTheDocument();
    }
    for (const relatedPath of page.related) expect(document.querySelector(`main a[href="${relatedPath}"]`)).toBeInTheDocument();
    for (const anchor of document.querySelectorAll<HTMLAnchorElement>('main a[href^="#"]')) {
      expect(document.getElementById(anchor.hash.slice(1))).toBeInTheDocument();
    }
    expect(document.title).toBe(page.seoTitle);
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute("content", page.seoDescription);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", `${PRIMARY_ORIGIN}${page.path}`);
    expect(robots).toHaveAttribute("content", "index, follow");
    const schema = JSON.parse(document.querySelector("#jsonld-structured")!.textContent!);
    expect(schema["@graph"][0].url).toBe(`${PRIMARY_ORIGIN}${page.path}`);
    expect(schema["@graph"][1].itemListElement[2].item).toBe(`${PRIMARY_ORIGIN}${page.path}`);
    const faqSchema = JSON.parse(document.querySelector("#jsonld-faq")!.textContent!);
    expect(faqSchema.mainEntity.map((item: { name: string }) => item.name)).toEqual(page.faqs.map((faq) => faq.question));
  });

  it("has the new header on direct entry and a working mobile menu", () => {
    renderDetail("branded-links");
    const nav = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(nav).toHaveClass("marketing-header--landing");
    expect(within(nav).getByRole("link", { name: "Features" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Features" })).toHaveAttribute("href", "/features");
    expect(within(nav).getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const mobile = document.getElementById("mobile-marketing-navigation")!;
    expect(within(mobile).getByRole("link", { name: "Features" })).toHaveAttribute("href", "/features");
    expect(within(mobile).getByRole("link", { name: "Documentation" })).toHaveAttribute("href", "/documentation");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.getElementById("mobile-marketing-navigation")).not.toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: "Get started" })) expect(link).toHaveAttribute("href", "/register");
  });

  it("defaults the routing illustration to the current feature and keeps it interactive", () => {
    renderDetail("device-targeting");
    expect(screen.getByRole("button", { name: "Device" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Mobile landing page")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Country" }));
    expect(screen.getByText("United States")).toBeInTheDocument();
  });

  it("starts profile analytics on profile views and identifies illustrative data", () => {
    renderDetail("public-profile-analytics");
    expect(screen.getByRole("button", { name: "Profile views" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("1,812")).toBeInTheDocument();
    expect(screen.getByText("Example data")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Link clicks" }));
    expect(screen.getByText("12,486")).toBeInTheDocument();
  });

  it("uses the configured API endpoint and only a placeholder for authentication", () => {
    renderDetail("public-api");
    const request = screen.getByLabelText("Example authenticated API request");
    expect(request.textContent).toContain(`${PUBLIC_API_BASE_URL}/links`);
    expect(request.textContent).toContain("Authorization: Bearer $LINKTERY_API_KEY");
    expect(screen.getByRole("link", { name: "Read the API docs" })).toHaveAttribute("href", "/documentation");
  });

  it("keeps the guide hub's own design separate from the feature catalog", () => {
    render(<MemoryRouter><SeoHubPage kind="guide" /></MemoryRouter>);
    expect(document.querySelector("[data-feature-marketing]")).not.toBeInTheDocument();
    expect(document.querySelector("[data-guides-marketing]")).toBeInTheDocument();
    expect(document.querySelector('img[src="/logo.webp"]')).not.toBeInTheDocument();
  });

  it("leaves non-feature resource layouts unchanged", () => {
    const guide = SEO_CONTENT_PAGES.find((page) => page.kind === "guide")!;
    render(<MemoryRouter><SeoResourceLayout page={guide} /></MemoryRouter>);
    expect(document.querySelector("[data-feature-marketing]")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: guide.title })).toBeInTheDocument();
  });

  it("describes root domain attachments and actual splitter behavior", () => {
    renderDetail("custom-domains");
    expect(screen.getByText(/Visitors open the domain directly, with no \/slug/)).toBeInTheDocument();
    expect(getFeatureAvailability("/features/custom-domains")).toContain(`Creator Pro: ${PLANS.pro.limits.custom_domain}`);
    expect(getFeatureAvailability("/features/custom-domains")).toContain(`Agency: ${PLANS.agency.limits.custom_domain}`);
    cleanup();
    renderDetail("link-rotator");
    expect(screen.getAllByText("50%")).toHaveLength(2);
    expect(screen.getByText(/custom weights such as 70\/30 are not available/)).toBeInTheDocument();
    expect(screen.queryByText("Set the weights.")).not.toBeInTheDocument();
    expect(getFeatureAvailability("/features/link-rotator")).toBe("Agency");
  });

  it("uses existing tokens, responsive navigation, and no page-wide clipping", () => {
    const css = readFileSync(path.join(process.cwd(), "src/components/features/FeatureMarketing.module.css"), "utf8");
    expect(css).toContain("var(--landing-page-gutter)");
    expect(css).toContain("var(--landing-content-max-width)");
    expect(css).toContain("background: var(--landing-paper)");
    expect(css).toContain("aspect-ratio: 2 / 1");
    expect(css).toContain(".mobileDirectory { display: block;");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).not.toContain("overflow-x: hidden");
  });
});
