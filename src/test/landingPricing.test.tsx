import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import LandingPricing from "@/components/landing/LandingPricing";

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const ignored = new Set(["initial", "whileInView", "viewport", "transition"]);
  const staticMotion = (tag: string) => (props: Record<string, unknown>) => React.createElement(
    tag,
    Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))),
  );
  return { motion: { div: staticMotion("div"), header: staticMotion("header") }, useReducedMotion: () => true };
});

afterEach(cleanup);

function renderPricing(props: { authenticated?: boolean; currentPlan?: "creator" | "pro" | "agency" } = {}) {
  return render(
    <MemoryRouter>
      <LandingPricing authenticated={props.authenticated ?? false} currentPlan={props.currentPlan} />
    </MemoryRouter>,
  );
}

describe("landing pricing", () => {
  it("renders the current product plans and their real allowances", () => {
    renderPricing();
    expect(screen.queryByText("Simple, transparent pricing")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Creator" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Creator Pro" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Agency" })).toBeInTheDocument();
    expect(screen.getByText("2 Custom Domains")).toBeInTheDocument();
    expect(screen.getByText("10 Custom Domains")).toBeInTheDocument();
    expect(screen.getByText("A/B Testing (Unlimited)")).toBeInTheDocument();
    expect(screen.getByText("Everything in Creator Pro")).toBeInTheDocument();
  });

  it("switches between monthly and annual prices without changing the free plan", () => {
    renderPricing();
    expect(screen.getByLabelText("Creator Pro: 11 US dollars per month")).toBeInTheDocument();
    expect(screen.getByLabelText("Agency: 29 US dollars per month")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Annual/ }));
    expect(screen.getByLabelText("Creator: 0 US dollars per month")).toBeInTheDocument();
    expect(screen.getByLabelText("Creator Pro: 9 US dollars per month")).toBeInTheDocument();
    expect(screen.getByLabelText("Agency: 24 US dollars per month")).toBeInTheDocument();
    expect(screen.getByText("$108 billed annually")).toBeInTheDocument();
    expect(screen.getByText("$288 billed annually")).toBeInTheDocument();
  });

  it("preserves current-plan and downgrade behavior for signed-in customers", () => {
    renderPricing({ authenticated: true, currentPlan: "agency" });
    expect(screen.getByRole("button", { name: "Your current plan" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Included in your plan" })).toHaveLength(2);
    expect(screen.queryByRole("link", { name: /Choose/ })).not.toBeInTheDocument();
  });

  it("sends guests to registration and exposes one clear action per card", () => {
    renderPricing();
    expect(screen.getByRole("link", { name: /Get started free/ })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: /Choose Creator Pro/ })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: /Choose Agency/ })).toHaveAttribute("href", "/register");
  });
});
