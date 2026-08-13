import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
} from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import { feature as topologyFeature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldTopology from "world-atlas/countries-110m.json";
import { Globe2, Minus, Plus, RotateCcw } from "lucide-react";
import { getCountryDisplayName, normalizeCountryCode } from "@/lib/countryFormatting";
import {
  getCountryTrafficIntensity,
  isWorldAtlasCountryCode,
  resolveWorldAtlasCountryCode,
} from "@/components/analytics/worldTrafficMapUtils";

export interface CountryTrafficDatum {
  code: string;
  clicks: number;
  pct?: number;
}

interface WorldTrafficMapProps {
  countries: CountryTrafficDatum[];
  metric?: "clicks" | "views";
}

interface TooltipPoint {
  x: number;
  y: number;
}

interface MapPoint {
  x: number;
  y: number;
}

interface MapView extends MapPoint {
  zoom: number;
}

interface DragState {
  pointerId: number;
  origin: MapPoint;
  clientOrigin: MapPoint;
  view: MapView;
}

interface WorldAtlasProperties extends GeoJsonProperties {
  name?: string;
}

type WorldFeature = Feature<Geometry, WorldAtlasProperties>;

const MAP_WIDTH = 960;
const MAP_HEIGHT = 390;
const MAP_ASPECT_RATIO = MAP_WIDTH / MAP_HEIGHT;
const MAP_CENTER = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
const MAP_HORIZONTAL_PADDING = 24;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DEFAULT_VIEW: MapView = { x: 0, y: 0, zoom: MIN_ZOOM };

const topology = worldTopology as unknown as Topology<{
  countries: GeometryCollection<WorldAtlasProperties>;
}>;
const geographyCollection = topologyFeature(
  topology,
  topology.objects.countries,
) as FeatureCollection<Geometry, WorldAtlasProperties>;
const worldFeatures = geographyCollection.features.filter(
  (geography) => resolveWorldAtlasCountryCode(geography.id) !== "AQ",
) as WorldFeature[];
const projection = geoMercator()
  .scale((MAP_WIDTH - MAP_HORIZONTAL_PADDING * 2) / (2 * Math.PI))
  .center([0, 10])
  .translate([MAP_CENTER.x, MAP_CENTER.y])
  .precision(0.2);
const pathGenerator = geoPath(projection);
const worldPaths = worldFeatures.map((geography) => ({
  geography,
  path: pathGenerator(geography) || "",
}));

function trafficLabel(count: number, metric: "clicks" | "views"): string {
  const singular = metric === "views" ? "view" : "click";
  return `${count.toLocaleString()} ${count === 1 ? singular : metric}`;
}

function clampView(view: MapView): MapView {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom));
  const xLimit = MAP_WIDTH * (0.08 + (zoom - MIN_ZOOM) * 0.5);
  const yLimit = MAP_HEIGHT * (0.75 + (zoom - MIN_ZOOM) * 0.5);

  return {
    zoom,
    x: Math.min(xLimit, Math.max(-xLimit, view.x)),
    y: Math.min(yLimit, Math.max(-yLimit, view.y)),
  };
}

export default function WorldTrafficMap({ countries, metric = "clicks" }: WorldTrafficMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const titleId = useId();
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [pinnedCode, setPinnedCode] = useState<string | null>(null);
  const [tooltipPoint, setTooltipPoint] = useState<TooltipPoint>({ x: 160, y: 96 });
  const [view, setView] = useState<MapView>(DEFAULT_VIEW);
  const [isDragging, setIsDragging] = useState(false);
  const [fillWideCanvas, setFillWideCanvas] = useState(false);

  const trafficByCode = useMemo(() => {
    const result = new Map<string, CountryTrafficDatum>();
    countries.forEach((country) => {
      const code = normalizeCountryCode(country.code);
      const clicks = Number(country.clicks || 0);
      if (!code || code === "AQ" || !isWorldAtlasCountryCode(code) || clicks <= 0) return;
      const existing = result.get(code);
      result.set(code, {
        code,
        clicks: clicks + (existing?.clicks || 0),
        pct: Number(country.pct || 0) + (existing?.pct || 0),
      });
    });
    return result;
  }, [countries]);

  const maxClicks = useMemo(
    () => Math.max(0, ...Array.from(trafficByCode.values(), (country) => country.clicks)),
    [trafficByCode],
  );
  const selectedCode = hoveredCode || pinnedCode;
  const selectedCountry = selectedCode ? trafficByCode.get(selectedCode) : undefined;
  const hasCustomView = view.zoom !== DEFAULT_VIEW.zoom || view.x !== 0 || view.y !== 0;

  useEffect(() => {
    if (pinnedCode && !trafficByCode.has(pinnedCode)) setPinnedCode(null);
  }, [pinnedCode, trafficByCode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateFillMode = () => {
      const { width, height } = map.getBoundingClientRect();
      setFillWideCanvas(width > 0 && height > 0 && width / height > MAP_ASPECT_RATIO);
    };

    updateFillMode();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateFillMode);
      return () => window.removeEventListener("resize", updateFillMode);
    }

    const observer = new ResizeObserver(updateFillMode);
    observer.observe(map);
    return () => observer.disconnect();
  }, []);

  const clearSelection = useCallback(() => {
    setHoveredCode(null);
    setPinnedCode(null);
  }, []);

  const pointFromClient = (clientX: number, clientY: number): TooltipPoint => {
    const bounds = mapRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return tooltipPoint;
    return {
      x: Math.min(Math.max(clientX - bounds.left, 88), Math.max(88, bounds.width - 88)),
      y: Math.min(Math.max(clientY - bounds.top, 76), Math.max(76, bounds.height - 12)),
    };
  };

  const mapPointFromClient = useCallback((clientX: number, clientY: number): MapPoint => {
    const svg = svgRef.current;
    if (!svg || typeof svg.getScreenCTM !== "function" || typeof svg.createSVGPoint !== "function") {
      return MAP_CENTER;
    }
    const matrix = svg.getScreenCTM();
    if (!matrix) return MAP_CENTER;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  }, []);

  const pointFromElement = (element: SVGPathElement): TooltipPoint => {
    const bounds = element.getBoundingClientRect();
    return pointFromClient(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
  };

  const pointFromFocus = (event: FocusEvent<SVGPathElement>): TooltipPoint =>
    pointFromElement(event.currentTarget);

  const pinCountry = (code: string, point: TooltipPoint) => {
    setTooltipPoint(point);
    setPinnedCode((current) => (current === code ? null : code));
  };

  const handleCountryKeyDown = (
    event: KeyboardEvent<SVGPathElement>,
    code: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    pinCountry(code, pointFromElement(event.currentTarget));
  };

  const zoomAt = useCallback((factor: number, anchor = MAP_CENTER) => {
    clearSelection();
    setView((current) => {
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * factor));
      if (nextZoom === current.zoom) return current;
      const ratio = nextZoom / current.zoom;
      return clampView({
        zoom: nextZoom,
        x: anchor.x - MAP_CENTER.x - (anchor.x - MAP_CENTER.x - current.x) * ratio,
        y: anchor.y - MAP_CENTER.y - (anchor.y - MAP_CENTER.y - current.y) * ratio,
      });
    });
  }, [clearSelection]);

  const resetView = useCallback(() => {
    clearSelection();
    setView(DEFAULT_VIEW);
  }, [clearSelection]);

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    didDragRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      origin: mapPointFromClient(event.clientX, event.clientY),
      clientOrigin: { x: event.clientX, y: event.clientY },
      view,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const currentPoint = mapPointFromClient(event.clientX, event.clientY);
    const deltaX = currentPoint.x - drag.origin.x;
    const deltaY = currentPoint.y - drag.origin.y;
    const clientDistance = Math.hypot(
      event.clientX - drag.clientOrigin.x,
      event.clientY - drag.clientOrigin.y,
    );
    if (clientDistance > 7) {
      didDragRef.current = true;
      clearSelection();
    }
    setView(clampView({
      ...drag.view,
      x: drag.view.x + deltaX,
      y: drag.view.y + deltaY,
    }));
  };

  const handlePointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setIsDragging(false);
  };

  const handleWheel = useCallback((event: globalThis.WheelEvent) => {
    if (event.deltaY === 0) return;
    event.preventDefault();
    zoomAt(event.deltaY < 0 ? 1.22 : 1 / 1.22, mapPointFromClient(event.clientX, event.clientY));
  }, [mapPointFromClient, zoomAt]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.addEventListener("wheel", handleWheel, { passive: false });
    return () => map.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleMapKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const panStep = 34;
    if (event.key === "Escape") {
      clearSelection();
      return;
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomAt(1.25);
      return;
    }
    if (event.key === "-") {
      event.preventDefault();
      zoomAt(1 / 1.25);
      return;
    }
    if (event.key === "0") {
      event.preventDefault();
      resetView();
      return;
    }

    const movement = {
      ArrowLeft: { x: panStep, y: 0 },
      ArrowRight: { x: -panStep, y: 0 },
      ArrowUp: { x: 0, y: panStep },
      ArrowDown: { x: 0, y: -panStep },
    }[event.key];
    if (!movement) return;
    event.preventDefault();
    clearSelection();
    setView((current) => clampView({
      ...current,
      x: current.x + movement.x,
      y: current.y + movement.y,
    }));
  };

  const mapTransform = [
    `translate(${view.x} ${view.y})`,
    `translate(${MAP_CENTER.x} ${MAP_CENTER.y})`,
    `scale(${view.zoom})`,
    `translate(${-MAP_CENTER.x} ${-MAP_CENTER.y})`,
  ].join(" ");

  const controlClass = "flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-background/80 text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:border-accent/30 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <section className="glass-card overflow-hidden" aria-labelledby={`${titleId}-heading`}>
      <div className="flex flex-col gap-2 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 id={`${titleId}-heading`} className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Globe2 className="h-4 w-4 text-accent" />
            {metric === "views" ? "View Geography" : "Click Geography"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Drag to explore. Scroll to zoom.
          </p>
        </div>
        <span className="w-fit rounded-full border border-accent/15 bg-accent/[0.06] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-accent/90">
          {trafficByCode.size} {trafficByCode.size === 1 ? "country" : "countries"} reached
        </span>
      </div>

      <div className="p-3 sm:p-5">
        <div
          ref={mapRef}
          className="relative h-[280px] overflow-hidden rounded-xl border border-border/60 bg-[hsl(155_30%_5%)] sm:h-[380px] lg:h-[clamp(440px,32vw,540px)]"
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            preserveAspectRatio={fillWideCanvas ? "xMidYMid slice" : "xMidYMid meet"}
            className={`h-full w-full select-none overscroll-contain ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={{ touchAction: view.zoom > MIN_ZOOM ? "none" : "pan-y" }}
            role="group"
            tabIndex={0}
            aria-labelledby={`${titleId}-map-title ${titleId}-map-description`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onDoubleClick={(event) => {
              event.preventDefault();
              zoomAt(1.35, mapPointFromClient(event.clientX, event.clientY));
            }}
            onKeyDown={handleMapKeyDown}
          >
            <title id={`${titleId}-map-title`}>Interactive world map of {metric} by country</title>
            <desc id={`${titleId}-map-description`}>
              Drag the flat map to move it, use the controls to zoom, and focus a highlighted country for its exact click count.
            </desc>
            <g data-testid="world-map-transform" transform={mapTransform}>
              {worldPaths.map(({ geography, path }) => {
                const code = resolveWorldAtlasCountryCode(geography.id);
                const traffic = code ? trafficByCode.get(code) : undefined;
                const clicks = traffic?.clicks || 0;
                const hasTraffic = clicks > 0;
                const intensity = getCountryTrafficIntensity(clicks, maxClicks);
                const isHighlighted = hasTraffic && selectedCode === code;
                const defaultFill = hasTraffic
                  ? `hsl(var(--accent) / ${0.16 + intensity * 0.84})`
                  : "hsl(var(--muted) / 0.72)";
                const countryLabel = code ? getCountryDisplayName(code) : geography.properties?.name || "Unmapped area";

                const setMousePoint = (event: MouseEvent<SVGPathElement>) => {
                  setTooltipPoint(pointFromClient(event.clientX, event.clientY));
                };

                return (
                  <path
                    key={geography.id || path}
                    d={path}
                    role={hasTraffic ? "button" : "presentation"}
                    tabIndex={hasTraffic ? 0 : -1}
                    aria-label={hasTraffic ? `${countryLabel}, ${trafficLabel(clicks, metric)}` : undefined}
                    aria-pressed={hasTraffic ? pinnedCode === code : undefined}
                    aria-hidden={hasTraffic ? undefined : true}
                    className="motion-safe:transition-[fill,stroke] motion-safe:duration-150"
                    fill={isHighlighted ? "hsl(var(--accent))" : defaultFill}
                    stroke={isHighlighted ? "hsl(var(--foreground) / 0.85)" : "hsl(var(--background) / 0.9)"}
                    strokeWidth={isHighlighted ? 1.2 : 0.55}
                    vectorEffect="non-scaling-stroke"
                    style={{ outline: "none", cursor: hasTraffic ? "pointer" : "inherit" }}
                    onMouseEnter={(event) => {
                      if (!hasTraffic || !code || dragRef.current) return;
                      setHoveredCode(code);
                      setMousePoint(event);
                    }}
                    onMouseMove={(event) => {
                      if (hasTraffic && !dragRef.current) setMousePoint(event);
                    }}
                    onMouseLeave={() => setHoveredCode(null)}
                    onFocus={(event) => {
                      if (!hasTraffic || !code) return;
                      setHoveredCode(code);
                      setTooltipPoint(pointFromFocus(event));
                    }}
                    onBlur={() => setHoveredCode(null)}
                    onClick={(event) => {
                      if (didDragRef.current) {
                        didDragRef.current = false;
                        return;
                      }
                      if (!hasTraffic || !code) return;
                      pinCountry(code, pointFromClient(event.clientX, event.clientY));
                    }}
                    onKeyDown={(event) => {
                      if (hasTraffic && code) handleCountryKeyDown(event, code);
                    }}
                  />
                );
              })}
            </g>
          </svg>

          <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5" role="group" aria-label="Map controls">
            <button
              type="button"
              className={controlClass}
              onClick={() => zoomAt(1.35)}
              disabled={view.zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              title="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={controlClass}
              onClick={() => zoomAt(1 / 1.35)}
              disabled={view.zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              title="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={controlClass}
              onClick={resetView}
              disabled={!hasCustomView}
              aria-label="Reset map view"
              title="Reset map view"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <span className="sr-only" aria-live="polite">
            Map zoom {Math.round(view.zoom * 100)} percent
          </span>

          {selectedCountry && (
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-none absolute z-10 min-w-[140px] -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg border border-accent/20 bg-[hsl(155_35%_7%/0.96)] px-3 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl"
              style={{ left: tooltipPoint.x, top: tooltipPoint.y }}
            >
              <p className="text-xs font-semibold text-foreground">
                {getCountryDisplayName(selectedCountry.code)}
              </p>
              <p className="mt-0.5 font-mono text-[10px] font-semibold text-accent">
                {trafficLabel(selectedCountry.clicks, metric)}
              </p>
            </div>
          )}

          <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-border/60 bg-background/75 px-2.5 py-1.5 backdrop-blur-md">
            <span className="text-[8px] font-medium uppercase tracking-wider text-muted-foreground">Less</span>
            {[0.2, 0.4, 0.6, 0.8, 1].map((opacity) => (
              <span
                key={opacity}
                className="h-2 w-2 rounded-[2px] border border-accent/10"
                style={{ backgroundColor: `hsl(var(--accent) / ${opacity})` }}
              />
            ))}
            <span className="text-[8px] font-medium uppercase tracking-wider text-muted-foreground">More</span>
          </div>
        </div>
      </div>
    </section>
  );
}
