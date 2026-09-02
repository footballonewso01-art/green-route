// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SolutionDetailPage from "@/pages/SolutionDetailPage";
import { getSolutionDetail, publishedSolutionPaths } from "@/components/solutions/solutionDetailContent";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));

describe("Solution detail server rendering", () => {
  it("renders every published solution with its own content and shared shell", () => {
    expect(typeof window).toBe("undefined");
    for (const route of publishedSolutionPaths) {
      const solution = getSolutionDetail(route)!;
      const html = renderToStaticMarkup(<StaticRouter location={route}><SolutionDetailPage /></StaticRouter>);
      expect(html.match(/data-solution-detail=/g), route).toHaveLength(1);
      expect(html.match(/<h1\b/g), route).toHaveLength(1);
      expect(html.match(/<main\b/g), route).toHaveLength(1);
      const escapedTitle = solution.title
        .replace(/&/g, "&amp;")
        .replace(/'/g, "&#x27;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      expect(html, route).toContain(escapedTitle);
      expect(html, route).toContain(`data-solution-visual="${solution.visual}"`);
      expect(html, route).toContain("data-landing-footer");
    }
  });
});
