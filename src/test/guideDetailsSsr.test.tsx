// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { SEO_CONTENT_PAGES } from "@/lib/seoContent";
import SeoContentPage from "@/pages/SeoContentPage";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));

describe("guide detail server rendering", () => {
  it("renders every guide route as an indexable article shell", () => {
    expect(typeof window).toBe("undefined");

    for (const page of SEO_CONTENT_PAGES.filter((item) => item.kind === "guide")) {
      const html = renderToStaticMarkup(<StaticRouter location={page.path}><SeoContentPage /></StaticRouter>);
      expect(html, page.path).toContain(`data-guide-detail="${page.path}"`);
      expect(html.match(/<main\b/g), page.path).toHaveLength(1);
      expect(html.match(/<h1\b/g), page.path).toHaveLength(1);
      expect(html.match(/<article\b/g), page.path).toHaveLength(1);
      expect(html, page.path).toContain("data-landing-footer");
      expect(html, page.path).toContain(page.title);
    }
  });
});
