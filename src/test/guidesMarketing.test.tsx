import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import SeoHubPage from "@/pages/SeoHubPage";
import { getGuidePresentation, guideMatchesSearch, guidePresentation } from "@/components/guides/guidePresentation";
import { SEO_CONTENT_PAGES } from "@/lib/seoContent";
import { SEO_PAGES } from "@/lib/seo-config";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const ignored = new Set(["initial", "whileInView", "viewport", "transition"]);
  const staticMotion = (tag: string) => (props: Record<string, unknown>) =>
    React.createElement(tag, Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))));
  return { motion: { div: staticMotion("div") }, useReducedMotion: () => true };
});

const pages = SEO_CONTENT_PAGES.filter((page) => page.kind === "guide");

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('meta, link[rel="canonical"], script[type="application/ld+json"]').forEach((node) => node.remove());
});

function renderGuides() {
  return render(<MemoryRouter initialEntries={["/guides"]}><SeoHubPage kind="guide" /></MemoryRouter>);
}

describe("Guides marketing library", () => {
  it("uses shared marketing chrome, one main heading, and no duplicate signup section", () => {
    renderGuides();
    expect(screen.getByRole("heading", { level: 1, name: "Link Management Guides" })).toBeInTheDocument();
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("[data-landing-footer]")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toHaveClass("marketing-header--landing");
    expect(document.querySelector('img[src="/logo.webp"]')).not.toBeInTheDocument();
    expect(document.querySelector('main a[href="/register"]')).not.toBeInTheDocument();
    expect(screen.queryByText("Build the next step")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to guides" })).toHaveAttribute("href", "#guides-main");
  });

  it("includes each existing guide exactly once and keeps its full title and address", () => {
    renderGuides();
    expect(document.querySelectorAll("[data-guide-card]")).toHaveLength(pages.length);
    expect(pages).toHaveLength(17);
    for (const page of pages) {
      expect(guidePresentation[page.path]).toBeDefined();
      expect(document.querySelectorAll(`[data-guide-card="${page.path}"]`)).toHaveLength(1);
      expect(screen.getByRole("link", { name: page.title })).toHaveAttribute("href", page.path);
    }
    expect(screen.getAllByText("Start here")).toHaveLength(1);
    expect(document.querySelector("main time")).not.toBeInTheDocument();
    expect(document.querySelector("main img")).not.toBeInTheDocument();
  });

  it.each([
    ["Essentials (6)", "essentials", 6],
    ["Traffic & tracking (7)", "tracking", 7],
    ["API recipes (2)", "api", 2],
    ["Migration (2)", "migration", 2],
  ] as const)("filters the catalog with %s", (name, topic, count) => {
    renderGuides();
    fireEvent.click(screen.getByRole("button", { name }));
    expect(screen.getByRole("button", { name })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent(`${count} guides`);
    expect(document.querySelectorAll("[data-guide-card]")).toHaveLength(count);
    for (const page of pages) {
      const entry = document.querySelector(`[data-guide-card="${page.path}"]`);
      if (getGuidePresentation(page).topic === topic) expect(entry).toBeInTheDocument();
      else expect(entry).not.toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: `All guides (${pages.length})` }));
    expect(document.querySelectorAll("[data-guide-card]")).toHaveLength(pages.length);
  });

  it("searches titles, summaries, and section headings without case or whitespace sensitivity", () => {
    renderGuides();
    const input = screen.getByRole("searchbox", { name: "Search guides" });
    fireEvent.change(input, { target: { value: "  UTM    PARAMETERS " } });
    expect(screen.getByRole("status")).toHaveTextContent("1 guide found");
    expect(screen.getByRole("link", { name: "UTM Parameters: A Practical Campaign Guide" })).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "DNS" } });
    expect(screen.getByRole("status")).toHaveTextContent("1 guide found");
    expect(screen.getByRole("link", { name: "How to Create a Branded Short URL" })).toBeInTheDocument();
    const clickGuide = pages.find((page) => page.path === "/guides/how-to-track-link-clicks")!;
    expect(guideMatchesSearch(clickGuide, "Start with a measurement question")).toBe(true);
  });

  it("combines search and topic, and offers a working empty-state reset", () => {
    renderGuides();
    fireEvent.click(screen.getByRole("button", { name: "API recipes (2)" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "short" } });
    expect(screen.getByRole("status")).toHaveTextContent("1 guide found");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "no-matching-article" } });
    expect(screen.getByRole("heading", { name: "No guides found" })).toBeInTheDocument();
    expect(document.querySelectorAll("[data-guide-card]")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("searchbox")).toHaveFocus();
    expect(screen.getByRole("button", { name: `All guides (${pages.length})` })).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelectorAll("[data-guide-card]")).toHaveLength(pages.length);
  });

  it("clears only the search on Escape or the clear button, keeping the selected topic", () => {
    renderGuides();
    fireEvent.click(screen.getByRole("button", { name: "Migration (2)" }));
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "bitly" } });
    expect(screen.getByRole("status")).toHaveTextContent("1 guide found");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("2 guides");
    fireEvent.change(input, { target: { value: "linktree" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(input).toHaveFocus();
    expect(input).toHaveValue("");
    expect(screen.getByRole("button", { name: "Migration (2)" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps canonical and complete collection metadata stable while filtering", () => {
    renderGuides();
    fireEvent.click(screen.getByRole("button", { name: "Migration (2)" }));
    expect(document.title).toBe(SEO_PAGES.guidesIndex.title);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", PRIMARY_ORIGIN + "/guides");
    const schema = JSON.parse(document.querySelector("#jsonld-structured")!.textContent!);
    expect(schema["@graph"].find((item: Record<string, unknown>) => item["@type"] === "ItemList").itemListElement.map((item: { url: string }) => item.url))
      .toEqual(pages.map((page) => PRIMARY_ORIGIN + page.path));
  });

  it("has a working mobile menu with page links rather than landing anchors", () => {
    renderGuides();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const menu = document.getElementById("mobile-marketing-navigation")!;
    expect(within(menu).getByRole("link", { name: "Features" })).toHaveAttribute("href", "/features");
    expect(within(menu).getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.getElementById("mobile-marketing-navigation")).not.toBeInTheDocument();
  });

  it("uses shared tokens, wrapping mobile filters, and reduced-motion styling", () => {
    const css = readFileSync(path.join(process.cwd(), "src/components/guides/Guides.module.css"), "utf8");
    expect(css).toContain("var(--landing-content-max-width)");
    expect(css).toContain("var(--landing-page-gutter)");
    expect(css).toContain("background: var(--landing-paper)");
    expect(css).toContain("flex-wrap: wrap");
    expect(css).toContain("@media (max-width: 47.99rem)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).not.toContain("overflow-x: hidden");
  });
});
