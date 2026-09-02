import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LandingTestimonials, { TestimonialSection } from "@/components/landing/LandingTestimonials";
import { getLandingTestimonials, type LandingTestimonial } from "@/data/landingTestimonials";

const { reduceMotionMock, motionProps } = vi.hoisted(() => ({ reduceMotionMock: vi.fn(() => true), motionProps: [] as Record<string, unknown>[] }));
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const ignored = new Set(["initial", "whileInView", "viewport", "transition"]);
  const staticMotion = (tag: string) => (props: Record<string, unknown>) => {
    motionProps.push(props);
    return React.createElement(tag, Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))));
  };
  return { motion: { div: staticMotion("div"), header: staticMotion("header") }, useReducedMotion: reduceMotionMock };
});

const entries: readonly LandingTestimonial[] = Array.from({ length: 4 }, (_, index) => ({
  id: `test-${index}`,
  quote: `Quotation fixture ${index + 1}.`,
  author: `Test Author ${index + 1}`,
  role: "Test role",
}));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  reduceMotionMock.mockReturnValue(true);
  motionProps.length = 0;
});

function mockMobileGeometry() {
  const viewport = screen.getByRole("region", { name: "Customer testimonials" });
  Object.defineProperties(viewport, { clientWidth: { value: 300, configurable: true }, scrollWidth: { value: 1200, configurable: true } });
  viewport.querySelectorAll<HTMLElement>("[data-testimonial-item]").forEach((card, index) => {
    Object.defineProperty(card, "offsetLeft", { value: index * 300, configurable: true });
  });
  const scrollTo = vi.fn(({ left }: ScrollToOptions) => {
    viewport.scrollLeft = Math.min(900, Math.max(0, left ?? 0));
    fireEvent.scroll(viewport);
  });
  Object.defineProperty(viewport, "scrollTo", { value: scrollTo, configurable: true });
  fireEvent(window, new Event("resize"));
  return { viewport, scrollTo };
}

describe("landing testimonials", () => {
  it("inserts the new section after Features and before Pricing without rebuilding the landing", () => {
    const source = readFileSync(path.join(process.cwd(), "src/pages/LandingPage.tsx"), "utf8");
    const position = source.indexOf("<LandingTestimonials />");
    expect(position).toBeGreaterThan(source.indexOf("<LandingFeatures />"));
    expect(position).toBeLessThan(source.indexOf("<LandingPricing"));
  });

  it("renders the four supplied customer testimonials without preview labeling", () => {
    render(<LandingTestimonials />);
    expect(document.querySelectorAll("[data-testimonial-item]")).toHaveLength(4);
    expect(screen.getByText("Sarah Bennett")).toBeInTheDocument();
    expect(screen.getByText("Marcus Thompson")).toBeInTheDocument();
    expect(screen.getByText("Anastasia Klyuchkova")).toBeInTheDocument();
    expect(screen.queryByText("Elena Volkova")).not.toBeInTheDocument();
    expect(screen.getByText("James Carter")).toBeInTheDocument();
    expect(screen.queryByText(/Design preview/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sample copy/)).not.toBeInTheDocument();
    expect(document.querySelectorAll("img")).toHaveLength(4);
    const testimonialImageSources = Array.from(document.querySelectorAll("img"), (image) => image.getAttribute("src"));
    expect(testimonialImageSources.some((source) => source?.includes("testimonial-sarah-bennett"))).toBe(true);
    expect(testimonialImageSources.some((source) => source?.includes("testimonial-marcus-thompson"))).toBe(true);
    expect(testimonialImageSources.some((source) => source?.includes("testimonial-elena-volkova"))).toBe(true);
    expect(testimonialImageSources.some((source) => source?.includes("testimonial-james-carter"))).toBe(true);
    expect(document.querySelector('script[type="application/ld+json"]')).not.toBeInTheDocument();
  });

  it("renders the supplied testimonials in release builds", () => {
    vi.stubEnv("DEV", false);
    expect(getLandingTestimonials().items).toHaveLength(4);
    const { container } = render(<LandingTestimonials />);
    expect(container.querySelectorAll("[data-testimonial-item]")).toHaveLength(4);
    expect(screen.getByText("Content creator, 180k followers")).toBeInTheDocument();
    expect(screen.getByText("Anastasia Klyuchkova")).toBeInTheDocument();
  });

  it("renders semantic quotations and attribution without changing the supplied wording", () => {
    render(<TestimonialSection items={entries} />);
    expect(document.querySelectorAll("blockquote")).toHaveLength(4);
    entries.forEach((entry) => {
      expect(screen.getByText(entry.quote)).toBeInTheDocument();
      expect(screen.getByText(entry.author)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Design preview/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next testimonial" })).not.toBeInTheDocument();
  });

  it("moves through mobile cards manually and disables controls at both ends", () => {
    render(<TestimonialSection items={entries} />);
    const { viewport, scrollTo } = mockMobileGeometry();
    expect(screen.getByRole("button", { name: "Previous testimonial" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next testimonial" }));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 300, behavior: "auto" });
    expect(screen.getByRole("status")).toHaveTextContent("Showing testimonial 2 of 4: Test Author 2.");
    fireEvent.click(screen.getByRole("button", { name: "Next testimonial" }));
    fireEvent.click(screen.getByRole("button", { name: "Next testimonial" }));
    expect(viewport.scrollLeft).toBe(900);
    expect(screen.getByRole("button", { name: "Next testimonial" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous testimonial" })).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous testimonial" }));
    expect(viewport.scrollLeft).toBe(600);
  });

  it("supports arrow keys on the carousel and updates after touch/native scrolling", () => {
    render(<TestimonialSection items={entries} />);
    const { viewport } = mockMobileGeometry();
    expect(viewport).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(viewport, { key: "ArrowRight" });
    expect(viewport.scrollLeft).toBe(300);
    fireEvent.keyDown(viewport, { key: "ArrowLeft" });
    expect(viewport.scrollLeft).toBe(0);
    viewport.scrollLeft = 900;
    fireEvent.scroll(viewport);
    expect(screen.getByRole("button", { name: "Next testimonial" })).toBeDisabled();
    fireEvent.keyDown(viewport, { key: "ArrowRight" });
    expect(viewport.scrollLeft).toBe(900);
  });

  it("uses an initials fallback when an approved author's avatar cannot load", () => {
    render(<TestimonialSection items={[{ ...entries[0], avatarUrl: "/test-portrait.webp", sourceUrl: "https://example.com/review" }]} />);
    const avatar = document.querySelector("img")!;
    expect(avatar).toHaveAttribute("loading", "lazy");
    fireEvent.error(avatar);
    expect(document.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText("TA")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Test Author 1" })).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByRole("link", { name: /Share your experience/ })).not.toBeInTheDocument();
  });

  it("centers the heading and removes the share CTA", () => {
    render(<TestimonialSection items={entries} isPreview />);
    expect(screen.queryByText("Share your experience")).not.toBeInTheDocument();
    const css = readFileSync(path.join(process.cwd(), "src/components/landing/LandingTestimonials.module.css"), "utf8");
    const header = css.match(/\.header\s*\{([^}]+)\}/)?.[1];
    expect(header).toContain("justify-content: center");
    expect(header).toContain("text-align: center");
    expect(css).toContain("margin: .9rem auto 0");
  });

  it("reveals the heading and cards once on scroll without overriding the card tilt", () => {
    reduceMotionMock.mockReturnValue(false);
    render(<TestimonialSection items={entries} />);
    const cards = motionProps.filter((props) => "data-testimonial-item" in props);
    expect(cards).toHaveLength(4);
    cards.forEach((props, index) => {
      expect(props.initial).toEqual({ opacity: 0, y: 22 });
      expect(props.whileInView).toEqual({ opacity: 1, y: 0 });
      expect(props.viewport).toEqual({ once: true, amount: 0.15 });
      expect(props.transition).toMatchObject({ duration: 0.6, delay: index * 0.07 });
    });
    const slot = document.querySelector("[data-testimonial-item]")!;
    expect(slot.tagName).toBe("DIV");
    expect(slot.querySelector("article")).toBeInTheDocument();
  });

  it("does not hide content or animate entry when reduced motion is requested", () => {
    render(<TestimonialSection items={entries} />);
    expect(motionProps.length).toBeGreaterThan(0);
    motionProps.forEach((props) => {
      expect(props.initial).toBe(false);
      expect(props.transition).toMatchObject({ duration: 0 });
    });
  });

  it("shares the landing tokens and has no auto-play, new fonts, or global resets", () => {
    const source = readFileSync(path.join(process.cwd(), "src/components/landing/LandingTestimonials.tsx"), "utf8");
    const css = readFileSync(path.join(process.cwd(), "src/components/landing/LandingTestimonials.module.css"), "utf8");
    expect(source).not.toMatch(/setInterval|setTimeout|useScroll|fetch\(/);
    expect(css).toContain("var(--landing-content-max-width)");
    expect(css).toContain("var(--landing-page-gutter)");
    expect(css).toContain("background: var(--landing-paper)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("scroll-snap-type: x mandatory");
    expect(css).toContain("--testimonial-overlap");
    expect(css).toContain("testimonial-card-settle");
    expect(css).toContain(".cardSlot:hover, .cardSlot:focus-within { z-index: 20; }");
    expect(css).not.toMatch(/(?:^|\n)(?:body|html|\*)\s*\{/);
    expect(css).not.toContain("fonts.googleapis.com");
  });
});
