import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import SeoHubPage from "@/pages/SeoHubPage";
import UtmBuilder from "@/pages/UtmBuilder";
import QrCodeGenerator from "@/pages/QrCodeGenerator";
import { SEO_CONTENT_PAGES } from "@/lib/seoContent";
import { SEO_PAGES } from "@/lib/seo-config";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const ignored = new Set(["initial", "whileInView", "viewport", "transition"]);
  const staticMotion = (tag: string) => (props: Record<string, unknown>) =>
    React.createElement(tag, Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))));
  return { motion: { div: staticMotion("div"), article: staticMotion("article") }, useReducedMotion: () => true };
});

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('meta, link[rel="canonical"], script[type="application/ld+json"]').forEach((node) => node.remove());
});

function renderTools() {
  return render(<MemoryRouter initialEntries={["/tools"]}><SeoHubPage kind="tool" /></MemoryRouter>);
}

describe("Tools marketing hub", () => {
  it("uses the new shell and shows both real tools without extra signup sections", () => {
    renderTools();
    expect(screen.getByRole("heading", { level: 1, name: "Link & Campaign Tools" })).toBeInTheDocument();
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("[data-tool-card]")).toHaveLength(2);
    expect(document.querySelectorAll("[data-landing-footer]")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toHaveClass("marketing-header--landing");
    expect(screen.getByText("Free. No signup needed.")).toBeInTheDocument();
    expect(document.querySelector('main a[href="/register"]')).not.toBeInTheDocument();
    expect(document.querySelector('img[src="/logo.webp"]')).not.toBeInTheDocument();
    expect(screen.queryByText("Build the next step")).not.toBeInTheDocument();
  });

  it("links directly to the existing tools and distinguishes a static QR from a managed destination", () => {
    renderTools();
    expect(screen.getByRole("link", { name: "Open UTM builder" })).toHaveAttribute("href", "/tools/utm-builder");
    expect(screen.getByRole("link", { name: "Open QR generator" })).toHaveAttribute("href", "/tools/qr-code-generator");
    expect(screen.getByRole("link", { name: "Explore managed links" })).toHaveAttribute("href", "/features/url-shortener");
    expect(screen.getByText(/These tools create tagged URLs and static QR images/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Free browser tools" }).querySelectorAll("input, button")).toHaveLength(0);
  });

  it("preserves the canonical and complete collection metadata", () => {
    renderTools();
    expect(document.title).toBe(SEO_PAGES.toolsIndex.title);
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      SEO_PAGES.toolsIndex.description,
    );
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", PRIMARY_ORIGIN + "/tools");
    const schema = JSON.parse(document.querySelector("#jsonld-structured")!.textContent!);
    const resources = SEO_CONTENT_PAGES.filter((page) => page.kind === "tool");
    expect(schema["@graph"].find((item: Record<string, unknown>) => item["@type"] === "ItemList").itemListElement.map((item: { url: string }) => item.url))
      .toEqual(resources.map((page) => PRIMARY_ORIGIN + page.path));
  });

  it("has a working mobile menu with correct page destinations", () => {
    renderTools();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const menu = document.getElementById("mobile-marketing-navigation")!;
    expect(within(menu).getByRole("link", { name: "Features" })).toHaveAttribute("href", "/features");
    expect(within(menu).getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.getElementById("mobile-marketing-navigation")).not.toBeInTheDocument();
    expect(document.getElementById("tools-main")).toBeInTheDocument();
  });

  it("keeps the UTM tool's normalization, validation, and output working", () => {
    render(<MemoryRouter><UtmBuilder /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Campaign source *"), { target: { value: "Newsletter" } });
    fireEvent.change(screen.getByLabelText("Campaign name *"), { target: { value: "Autumn launch" } });
    expect(screen.getByText("https://example.com/landing-page?utm_source=newsletter&utm_medium=social&utm_campaign=autumn-launch")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy campaign URL" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Destination URL"), { target: { value: "not-a-url" } });
    expect(screen.getByText("Enter a complete http:// or https:// destination URL.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy campaign URL" })).toBeDisabled();
  });

  it("keeps QR settings and URL validation working", () => {
    render(<MemoryRouter><QrCodeGenerator /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Download SVG" })).toBeEnabled();
    expect(document.getElementById("linktery-free-qr")?.tagName).toBe("svg");
    fireEvent.change(screen.getByLabelText("URL to encode"), { target: { value: "javascript:alert(1)" } });
    expect(screen.getByText("Enter a complete http:// or https:// URL.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download SVG" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("URL to encode"), { target: { value: "https://example.com" } });
    expect(screen.getByRole("button", { name: "Download SVG" })).toBeEnabled();
  });

  it("uses the shared layout and responsive, reduced-motion styling", () => {
    const css = readFileSync(path.join(process.cwd(), "src/components/tools/Tools.module.css"), "utf8");
    expect(css).toContain("var(--landing-content-max-width)");
    expect(css).toContain("var(--landing-page-gutter)");
    expect(css).toContain("background: var(--landing-paper)");
    expect(css).toContain("@media (max-width: 47.99rem)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
