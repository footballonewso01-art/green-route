import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import SeoContentPage from "@/pages/SeoContentPage";
import QrCodeGenerator from "@/pages/QrCodeGenerator";
import UtmBuilder from "@/pages/UtmBuilder";
import { PROFILE_TEMPLATES } from "@/lib/profileTemplates";
import { SEO_CONTENT_PAGES } from "@/lib/seoContent";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const ignored = new Set(["initial", "animate", "whileInView", "viewport", "transition"]);
  const staticMotion = (tag: string) => (props: Record<string, unknown>) =>
    React.createElement(tag, Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))));
  return { motion: { div: staticMotion("div"), article: staticMotion("article") }, useReducedMotion: () => true };
});

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('meta, link[rel="canonical"], script[type="application/ld+json"]').forEach((node) => node.remove());
});

const templatePages = SEO_CONTENT_PAGES.filter((page) => page.kind === "template");

describe("redesigned template and tool details", () => {
  it.each(templatePages)("renders $path with a real template visual and the landing shell", (page) => {
    render(<MemoryRouter initialEntries={[page.path]}><SeoContentPage /></MemoryRouter>);
    expect(document.querySelector(`[data-template-detail="${page.templateId}"]`)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: page.title })).toBeInTheDocument();
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelectorAll("[data-landing-footer]")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toHaveClass("marketing-header--landing");
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", PRIMARY_ORIGIN + page.path);
    if (page.templateId !== "hub") expect(document.querySelector(`[data-profile-template="${page.templateId}"]`)).toBeInTheDocument();
    expect(document.querySelector('img[src="/logo.webp"]')).not.toBeInTheDocument();
  });

  it("gives every real profile layout its own detail destination", () => {
    const pathsByTemplate = new Map(templatePages.map((page) => [page.templateId, page.path]));
    for (const template of PROFILE_TEMPLATES) expect(pathsByTemplate.get(template.id)).toBe(`/templates/${template.id === "classic" ? "classic-cover" : template.id === "compact" ? "compact-circle" : template.id === "banner" ? "banner-circle" : template.id === "hero" ? "hero-portrait" : template.id === "cutout" ? "cutout-editorial" : "visual-canvas"}`);
  });

  it.each([
    ["/tools/utm-builder", UtmBuilder, "utm"],
    ["/tools/qr-code-generator", QrCodeGenerator, "qr"],
  ] as const)("renders %s as a focused interactive workspace", (route, Component, workbench) => {
    render(<MemoryRouter initialEntries={[route]}><Component /></MemoryRouter>);
    expect(document.querySelector(`[data-tool-detail="${route}"]`)).toBeInTheDocument();
    expect(document.querySelector(`[data-workbench="${workbench}"]`)).toBeInTheDocument();
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelectorAll("[data-landing-footer]")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toHaveClass("marketing-header--landing");
    expect(document.querySelector('img[src="/logo.webp"]')).not.toBeInTheDocument();
  });

  it("uses shared landing tokens and responsive fallbacks without page-wide clipping", () => {
    for (const file of ["src/components/templates/TemplateDetails.module.css", "src/components/tools/ToolDetails.module.css"]) {
      const css = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(css).toContain("var(--landing-content-max-width)");
      expect(css).toContain("var(--landing-page-gutter)");
      expect(css).toContain("background: var(--landing-paper)");
      expect(css).toContain("@media (max-width: 47.99rem)");
      expect(css).toContain("@media (prefers-reduced-motion: reduce)");
      expect(css).not.toContain("overflow-x: hidden");
    }
  });
});
