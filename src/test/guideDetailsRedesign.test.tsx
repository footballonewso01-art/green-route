import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SEO_CONTENT_PAGES } from "@/lib/seoContent";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";
import SeoContentPage from "@/pages/SeoContentPage";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const ignored = new Set(["initial", "animate", "whileInView", "viewport", "transition"]);
  const staticMotion = (tag: string) => (props: Record<string, unknown>) =>
    React.createElement(tag, Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))));
  return { motion: { div: staticMotion("div"), section: staticMotion("section") }, useReducedMotion: () => true };
});

const guidePages = SEO_CONTENT_PAGES.filter((page) => page.kind === "guide");

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('meta, link[rel="canonical"], script[type="application/ld+json"]').forEach((node) => node.remove());
});

describe("redesigned guide details", () => {
  it("covers the complete guide catalog", () => {
    expect(guidePages).toHaveLength(17);
  });

  it.each(guidePages)("renders $path as a focused editorial page", (page) => {
    render(<MemoryRouter initialEntries={[page.path]}><SeoContentPage /></MemoryRouter>);

    expect(document.querySelector(`[data-guide-detail="${page.path}"]`)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: page.title })).toBeInTheDocument();
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelectorAll("article section")).toHaveLength(page.sections.length);
    expect(document.querySelectorAll("[data-landing-footer]")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toHaveClass("marketing-header--landing");
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", PRIMARY_ORIGIN + page.path);
    expect(document.querySelector('img[src="/logo.webp"]')).not.toBeInTheDocument();
  });

  it("uses the shared landing system without clipping long-form content", () => {
    const css = readFileSync(path.join(process.cwd(), "src/components/guides/GuideDetails.module.css"), "utf8");
    expect(css).toContain("var(--landing-content-max-width)");
    expect(css).toContain("var(--landing-page-gutter)");
    expect(css).toContain("background: var(--landing-paper)");
    expect(css).toContain("@media (max-width: 47.99rem)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).not.toContain("overflow-x: hidden");
  });
});
