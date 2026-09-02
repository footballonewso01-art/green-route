import { StrictMode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HeroAnalyticsPreview from "@/components/landing/HeroAnalyticsPreview";
import {
  getHeroAnalyticsFrame,
  HERO_ANALYTICS_DELAY_MS,
  HERO_ANALYTICS_DURATION_MS,
  HERO_ANALYTICS_FINAL,
  HERO_CLICKS_DURATION_MS,
  HERO_COUNTRY_TICK_MS,
} from "@/lib/heroAnalyticsAnimation";

const visibility = vi.hoisted(() => ({ inView: true }));
vi.mock("framer-motion", () => ({ useInView: () => visibility.inView }));

describe("hero analytics timeline", () => {
  it("starts at 100,000 and ends the quick phase at 143,873 / 91%", () => {
    expect(getHeroAnalyticsFrame(-100)).toEqual({ clicks: 100_000, country: 85 });
    expect(getHeroAnalyticsFrame(0)).toEqual({ clicks: 100_000, country: 85 });
    expect(getHeroAnalyticsFrame(HERO_CLICKS_DURATION_MS - 1).clicks).toBeLessThan(143_873);
    expect(getHeroAnalyticsFrame(HERO_CLICKS_DURATION_MS)).toEqual({ clicks: 143_873, country: 91 });
  });

  it("holds clicks still while country ticks slowly to 92%, then 93%", () => {
    expect(getHeroAnalyticsFrame(HERO_CLICKS_DURATION_MS + HERO_COUNTRY_TICK_MS - 1)).toEqual({ clicks: 143_873, country: 91 });
    expect(getHeroAnalyticsFrame(HERO_CLICKS_DURATION_MS + HERO_COUNTRY_TICK_MS)).toEqual({ clicks: 143_873, country: 92 });
    expect(getHeroAnalyticsFrame(HERO_ANALYTICS_DURATION_MS - 1)).toEqual({ clicks: 143_873, country: 92 });
    expect(getHeroAnalyticsFrame(HERO_ANALYTICS_DURATION_MS)).toEqual(HERO_ANALYTICS_FINAL);
    expect(getHeroAnalyticsFrame(60_000)).toEqual(HERO_ANALYTICS_FINAL);
  });

  it("never decreases, overshoots, or produces fractional display values", () => {
    let previous = getHeroAnalyticsFrame(0);
    for (let time = 0; time <= 5_000; time += 7) {
      const frame = getHeroAnalyticsFrame(time);
      expect(frame.clicks).toBeGreaterThanOrEqual(previous.clicks);
      expect(frame.clicks).toBeLessThanOrEqual(143_873);
      expect(frame.country).toBeGreaterThanOrEqual(previous.country);
      expect(frame.country).toBeLessThanOrEqual(93);
      expect(Number.isInteger(frame.clicks) && Number.isInteger(frame.country)).toBe(true);
      previous = frame;
    }
  });
});

describe("hero analytics preview", () => {
  const frames = new Map<number, FrameRequestCallback>();
  const motionListeners = new Set<(event: MediaQueryListEvent) => void>();
  let frameId = 0;
  let reducedMotion = false;

  beforeEach(() => {
    frames.clear();
    motionListeners.clear();
    frameId = 0;
    reducedMotion = false;
    visibility.inView = true;
    vi.spyOn(performance, "now").mockReturnValue(0);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.set(++frameId, callback);
      return frameId;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => { frames.delete(id); });
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      get matches() { return reducedMotion; },
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_type, listener) => { motionListeners.add(listener as (event: MediaQueryListEvent) => void); },
      removeEventListener: (_type, listener) => { motionListeners.delete(listener as (event: MediaQueryListEvent) => void); },
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function frameAt(elapsed: number) {
    const callbacks = [...frames.values()];
    frames.clear();
    act(() => callbacks.forEach((callback) => callback(HERO_ANALYTICS_DELAY_MS + elapsed)));
  }

  it("runs both phases and keeps the country bar synchronized", () => {
    const { container, rerender } = render(<HeroAnalyticsPreview />);
    const bar = container.querySelector(".landing-analytics-share i");
    expect(screen.getByText("100,000")).toBeInTheDocument();
    frameAt(-1);
    expect(screen.getByText("100,000")).toBeInTheDocument();
    frameAt(800);
    expect(screen.getByText("132,904")).toBeInTheDocument();
    expect(screen.getByText("89%")).toBeInTheDocument();
    frameAt(HERO_CLICKS_DURATION_MS);
    expect(screen.getByText("143,873")).toBeInTheDocument();
    expect(screen.getByText("91%")).toBeInTheDocument();
    expect(bar).toHaveStyle({ width: "91%" });
    frameAt(HERO_CLICKS_DURATION_MS + HERO_COUNTRY_TICK_MS);
    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(bar).toHaveStyle({ width: "92%" });
    frameAt(HERO_ANALYTICS_DURATION_MS);
    expect(screen.getByText("93%")).toBeInTheDocument();
    expect(bar).toHaveStyle({ width: "93%" });
    expect(frames.size).toBe(0);
    expect(motionListeners.size).toBe(0);
    rerender(<HeroAnalyticsPreview />);
    expect(screen.getByText("143,873")).toBeInTheDocument();
    expect(frames.size).toBe(0);
  });

  it("waits for the card to appear instead of finishing offscreen", () => {
    visibility.inView = false;
    const { rerender } = render(<HeroAnalyticsPreview />);
    expect(screen.getByText("143,873")).toBeInTheDocument();
    expect(frames.size).toBe(0);
    visibility.inView = true;
    rerender(<HeroAnalyticsPreview />);
    expect(screen.getByText("100,000")).toBeInTheDocument();
    expect(frames.size).toBe(1);
  });

  it("shows final values immediately when reduced motion is enabled", () => {
    reducedMotion = true;
    render(<HeroAnalyticsPreview />);
    expect(screen.getByText("143,873")).toBeInTheDocument();
    expect(screen.getByText("93%")).toBeInTheDocument();
    expect(frames.size).toBe(0);
    expect(motionListeners.size).toBe(0);
  });

  it("stops immediately if reduced motion is enabled during playback", () => {
    render(<HeroAnalyticsPreview />);
    frameAt(500);
    act(() => motionListeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent)));
    expect(screen.getByText("143,873")).toBeInTheDocument();
    expect(screen.getByText("93%")).toBeInTheDocument();
    expect(frames.size).toBe(0);
  });

  it("cancels pending frames and listeners on unmount", () => {
    const { unmount } = render(<HeroAnalyticsPreview />);
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
    expect(motionListeners.size).toBe(0);
  });

  it("works in StrictMode and completes after a long suspended frame", () => {
    render(<StrictMode><HeroAnalyticsPreview /></StrictMode>);
    expect(frames.size).toBe(1);
    frameAt(30_000);
    expect(screen.getByText("143,873")).toBeInTheDocument();
    expect(screen.getByText("93%")).toBeInTheDocument();
    expect(frames.size).toBe(0);
  });

  it("keeps screen-reader labels stable instead of announcing each animation frame", () => {
    render(<HeroAnalyticsPreview />);
    expect(screen.getByRole("definition", { name: "143,873 tracked visits" })).toBeInTheDocument();
    expect(screen.getByRole("definition", { name: "93% USA" })).toBeInTheDocument();
    expect(screen.getByText("100,000")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByLabelText("Example analytics snapshot")).toHaveAttribute("aria-live", "off");
  });

  it("prerenders the final example for no-JS visitors", () => {
    const html = renderToStaticMarkup(<HeroAnalyticsPreview />);
    expect(html).toContain("143,873</strong>");
    expect(html).toContain("93%</strong>");
    expect(frames.size).toBe(0);
  });
});
