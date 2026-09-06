import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const { userState, trackGrowthEvent } = vi.hoisted(() => ({
  userState: { current: null as null | { plan?: string } },
  trackGrowthEvent: vi.fn(),
}));

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const ignored = new Set(["initial", "whileInView", "viewport", "transition"]);
  const staticMotion = (tag: string) => (props: Record<string, unknown>) => React.createElement(
    tag,
    Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))),
  );
  return { motion: { div: staticMotion("div"), header: staticMotion("header") }, useReducedMotion: () => true };
});
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: userState.current }) }));
vi.mock("@/lib/pocketbase", () => ({ pb: { files: { getUrl: vi.fn() } } }));
vi.mock("@/lib/telemetry", () => ({ trackGrowthEvent, trackMarketingPageView: vi.fn() }));

import PricingPage from "@/pages/PricingPage";

afterEach(() => {
  cleanup();
  userState.current = null;
  trackGrowthEvent.mockClear();
  sessionStorage.clear();
  document.head.querySelectorAll('meta, link[rel="canonical"], script[type="application/ld+json"]').forEach((node) => node.remove());
});

function renderPage() {
  return render(<MemoryRouter initialEntries={["/pricing"]}><PricingPage /></MemoryRouter>);
}

describe("standalone pricing redesign", () => {
  it("uses the landing pricing, header and footer with one semantic page heading", () => {
    renderPage();
    expect(document.querySelector("[data-pricing-page]")).toBeInTheDocument();
    expect(document.querySelector("[data-landing-pricing]")).toBeInTheDocument();
    expect(document.querySelector("[data-landing-footer]")).toBeInTheDocument();
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Start free. Add power when you need it." })).toBeInTheDocument();
    const primary = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(primary).toHaveClass("marketing-header--landing");
    expect(within(primary).getByRole("link", { name: "Pricing" })).toHaveAttribute("aria-current", "page");
    expect(within(primary).getByRole("link", { name: "Features" })).toHaveAttribute("href", "/features");
    expect(JSON.parse(document.getElementById("jsonld-structured")?.textContent || "{}")).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Home", item: "https://linktery.com" },
        { position: 2, name: "Pricing", item: "https://linktery.com/pricing" },
      ],
    });
  });

  it("keeps the canonical plan catalog, annual prices and guest actions", () => {
    renderPage();
    expect(screen.getByText("2 Custom Domains")).toBeInTheDocument();
    expect(screen.getByText("10 Custom Domains")).toBeInTheDocument();
    expect(screen.getAllByText("API Access", { selector: "li span:last-child" })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /Annual/ }));
    expect(screen.getByLabelText("Creator Pro: 9 US dollars per month")).toBeInTheDocument();
    expect(screen.getByLabelText("Agency: 24 US dollars per month")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get started free" })).toHaveAttribute("href", "/register");
  });

  it("preserves authenticated current-plan and upgrade behavior", () => {
    userState.current = { plan: "pro" };
    renderPage();
    expect(screen.getByRole("button", { name: "Your current plan" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Included in your plan" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Choose Agency" })).toHaveAttribute("href", "/dashboard/pricing");
  });

  it("tracks only the first pricing view in a session", () => {
    const first = renderPage();
    expect(trackGrowthEvent).toHaveBeenCalledTimes(1);
    first.unmount();
    renderPage();
    expect(trackGrowthEvent).toHaveBeenCalledTimes(1);
  });
});
