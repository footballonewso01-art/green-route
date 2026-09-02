// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SeoContentPage from "@/pages/SeoContentPage";
import QrCodeGenerator from "@/pages/QrCodeGenerator";
import UtmBuilder from "@/pages/UtmBuilder";
import { SEO_CONTENT_PAGES } from "@/lib/seoContent";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));

describe("resource detail server rendering", () => {
  it("renders every template route with its profile-rendering shell", () => {
    expect(typeof window).toBe("undefined");
    for (const page of SEO_CONTENT_PAGES.filter((item) => item.kind === "template")) {
      const html = renderToStaticMarkup(<StaticRouter location={page.path}><SeoContentPage /></StaticRouter>);
      expect(html.match(/data-template-detail=/g), page.path).toHaveLength(1);
      expect(html.match(/<main\b/g), page.path).toHaveLength(1);
      expect(html.match(/<h1\b/g), page.path).toHaveLength(1);
      expect(html, page.path).toContain("data-landing-footer");
    }
  });

  it.each([
    ["/tools/utm-builder", UtmBuilder, "utm_source="],
    ["/tools/qr-code-generator", QrCodeGenerator, 'id="linktery-free-qr"'],
  ] as const)("renders %s with the functioning output", (route, Component, output) => {
    const html = renderToStaticMarkup(<StaticRouter location={route}><Component /></StaticRouter>);
    expect(html.match(/data-tool-detail=/g)).toHaveLength(1);
    expect(html.match(/<main\b/g)).toHaveLength(1);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain(output);
    expect(html).toContain("data-landing-footer");
  });
});
