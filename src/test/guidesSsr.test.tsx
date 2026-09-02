// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SeoHubPage from "@/pages/SeoHubPage";
import { SEO_CONTENT_PAGES } from "@/lib/seoContent";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));

describe("Guides server rendering", () => {
  it("renders the full article directory without browser globals or client-only data", () => {
    expect(typeof window).toBe("undefined");
    const html = renderToStaticMarkup(<StaticRouter location="/guides"><SeoHubPage kind="guide" /></StaticRouter>);
    const pages = SEO_CONTENT_PAGES.filter((page) => page.kind === "guide");
    expect(html.match(/data-guide-card=/g)).toHaveLength(pages.length);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html.match(/<main\b/g)).toHaveLength(1);
    for (const page of pages) expect(html.split(`href="${page.path}"`)).toHaveLength(2);
    expect(html).toContain('aria-label="Search guides"');
    expect(html).toContain("data-landing-footer");
  });
});
