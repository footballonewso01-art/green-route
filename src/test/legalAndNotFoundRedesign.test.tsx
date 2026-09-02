import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";
import NotFound from "@/pages/NotFound";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsAndConditions from "@/pages/TermsAndConditions";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const ignored = new Set(["initial", "whileInView", "viewport", "transition"]);
  const staticMotion = (tag: string) => (props: Record<string, unknown>) =>
    React.createElement(tag, Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))));
  return { motion: { div: staticMotion("div"), section: staticMotion("section") }, useReducedMotion: () => true };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.head.querySelectorAll('meta, link[rel="canonical"], script[type="application/ld+json"]').forEach((node) => node.remove());
});

const privacyHeadings = [
  "1. Personal Information We Collect",
  "2. Cookies & Tracking Technologies",
  "3. How We Use Your Information",
  "4. Legal Bases for Processing (EEA/UK)",
  "5. How We Share Information",
  "6. No Sale of Personal Information",
  "8. Your Privacy Rights",
  "9. Data Retention",
  "10. Security",
  "Contact Us",
];

const termsHeadings = [
  "1. Acceptance of Terms",
  "2. Changes to Terms",
  "3. Changes to Platform",
  "4. Account Registration & Security",
  "5. User Content",
  "6. Content Standards",
  "11. Fees & Payments",
  "13. Limitation of Liability",
  "19. Governing Law",
  "22. Entire Agreement",
  "Contact Us",
];

describe("legal page redesign", () => {
  it.each([
    { path: "/privacy", key: "privacy", title: "Privacy Policy", component: <PrivacyPolicy />, headings: privacyHeadings, contentsLabel: "Privacy Policy contents", counterpartPath: "/terms" },
    { path: "/terms", key: "terms", title: "Terms & Conditions", component: <TermsAndConditions />, headings: termsHeadings, contentsLabel: "Terms & Conditions contents", counterpartPath: "/privacy" },
  ])("renders $path as a readable landing document without changing its section sequence", ({ path: route, key, title, component, headings, contentsLabel, counterpartPath }) => {
    render(<MemoryRouter initialEntries={[route]}>{component}</MemoryRouter>);
    expect(document.querySelector(`[data-legal-page="${key}"]`)).toBeInTheDocument();
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText(/Effective Date:/)).toHaveTextContent("Effective Date: March 2, 2026");
    expect(screen.getAllByRole("heading", { level: 2 }).filter((heading) => headings.includes(heading.textContent ?? "")).map((heading) => heading.textContent)).toEqual(headings);
    const contents = screen.getByRole("navigation", { name: contentsLabel });
    const anchors = within(contents).getAllByRole("link");
    expect(anchors).toHaveLength(11);
    for (const anchor of anchors) expect(document.getElementById(anchor.getAttribute("href")!.slice(1))).toBeInTheDocument();
    expect(document.querySelector(`aside a[href="${counterpartPath}"]`)).toBeInTheDocument();
    expect(JSON.parse(document.getElementById("jsonld-structured")?.textContent || "{}")).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Home", item: PRIMARY_ORIGIN },
        { position: 2, name: title, item: `${PRIMARY_ORIGIN}${route}` },
      ],
    });
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toHaveClass("marketing-header--landing");
    expect(document.querySelectorAll("[data-landing-footer]")).toHaveLength(1);
    expect(document.querySelector('img[src="/logo.webp"]')).not.toBeInTheDocument();
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", `${PRIMARY_ORIGIN}${route}`);
    expect(document.querySelector('meta[name="robots"]')).not.toBeInTheDocument();
  });

  it("preserves the existing policy and terms commitments as written", () => {
    const privacy = render(<MemoryRouter><PrivacyPolicy /></MemoryRouter>);
    expect(screen.getByText(/where Linktery acts as a data controller/)).toBeInTheDocument();
    expect(screen.getByText(/We do not sell your personal information for monetary value/)).toBeInTheDocument();
    expect(screen.getByText(/though no system is completely secure/)).toBeInTheDocument();
    privacy.unmount();
    render(<MemoryRouter><TermsAndConditions /></MemoryRouter>);
    expect(screen.getByText(/Refunds may be requested within 14 days of purchase/)).toBeInTheDocument();
    expect(screen.getByText(/Our total liability is limited to \$100 USD/)).toBeInTheDocument();
    expect(screen.getByText(/courts located in Delaware/)).toBeInTheDocument();
  });

  it("scopes its document layout to landing tokens and responsive reading rules", () => {
    const css = readFileSync(path.join(process.cwd(), "src/components/legal/LegalPage.module.css"), "utf8");
    expect(css).toContain("var(--landing-content-max-width)");
    expect(css).toContain("var(--landing-page-gutter)");
    expect(css).toContain("background: var(--landing-paper)");
    expect(css).toContain("position: sticky");
    expect(css).toContain("@media (max-width: 47.99rem)");
    expect(css).not.toMatch(/overflow-x:\s*(hidden|clip)/);
  });
});

describe("not found redesign", () => {
  it("provides one concise recovery screen and remains noindex", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<MemoryRouter initialEntries={["/missing-page"]}><NotFound /></MemoryRouter>);
    expect(document.querySelector("[data-not-found]")).toBeInTheDocument();
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "404" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "This address doesn’t lead anywhere." })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toHaveClass("marketing-header--landing");
    const routes = screen.getByRole("complementary", { name: "Useful destinations" });
    expect(within(routes).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/", "/features", "/documentation"]);
    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");
    expect(document.querySelectorAll("[data-landing-footer]")).toHaveLength(0);
    expect(document.querySelector('img[src="/logo.webp"]')).not.toBeInTheDocument();
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", `${PRIMARY_ORIGIN}/404`);
    expect(console.error).toHaveBeenCalledWith("404 Error: User attempted to access non-existent route:", "/missing-page");
  });
});
