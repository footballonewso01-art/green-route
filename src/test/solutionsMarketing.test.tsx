import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import SolutionsIndex from "@/pages/SolutionsIndex";
import { solutionGuides, solutionProfessions } from "@/components/solutions/solutionPresentation";
import { SEO_PAGES } from "@/lib/seo-config";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";
import professions from "@/data/professions.json";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const ignored = new Set(["initial", "whileInView", "viewport", "transition"]);
  const staticMotion = (tag: string) => (props: Record<string, unknown>) =>
    React.createElement(tag, Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))));
  return { motion: { div: staticMotion("div"), article: staticMotion("article") }, useReducedMotion: () => true };
});

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('meta, link[rel="canonical"], script[type="application/ld+json"]').forEach((node) => node.remove());
});

function renderSolutions() {
  return render(<MemoryRouter initialEntries={["/solutions"]}><SolutionsIndex /></MemoryRouter>);
}

describe("Solutions marketing page", () => {
  it("uses the new shell and presents tasks instead of a second product hero", () => {
    renderSolutions();
    expect(screen.getByRole("heading", { level: 1, name: "Find your link workflow." })).toBeInTheDocument();
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("[data-landing-footer]")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toHaveClass("marketing-header--landing");
    expect(document.querySelector('img[src="/logo.webp"]')).not.toBeInTheDocument();
    expect(document.querySelector('main a[href="/register"]')).not.toBeInTheDocument();
    expect(screen.queryByText("Core Redirection Engines")).not.toBeInTheDocument();
    expect(screen.queryByText("Configure")).not.toBeInTheDocument();
  });

  it("retains all existing guide, profession, and comparison destinations", () => {
    renderSolutions();
    expect(document.querySelectorAll("[data-solution-card]")).toHaveLength(16);
    expect(solutionProfessions).toHaveLength(professions.length);
    const main = document.querySelector("main")!;
    for (const guide of solutionGuides) {
      const link = main.querySelector<HTMLAnchorElement>(`a[href="${guide.path}"]`);
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent(guide.title);
      expect(Object.values(SEO_PAGES).some((page) => page.canonical === guide.path)).toBe(true);
    }
    const professionSection = screen.getByRole("region", { name: "A setup for your kind of work." });
    for (const profession of solutionProfessions) {
      const link = professionSection.querySelector<HTMLAnchorElement>(`a[href="${profession.path}"]`);
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent(profession.title);
      expect(link).toHaveTextContent(profession.description);
      expect(professions.some((item) => profession.path === "/solutions/link-in-bio-for-" + item.slug)).toBe(true);
    }
    const comparisons = screen.getByRole("navigation", { name: "Platform comparisons" });
    expect(within(comparisons).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/alternatives/linktree", "/alternatives/beacons", "/alternatives/lnk-bio", "/alternatives",
    ]);
  });

  it.each([
    ["Build an audience", "audience", 8],
    ["Sell online", "selling", 3],
    ["Run campaigns", "campaigns", 5],
  ] as const)("filters %s without changing the profession directory", (label, group, count) => {
    renderSolutions();
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent(count + " guides");
    expect(Array.from(document.querySelectorAll("[data-solution-card]")).map((node) => node.getAttribute("data-solution-card")))
      .toEqual(solutionGuides.filter((guide) => guide.group === group).map((guide) => guide.path));
    expect(screen.getByRole("region", { name: "A setup for your kind of work." }).querySelectorAll("a")).toHaveLength(15);
    fireEvent.click(screen.getByRole("button", { name: "All solutions" }));
    expect(screen.getByRole("status")).toHaveTextContent("16 guides");
  });

  it("keeps canonical metadata and a complete collection schema while filtering", () => {
    renderSolutions();
    expect(document.title).toBe(SEO_PAGES.solutionsIndex.title);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", PRIMARY_ORIGIN + "/solutions");
    fireEvent.click(screen.getByRole("button", { name: "Sell online" }));
    const schema = JSON.parse(document.querySelector("#jsonld-structured")!.textContent!);
    expect(schema["@graph"].find((item: Record<string, unknown>) => item["@type"] === "ItemList").itemListElement.map((item: { url: string }) => item.url))
      .toEqual([...solutionGuides, ...solutionProfessions].map((item) => PRIMARY_ORIGIN + item.path));
  });

  it("has working mobile navigation and valid in-page anchors", () => {
    renderSolutions();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const mobile = document.getElementById("mobile-marketing-navigation")!;
    expect(within(mobile).getByRole("link", { name: "Features" })).toHaveAttribute("href", "/features");
    expect(within(mobile).getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.getElementById("mobile-marketing-navigation")).not.toBeInTheDocument();
    for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
      expect(document.getElementById(anchor.hash.slice(1))).toBeInTheDocument();
    }
  });

  it("uses shared tokens and reduced-motion and mobile fallbacks", () => {
    const css = readFileSync(path.join(process.cwd(), "src/components/solutions/Solutions.module.css"), "utf8");
    expect(css).toContain("var(--landing-page-gutter)");
    expect(css).toContain("var(--landing-content-max-width)");
    expect(css).toContain("background: var(--landing-paper)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@media (max-width: 47.99rem)");
  });
});
