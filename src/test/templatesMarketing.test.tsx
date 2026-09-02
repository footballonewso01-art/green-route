import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import SeoHubPage from "@/pages/SeoHubPage";
import { SEO_CONTENT_PAGES } from "@/lib/seoContent";
import { PROFILE_TEMPLATES } from "@/lib/profileTemplates";
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

function renderTemplates() {
  return render(<MemoryRouter initialEntries={["/templates"]}><SeoHubPage kind="template" /></MemoryRouter>);
}

describe("templates marketing gallery", () => {
  it("shows every real template with the current marketing header and footer", () => {
    renderTemplates();
    expect(screen.getByRole("heading", { level: 1, name: "Link-in-Bio Templates" })).toBeInTheDocument();
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelectorAll("[data-template-card]")).toHaveLength(PROFILE_TEMPLATES.length);
    for (const template of PROFILE_TEMPLATES) {
      const card = document.querySelector(`[data-template-card="${template.id}"]`)!;
      expect(card.querySelector(`[data-profile-template="${template.id}"]`)).toHaveAttribute("data-profile-preview", "true");
      expect(screen.getByRole("button", { name: `Preview ${template.name}` })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: `Read about ${template.name}` })).toBeInTheDocument();
    }
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toHaveClass("marketing-header--landing");
    expect(document.querySelectorAll("[data-landing-footer]")).toHaveLength(1);
    expect(document.querySelector('img[src="/logo.webp"]')).not.toBeInTheDocument();
  });

  it("keeps the existing template URLs, canonical, and collection schema", () => {
    renderTemplates();
    const resources = SEO_CONTENT_PAGES.filter((page) => page.kind === "template");
    for (const page of resources) expect(document.querySelector(`main a[href="${page.path}"]`)).toBeInTheDocument();
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", `${PRIMARY_ORIGIN}/templates`);
    expect(document.title).toBe(SEO_PAGES.templatesIndex.title);
    const schema = JSON.parse(document.querySelector("#jsonld-structured")!.textContent!);
    const itemList = schema["@graph"].find((item: Record<string, unknown>) => item["@type"] === "ItemList");
    expect(itemList.itemListElement.map((item: { url: string }) => item.url)).toEqual(resources.map((page) => `${PRIMARY_ORIGIN}${page.path}`));
  });

  it("filters the real layouts and restores the full catalog", () => {
    renderTemplates();
    fireEvent.click(screen.getByRole("button", { name: "Portrait-led" }));
    expect(screen.getByRole("button", { name: "Portrait-led" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("3 layouts");
    expect(Array.from(document.querySelectorAll("[data-template-card]")).map((el) => el.getAttribute("data-template-card"))).toEqual(["classic", "hero", "cutout"]);
    fireEvent.click(screen.getByRole("button", { name: "Content-first" }));
    expect(Array.from(document.querySelectorAll("[data-template-card]")).map((el) => el.getAttribute("data-template-card"))).toEqual(["compact", "banner", "visual"]);
    fireEvent.click(screen.getByRole("button", { name: "All layouts" }));
    expect(screen.getByRole("status")).toHaveTextContent("6 layouts");
  });

  it("opens an accessible preview without pretending to apply the template, and restores focus", async () => {
    renderTemplates();
    const trigger = screen.getByRole("button", { name: "Preview Classic Cover" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Classic Cover" });
    expect(within(dialog).getByRole("heading", { name: "Classic Cover" })).toHaveFocus();
    expect(within(dialog).getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/register");
    expect(within(dialog).getByText("Choose your layout in the profile editor.")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Read the layout guide" })).toHaveAttribute("href", "/templates/classic-cover");
    fireEvent.click(within(dialog).getByRole("button", { name: "Close preview" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("uses the common design tokens, responsive grid, and reduced-motion fallback", () => {
    const css = readFileSync(path.join(process.cwd(), "src/components/templates/Templates.module.css"), "utf8");
    expect(css).toContain("var(--landing-content-max-width)");
    expect(css).toContain("var(--landing-page-gutter)");
    expect(css).toContain("background: var(--landing-paper)");
    expect(css).toContain("@media (max-width: 47.99rem)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).not.toContain("overflow-x: hidden");
  });
});
