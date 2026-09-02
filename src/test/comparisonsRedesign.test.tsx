import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { competitors } from "@/components/alternatives/alternativeData";
import { comparisonPath, getComparisonFaq, getComparisonRows, productBriefs, resolveComparison } from "@/components/comparisons/comparisonData";
import { useSeo } from "@/hooks/useSeo";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";
import CompetitorComparison from "@/pages/CompetitorComparison";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const ignored = new Set(["initial", "animate", "whileInView", "viewport", "transition"]);
  const staticDiv = (props: Record<string, unknown>) => React.createElement("div", Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))));
  return { motion: { div: staticDiv }, useReducedMotion: () => true };
});

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('meta, link[rel="canonical"], script[type="application/ld+json"]').forEach((node) => node.remove());
});

function renderComparison(slug = "beacons-vs-linktree") {
  return render(<MemoryRouter initialEntries={[`/compare/${slug}`]}><Routes><Route path="/compare/:comparisonSlug" element={<CompetitorComparison />} /><Route path="/404" element={<h1>Not found</h1>} /></Routes></MemoryRouter>);
}

describe("comparison route and data contracts", () => {
  it("resolves every canonical pair and reverse alias to the same products", () => {
    const paths = new Set<string>();
    for (let i = 0; i < competitors.length; i += 1) {
      for (let j = i + 1; j < competitors.length; j += 1) {
        const a = competitors[i];
        const b = competitors[j];
        const canonical = comparisonPath(a, b);
        paths.add(canonical);
        expect(resolveComparison(`${a.slug}-vs-${b.slug}`)).toEqual(resolveComparison(`${b.slug}-vs-${a.slug}`));
        expect(comparisonPath(b, a)).toBe(canonical);
        const rows = getComparisonRows(a, b);
        expect(rows).toHaveLength(a.migrationOnly || b.migrationOnly ? 3 : 8);
        expect(rows.every((row) => row.a && row.b)).toBe(true);
        expect(getComparisonFaq(a, b)).toHaveLength(4);
      }
    }
    expect(paths.size).toBe(153);
  });

  it("has a specific, pair-neutral brief for all 18 products", () => {
    expect(Object.keys(productBriefs).sort()).toEqual(competitors.map((item) => item.slug).sort());
    expect(new Set(Object.values(productBriefs).map((item) => item.summary)).size).toBe(18);
    for (const brief of Object.values(productBriefs)) {
      expect(`${brief.summary} ${brief.check}`).not.toContain("Linktery");
      expect(brief.check.length).toBeGreaterThan(100);
    }
  });

  it.each([undefined, "linktree", "unknown-vs-linktree", "linktree-vs-linktree", "beacons-vs-linktree-vs-bitly", "-vs-linktree"])("rejects malformed comparison %s", (slug) => {
    expect(resolveComparison(slug)).toBeNull();
  });
});

describe("comparison redesign", () => {
  it.each(["beacons-vs-linktree", "bitly-vs-carrd", "bento-vs-linktree", "koji-vs-urmybio", "fanlink-vs-milkshake", "taplink-vs-urmybio"])("renders %s with the shared marketing shell and sourced data", (slug) => {
    renderComparison(slug);
    const [a, b] = resolveComparison(slug)!;
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${a.name} vs ${b.name}`);
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toHaveClass("marketing-header--landing");
    expect(document.querySelectorAll("[data-landing-footer]")).toHaveLength(1);
    expect(document.querySelector('img[src="/logo.webp"]')).not.toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((node) => node.textContent)).toEqual(["What to compare", a.name, b.name]);
    expect(within(table).getAllByRole("row")).toHaveLength(a.migrationOnly || b.migrationOnly ? 4 : 9);
    expect(within(table).queryByText("Linktery")).not.toBeInTheDocument();
    for (const product of [a, b]) {
      expect(screen.getByText(productBriefs[product.slug].summary)).toBeInTheDocument();
      for (const source of product.sources) {
        expect(screen.getByRole("link", { name: source.label })).toHaveAttribute("href", source.href);
      }
    }
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", `${PRIMARY_ORIGIN}${comparisonPath(a, b)}`);
    expect(document.title).toBe(`${a.name} vs ${b.name}: Features & Pricing | Linktery`);
    const schema = JSON.parse(document.querySelector("#jsonld-faq")!.textContent!);
    expect(schema.mainEntity.map((item: { name: string; acceptedAnswer: { text: string } }) => ({ question: item.name, answer: item.acceptedAnswer.text }))).toEqual(getComparisonFaq(a, b));
    expect(Array.from(document.querySelectorAll("main details summary")).slice(0, 4).map((node) => node.textContent)).toEqual(getComparisonFaq(a, b).map((item) => item.question));
    expect(document.querySelectorAll('main nav[aria-label="Related platform comparisons"] a')).toHaveLength(16);
  });

  it("lets a visitor choose a new pair and resets controls to its canonical order", () => {
    renderComparison();
    fireEvent.change(screen.getByRole("combobox", { name: "First platform" }), { target: { value: "taplink" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Second platform" }), { target: { value: "bitly" } });
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bitly vs Taplink");
    expect(screen.getByRole("combobox", { name: "First platform" })).toHaveValue("bitly");
    expect(screen.getByRole("combobox", { name: "Second platform" })).toHaveValue("taplink");
    expect(within(screen.getByRole("combobox", { name: "First platform" })).getByRole("option", { name: "Taplink" })).toBeDisabled();
    expect(document.querySelector("#jsonld-faq")!.textContent).toContain("How do Bitly and Taplink differ?");
    expect(document.querySelectorAll("#jsonld-faq")).toHaveLength(1);
  });

  it("redirects reverse aliases and invalid pairs without duplicate pages", () => {
    const rendered = renderComparison("linktree-vs-beacons");
    expect(document.querySelector('[data-comparison-detail="beacons-vs-linktree"]')).toBeInTheDocument();
    rendered.unmount();
    renderComparison("linktree-vs-linktree");
    expect(screen.getByRole("heading", { name: "Not found" })).toBeInTheDocument();
  });

  it("preserves indexability and matches prerender's follow directive for secondary pairs", () => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    renderComparison("beacons-vs-linktree");
    expect(robots).toHaveAttribute("content", "index, follow");
    fireEvent.change(screen.getByRole("combobox", { name: "First platform" }), { target: { value: "ohmybio" } });
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));
    expect(robots).toHaveAttribute("content", "noindex, follow");
  });

  it("keeps nofollow as the default for private/system pages", () => {
    function PrivatePage() { useSeo({ title: "Private", noIndex: true }); return <p>Private page</p>; }
    render(<PrivatePage />);
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  });

  it("uses project tokens and a labelled two-column mobile comparison without hiding overflow", () => {
    const css = readFileSync(path.join(process.cwd(), "src/components/comparisons/Comparisons.module.css"), "utf8");
    expect(css).toContain("var(--landing-content-max-width)");
    expect(css).toContain("var(--landing-page-gutter)");
    expect(css).toContain("background: var(--landing-paper)");
    expect(css).toContain("background: var(--landing-media)");
    expect(css).toContain(".mobileLabel { display: block;");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).not.toMatch(/overflow-x:\s*(hidden|clip)/);
  });
});
