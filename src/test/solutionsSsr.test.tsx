// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SolutionsIndex from "@/pages/SolutionsIndex";
import { solutionGuides, solutionProfessions } from "@/components/solutions/solutionPresentation";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));

describe("Solutions server rendering", () => {
  it("renders every guide without browser globals or extra page landmarks", () => {
    expect(typeof window).toBe("undefined");
    const html = renderToStaticMarkup(<StaticRouter location="/solutions"><SolutionsIndex /></StaticRouter>);
    expect(html.match(/data-solution-card=/g)).toHaveLength(16);
    expect(html.match(/<main\b/g)).toHaveLength(1);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    for (const item of [...solutionGuides, ...solutionProfessions]) expect(html).toContain('href="' + item.path + '"');
  });
});
