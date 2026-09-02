// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { competitors } from "@/components/alternatives/alternativeData";
import { comparisonPath } from "@/components/comparisons/comparisonData";
import CompetitorComparison from "@/pages/CompetitorComparison";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));

describe("comparison server rendering", () => {
  it("renders all 153 canonical pairs with complete content and no browser dependency", () => {
    let count = 0;
    for (let i = 0; i < competitors.length; i += 1) {
      for (let j = i + 1; j < competitors.length; j += 1) {
        const route = comparisonPath(competitors[i], competitors[j]);
        const html = renderToStaticMarkup(<StaticRouter location={route}><Routes><Route path="/compare/:comparisonSlug" element={<CompetitorComparison />} /></Routes></StaticRouter>);
        expect(html, route).toContain(`data-comparison-detail="${route.replace("/compare/", "")}"`);
        expect(html.match(/<main\b/g), route).toHaveLength(1);
        expect(html.match(/<h1\b/g), route).toHaveLength(1);
        expect(html.match(/<table\b/g), route).toHaveLength(1);
        expect(html, route).toContain("data-landing-footer");
        expect(html, route).not.toContain("/logo.webp");
        expect(html, route).not.toContain("animate-pulse");
        expect(html, route).toContain("Before you choose.");
        count += 1;
      }
    }
    expect(count).toBe(153);
  }, 15000);
});
