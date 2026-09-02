// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SeoHubPage from "@/pages/SeoHubPage";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));

describe("Tools server rendering", () => {
  it("renders both tools and a real QR graphic without browser globals", () => {
    expect(typeof window).toBe("undefined");
    const html = renderToStaticMarkup(<StaticRouter location="/tools"><SeoHubPage kind="tool" /></StaticRouter>);
    expect(html.match(/data-tool-card=/g)).toHaveLength(2);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html.match(/<main\b/g)).toHaveLength(1);
    expect(html).toContain('href="/tools/utm-builder"');
    expect(html).toContain('href="/tools/qr-code-generator"');
    expect(html).toContain("utm_source=");
    expect(html).toContain('shape-rendering="crispEdges"');
  });
});
