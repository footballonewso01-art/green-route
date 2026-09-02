import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { competitors } from "@/components/alternatives/alternativeData";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";
import AlternativesIndex from "@/pages/AlternativesIndex";
import CompetitorAlternative from "@/pages/CompetitorAlternative";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const ignored = new Set(["initial", "animate", "whileInView", "viewport", "transition"]);
  const staticMotion = (tag: string) => (props: Record<string, unknown>) =>
    React.createElement(tag, Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))));
  return {
    motion: { div: staticMotion("div"), article: staticMotion("article"), aside: staticMotion("aside") },
    useReducedMotion: () => true,
  };
});

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('meta, link[rel="canonical"], script[type="application/ld+json"]').forEach((node) => node.remove());
});

describe("alternatives redesign", () => {
  it("turns the index into a searchable comparison directory", () => {
    render(<MemoryRouter initialEntries={["/alternatives"]}><AlternativesIndex /></MemoryRouter>);

    expect(document.querySelector("[data-alternatives-index]")).toBeInTheDocument();
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelectorAll("article")).toHaveLength(competitors.length);
    expect(document.querySelectorAll("[data-landing-footer]")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toHaveClass("marketing-header--landing");
    expect(JSON.parse(document.getElementById("jsonld-structured")?.textContent || "{}")).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Home", item: PRIMARY_ORIGIN },
        { position: 2, name: "Alternatives", item: `${PRIMARY_ORIGIN}/alternatives` },
      ],
    });

    fireEvent.change(screen.getByRole("textbox", { name: "Search alternatives" }), { target: { value: "Bitly" } });
    expect(document.querySelectorAll("article")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 3, name: "Bitly" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "Linktree" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(document.querySelectorAll("article")).toHaveLength(competitors.length);
    fireEvent.change(screen.getByRole("textbox", { name: "Search alternatives" }), { target: { value: "does-not-exist" } });
    expect(screen.getByText(/No platform matches/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show all alternatives" }));
    expect(document.querySelectorAll("article")).toHaveLength(competitors.length);
  });

  it.each(competitors)("renders /alternatives/$slug with one shared decision layout", (competitor) => {
    render(
      <MemoryRouter initialEntries={[`/alternatives/${competitor.slug}`]}>
        <Routes><Route path="/alternatives/:competitorSlug" element={<CompetitorAlternative />} /></Routes>
      </MemoryRouter>,
    );

    expect(document.querySelector(`[data-alternative-detail="${competitor.slug}"]`)).toBeInTheDocument();
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${competitor.name} alternative.`);
    expect(screen.getByRole("heading", { level: 2, name: `Linktery vs ${competitor.name}` })).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(competitor.migrationOnly ? 4 : 9);
    expect(document.querySelectorAll('main a[href^="/compare/"]')).toHaveLength(competitors.length - 1);
    for (const source of competitor.sources) {
      expect(screen.getByRole("link", { name: source.label })).toHaveAttribute("href", source.href);
    }
    const schema = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((node) => node.textContent).join("");
    expect(schema).toContain("FAQPage");
    expect(schema).toContain(competitor.question);
    expect(document.querySelectorAll("[data-landing-footer]")).toHaveLength(1);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", `${PRIMARY_ORIGIN}/alternatives/${competitor.slug}`);
    expect(document.querySelector('img[src="/logo.webp"]')).not.toBeInTheDocument();
  });

  it("does not carry unsupported legacy claims into the new reviews", () => {
    expect(new Set(competitors.map((item) => item.topic)).size).toBe(competitors.length);
    expect(new Set(competitors.map((item) => item.question)).size).toBe(competitors.length);
    expect(competitors.find((item) => item.slug === "linktree")?.facts.domains).toContain("Cannot replace");
    expect(competitors.find((item) => item.slug === "taplink")?.facts.apps).toContain("open supported apps");
    expect(competitors.find((item) => item.slug === "fanlink")?.description).toContain("music");
    expect(competitors.find((item) => item.slug === "fanlink")?.name).toBe("FanLink");
    expect(competitors.find((item) => item.slug === "ohmybio")?.facts.routing).toContain("language");
    expect(competitors.find((item) => item.slug === "koji")?.migrationOnly).toBe(true);
    expect(competitors.find((item) => item.slug === "urmybio")?.notice).toContain("not independently verified");
  });

  it("redirects an unknown alternative to the existing 404 route", () => {
    render(<MemoryRouter initialEntries={["/alternatives/unknown-product"]}><Routes><Route path="/alternatives/:competitorSlug" element={<CompetitorAlternative />} /><Route path="/404" element={<h1>Not found</h1>} /></Routes></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Not found" })).toBeInTheDocument();
  });

  it("shares landing tokens and responsive rules without page-level clipping", () => {
    const css = readFileSync(path.join(process.cwd(), "src/components/alternatives/Alternatives.module.css"), "utf8");
    expect(css).toContain("var(--landing-content-max-width)");
    expect(css).toContain("var(--landing-page-gutter)");
    expect(css).toContain("background: var(--landing-paper)");
    expect(css).toContain("@media (max-width: 47.99rem)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).not.toContain("overflow-x: hidden");
    const detail = readFileSync(path.join(process.cwd(), "src/pages/CompetitorAlternative.tsx"), "utf8");
    expect(detail).toContain("equal-probability destination splitting");
    expect(detail).not.toContain("Weighted destinations");
  });
});
