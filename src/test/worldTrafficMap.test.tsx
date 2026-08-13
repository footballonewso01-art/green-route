import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WorldTrafficMap from "@/components/analytics/WorldTrafficMap";
import {
  getCountryTrafficIntensity,
  isWorldAtlasCountryCode,
  resolveWorldAtlasCountryCode,
} from "@/components/analytics/worldTrafficMapUtils";
import { getCountryDisplayName, normalizeCountryCode } from "@/lib/countryFormatting";

describe("world traffic map", () => {
  it("maps atlas identifiers and normalizes analytics country codes", () => {
    expect(resolveWorldAtlasCountryCode("840")).toBe("US");
    expect(resolveWorldAtlasCountryCode(40)).toBe("AT");
    expect(resolveWorldAtlasCountryCode(undefined)).toBeNull();
    expect(isWorldAtlasCountryCode("US")).toBe(true);
    expect(isWorldAtlasCountryCode("ZZ")).toBe(false);
    expect(normalizeCountryCode(" us ")).toBe("US");
    expect(normalizeCountryCode("Unknown")).toBeNull();
    expect(getCountryDisplayName("DE")).toBe("Germany");
  });

  it("keeps low-volume countries visible without overstating the leader", () => {
    const low = getCountryTrafficIntensity(1, 10_000);
    const medium = getCountryTrafficIntensity(100, 10_000);
    const high = getCountryTrafficIntensity(10_000, 10_000);

    expect(getCountryTrafficIntensity(0, 10_000)).toBe(0);
    expect(low).toBeGreaterThan(0);
    expect(medium).toBeGreaterThan(low);
    expect(high).toBe(1);
  });

  it("shows exact click counts on hover and keeps a clicked country pinned", () => {
    render(
      <WorldTrafficMap
        countries={[
          { code: "US", clicks: 12, pct: 80 },
          { code: "DE", clicks: 3, pct: 20 },
        ]}
      />,
    );

    const unitedStates = screen.getByRole("button", { name: "United States, 12 clicks" });
    fireEvent.mouseEnter(unitedStates, { clientX: 240, clientY: 140 });
    expect(screen.getByRole("status")).toHaveTextContent("United States");
    expect(screen.getByRole("status")).toHaveTextContent("12 clicks");

    fireEvent.click(unitedStates, { clientX: 240, clientY: 140 });
    fireEvent.mouseLeave(unitedStates);
    expect(screen.getByRole("status")).toHaveTextContent("United States");

    fireEvent.keyDown(unitedStates, { key: "Escape" });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("supports explicit zoom controls and restores the default view", () => {
    render(<WorldTrafficMap countries={[]} />);

    const transform = screen.getByTestId("world-map-transform");
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    const zoomOut = screen.getByRole("button", { name: "Zoom out" });
    const reset = screen.getByRole("button", { name: "Reset map view" });

    expect(transform).toHaveAttribute("transform", expect.stringContaining("scale(1)"));
    expect(zoomOut).toBeDisabled();
    expect(reset).toBeDisabled();

    fireEvent.click(zoomIn);
    expect(transform).toHaveAttribute("transform", expect.stringContaining("scale(1.35)"));
    expect(zoomOut).toBeEnabled();
    expect(reset).toBeEnabled();

    fireEvent.click(reset);
    expect(transform).toHaveAttribute("transform", expect.stringContaining("scale(1)"));
    expect(reset).toBeDisabled();
  });

  it("zooms with the mouse wheel while the cursor is inside the map", () => {
    render(<WorldTrafficMap countries={[]} />);

    const map = screen.getByRole("group", { name: /interactive world map/i });
    const transform = screen.getByTestId("world-map-transform");

    fireEvent.wheel(map, { deltaY: -100 });
    expect(transform).toHaveAttribute("transform", expect.stringContaining("scale(1.22)"));
  });

  it("fills ultra-wide canvases without stretching the map on narrower screens", () => {
    render(<WorldTrafficMap countries={[]} />);

    const map = screen.getByRole("group", { name: /interactive world map/i });
    const canvas = map.parentElement as HTMLDivElement;
    Object.defineProperty(canvas, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        width: 1600,
        height: 500,
        top: 0,
        right: 1600,
        bottom: 500,
        left: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    fireEvent(window, new Event("resize"));
    expect(map).toHaveAttribute("preserveAspectRatio", "xMidYMid slice");
  });
});
