import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import LandingFeatures from "@/components/landing/LandingFeatures";

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const ignored = new Set(["initial", "whileInView", "viewport", "transition"]);
  const staticMotion = (tag: string) => (props: Record<string, unknown>) =>
    React.createElement(tag, Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))));
  return {
    motion: { header: staticMotion("header"), article: staticMotion("article"), span: staticMotion("span") },
    useReducedMotion: () => true,
  };
});

const landingSource = readFileSync(path.join(process.cwd(), "src/pages/LandingPage.tsx"), "utf8");
const featureSource = readFileSync(path.join(process.cwd(), "src/components/landing/LandingFeatures.tsx"), "utf8");
const featureStyles = readFileSync(path.join(process.cwd(), "src/components/landing/LandingFeatures.module.css"), "utf8");

afterEach(cleanup);

function renderFeatures() {
  return render(<MemoryRouter><LandingFeatures /></MemoryRouter>);
}

describe("rebranded landing features", () => {
  it("replaces the old section between social proof and pricing while preserving its anchor", () => {
    expect(landingSource.indexOf("<LandingFeatures />")).toBeGreaterThan(landingSource.indexOf("<LandingSocialProof />"));
    expect(landingSource.indexOf("<LandingFeatures />")).toBeLessThan(landingSource.indexOf("<LandingPricing"));
    expect(landingSource).not.toContain('src="/features.min.mp4"');
    expect(landingSource).not.toContain("const features = [");
    renderFeatures();
    expect(document.querySelectorAll("#features")).toHaveLength(1);
  });

  it("renders exactly five feature cards and real internal navigation", () => {
    renderFeatures();
    expect(document.querySelectorAll("[data-feature-card]")).toHaveLength(5);
    expect(screen.getByRole("link", { name: "Explore features" })).toHaveAttribute("href", "/features");
    expect(screen.getByRole("link", { name: "Find your style" })).toHaveAttribute("href", "/templates");
    expect(screen.getByRole("heading", { name: "Beyond the in-app browser." })).toBeInTheDocument();
    expect(screen.getByText(/supported social apps/)).toBeInTheDocument();
    expect(screen.getByText("Deep customization")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your style. Every detail." })).toBeInTheDocument();
  });

  it("offsets the existing features anchor by the section padding below the floating header", () => {
    expect(landingSource).toMatch(/href="#features">\s*Explore the platform/);
    expect(featureStyles).toContain("--features-top-space: clamp(3.75rem, 6vw, 6rem)");
    expect(featureStyles).toContain("padding: var(--features-top-space)");
    expect(featureStyles).toContain("scroll-margin-top: calc(6rem - var(--features-top-space))");
  });

  it("explains routing rules and traffic trends instead of repeating the hero promises", () => {
    renderFeatures();
    expect(screen.getByRole("heading", { name: "Route by country or device." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "See how your traffic changes." })).toBeInTheDocument();
    expect(screen.getByText(/Keep one shared URL/)).toBeInTheDocument();
    expect(screen.getByText(/Follow link clicks and profile views day by day/)).toBeInTheDocument();
    expect(screen.queryByText("See which links earn the next tap.")).not.toBeInTheDocument();
    expect(landingSource).toContain("Right visitor. Right destination.");
    expect(landingSource).toContain("Know what converts.");
  });

  it("switches the illustrative routing conditions without navigating or sending traffic", () => {
    renderFeatures();
    const controls = within(screen.getByRole("group", { name: "Routing example type" }));
    expect(controls.getAllByRole("button").map((button) => button.textContent)).toEqual(["Country", "Device"]);
    expect(controls.getByRole("button", { name: "Country" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("Everyone else")).toBeInTheDocument();
    expect(screen.queryByText("Mobile landing page")).not.toBeInTheDocument();
    fireEvent.click(controls.getByRole("button", { name: "Device" }));
    expect(controls.getByRole("button", { name: "Device" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Mobile landing page")).toBeInTheDocument();
    expect(screen.queryByText("United States")).not.toBeInTheDocument();
    fireEvent.click(controls.getByRole("button", { name: "Country" }));
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("linktery.com/launch")).not.toHaveAttribute("href");
  });

  it("updates the chart and total together, with explicit sample-data labeling", () => {
    renderFeatures();
    expect(screen.getByText("Example data")).toBeInTheDocument();
    expect(screen.getByText("12,486")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Profile views" }));
    expect(screen.getByText("1,812")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Example: 1,812 profile views across 14 days." }).children).toHaveLength(14);
    expect(screen.getByRole("button", { name: "Profile views" })).toHaveAttribute("aria-pressed", "true");
  });

  it("uses local, lazy-loaded profile images with reserved dimensions", () => {
    renderFeatures();
    const images = document.querySelectorAll('[data-feature-card="profiles"] img');
    expect(images).toHaveLength(3);
    images.forEach((image) => {
      expect(image).toHaveAttribute("loading", "lazy");
      expect(image).toHaveAttribute("width", "420");
      expect(image).toHaveAttribute("height", "840");
    });
    expect(featureSource).not.toContain("https://");
    const fanImageStyles = featureStyles.match(/\.profileFan img\s*\{([^}]+)\}/)?.[1];
    expect(fanImageStyles).toContain("height: auto");
    expect(fanImageStyles).toContain("aspect-ratio: 1 / 2");
    expect(fanImageStyles).not.toContain("height: 100%");
  });

  it("shows the deeplink journey with a local illustration and clear destination labels", () => {
    renderFeatures();
    const illustration = screen.getByRole("img", { name: "An emerald arrow connects a social app to a full browser window." });
    expect(illustration).toHaveAttribute("loading", "lazy");
    expect(illustration).toHaveAttribute("width", "800");
    expect(illustration).toHaveAttribute("height", "400");
    expect(screen.getByText("Social app")).toBeInTheDocument();
    expect(screen.getByText("External browser")).toBeInTheDocument();
  });

  it("shares the landing container and palette and explicitly adapts the bento grid", () => {
    expect(featureStyles).toContain("width: min(100%, var(--landing-content-max-width))");
    expect(featureStyles).toContain("var(--landing-page-gutter)");
    expect(featureStyles).toContain("background: var(--landing-paper)");
    expect(featureStyles).toContain("grid-template-columns: repeat(10, minmax(0, 1fr))");
    expect(featureStyles).toContain("@media (max-width: 47.99rem)");
    expect(featureStyles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(featureSource).toContain("useReducedMotion");
    expect(featureSource).not.toMatch(/fetch\(|setInterval\(|window\.addEventListener\(/);
  });
});
