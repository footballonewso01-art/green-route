// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { competitors } from "@/components/alternatives/alternativeData";
import AlternativesIndex from "@/pages/AlternativesIndex";
import CompetitorAlternative from "@/pages/CompetitorAlternative";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));

describe("alternatives server rendering", () => {
  it("renders the directory and all competitor alternatives", () => {
    const indexHtml = renderToStaticMarkup(<StaticRouter location="/alternatives"><AlternativesIndex /></StaticRouter>);
    expect(indexHtml).toContain("data-alternatives-index");
    expect(indexHtml.match(/<article\b/g)).toHaveLength(competitors.length);
    expect(indexHtml).toContain("data-landing-footer");

    for (const competitor of competitors) {
      const route = `/alternatives/${competitor.slug}`;
      const html = renderToStaticMarkup(
        <StaticRouter location={route}><Routes><Route path="/alternatives/:competitorSlug" element={<CompetitorAlternative />} /></Routes></StaticRouter>,
      );
      expect(html, route).toContain(`data-alternative-detail="${competitor.slug}"`);
      expect(html.match(/<main\b/g), route).toHaveLength(1);
      expect(html.match(/<h1\b/g), route).toHaveLength(1);
      expect(html, route).toContain("data-landing-footer");
      expect(html, route).toContain(`Linktery vs ${competitor.name}`);
    }
  });
});
