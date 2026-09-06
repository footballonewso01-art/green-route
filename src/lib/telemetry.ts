import { pb } from "@/lib/pocketbase";
import { acquisitionSource, marketingPath } from "@/lib/growthAttribution";
import { isCustomPublicHostname } from "@/lib/siteConfig";

export type GrowthEvent =
  | "landing_pageview"
  | "landing_cta_clicked"
  | "pricing_viewed"
  | "signup_started"
  | "signup_completed";

type TelemetryEvent =
  | GrowthEvent
  | "active_session"
  | "client_error"
  | "unhandled_rejection";

interface TelemetryPayload {
  event_name: TelemetryEvent;
  event_id?: string;
  journey_id?: string;
  path?: string;
  landing_path?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  surface?: string;
  target_plan?: "creator" | "pro" | "agency" | "";
  reason?: string;
  message?: string;
  filename?: string;
  line?: number;
  column?: number;
  stack?: string;
}

type GrowthProperties = Pick<
  TelemetryPayload,
  "event_id" | "surface" | "target_plan" | "reason"
>;

interface GrowthContext {
  journeyId: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  landingPath: string;
}

const GROWTH_CONTEXT_KEY = "linktery_growth_context_v1";
const GROWTH_CONTEXT_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
let memoryContext: (GrowthContext & { capturedAt: number }) | undefined;
let memoryContextWasStored = false;

const truncate = (value: unknown, max: number) => String(value ?? "").slice(0, max);

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 18)}`;
}

function safeAttributionValue(value: unknown, max: number): string {
  return String(value ?? "")
    .split("")
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? " " : character;
    })
    .join("")
    .trim()
    .slice(0, max);
}

function readGrowthContext(): GrowthContext {
  const fallback: GrowthContext = {
    journeyId: randomId().replace(/-/g, "_"),
    source: "direct",
    medium: "",
    campaign: "",
    content: "",
    landingPath: "",
  };
  if (typeof window === "undefined") return fallback;
  if (memoryContext && memoryContext.capturedAt > Date.now() - GROWTH_CONTEXT_MAX_AGE_MS) return memoryContext;

  try {
    const raw = window.localStorage.getItem(GROWTH_CONTEXT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GrowthContext> & { capturedAt?: number };
      if (
        typeof parsed.journeyId === "string" &&
        /^[a-zA-Z0-9_-]{12,64}$/.test(parsed.journeyId) &&
        Number(parsed.capturedAt || 0) > Date.now() - GROWTH_CONTEXT_MAX_AGE_MS &&
        Number(parsed.capturedAt) <= Date.now()
      ) {
        memoryContext = {
          journeyId: parsed.journeyId,
          source: safeAttributionValue(parsed.source || "direct", 64).toLowerCase() || "direct",
          medium: safeAttributionValue(parsed.medium, 64).toLowerCase(),
          campaign: safeAttributionValue(parsed.campaign, 96),
          content: safeAttributionValue(parsed.content, 64),
          // Legacy contexts have no known landing page. Never invent one
          // from the registration page or a later visit.
          landingPath: parsed.landingPath ? marketingPath(parsed.landingPath) : "",
          capturedAt: Number(parsed.capturedAt),
        };
        memoryContextWasStored = true;
        return memoryContext;
      }
    }

  } catch { /* Storage can be unavailable; keep the journey in memory. */ }
  memoryContext = {
    journeyId: fallback.journeyId,
    ...acquisitionSource(window.location.search, document.referrer, window.location.hostname),
    landingPath: marketingPath(window.location.pathname),
    capturedAt: Date.now(),
  };
  memoryContextWasStored = false;
  try { window.localStorage.setItem(GROWTH_CONTEXT_KEY, JSON.stringify(memoryContext)); } catch { /* Best effort. */ }
  return memoryContext;
}

export function getGrowthJourneyId(): string {
  return readGrowthContext().journeyId;
}

interface CampaignAttributionInput {
  journeyId: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  landingPath: string;
}

// /go creates an empty context before it resolves a placement. Enrich only
// that empty context; a prior landing/referral remains the immutable first touch.
export function captureCampaignAttribution(input: CampaignAttributionInput): GrowthContext {
  const current = readGrowthContext();
  if (
    memoryContextWasStored ||
    current.landingPath
  ) return current;

  const journeyId = /^[a-zA-Z0-9_-]{12,64}$/.test(input.journeyId)
    ? input.journeyId
    : current.journeyId;
  memoryContext = {
    journeyId,
    source: safeAttributionValue(input.source, 64).toLowerCase() || "direct",
    medium: safeAttributionValue(input.medium, 64).toLowerCase(),
    campaign: safeAttributionValue(input.campaign, 96),
    content: safeAttributionValue(input.content, 64),
    landingPath: marketingPath(input.landingPath),
    capturedAt: Date.now(),
  };
  memoryContextWasStored = true;
  try { window.localStorage.setItem(GROWTH_CONTEXT_KEY, JSON.stringify(memoryContext)); } catch { /* Best effort. */ }
  return memoryContext;
}

export function sendTelemetry(payload: TelemetryPayload): void {
  if (typeof window === "undefined") return;
  const safePayload: TelemetryPayload = {
    event_name: payload.event_name,
    event_id: truncate(payload.event_id, 96),
    journey_id: truncate(payload.journey_id, 64),
    path: truncate(payload.path || window.location.pathname, 160),
    landing_path: payload.landing_path ? marketingPath(payload.landing_path) : "",
    source: truncate(payload.source, 64),
    medium: truncate(payload.medium, 64),
    campaign: truncate(payload.campaign, 96),
    content: truncate(payload.content, 64),
    surface: truncate(payload.surface, 64),
    target_plan: payload.target_plan || "",
    reason: truncate(payload.reason, 48),
    message: truncate(payload.message, 300),
    filename: truncate(payload.filename, 180),
    line: Math.max(0, Math.min(10_000_000, Number(payload.line || 0))),
    column: Math.max(0, Math.min(10_000_000, Number(payload.column || 0))),
    stack: truncate(payload.stack, 1000),
  };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (pb.authStore?.isValid && pb.authStore.token) {
    headers.Authorization = pb.authStore.token;
  }

  void fetch("/api/telemetry", {
    method: "POST",
    headers,
    body: JSON.stringify(safePayload),
    keepalive: true,
    credentials: "omit",
  }).catch(() => undefined);
}

export function trackGrowthEvent(eventName: GrowthEvent, properties: GrowthProperties = {}): void {
  const context = readGrowthContext();
  sendTelemetry({
    event_name: eventName,
    event_id: properties.event_id || `web:${randomId()}`,
    journey_id: context.journeyId,
    source: context.source,
    medium: context.medium,
    campaign: context.campaign,
    content: context.content,
    landing_path: context.landingPath,
    surface: properties.surface,
    target_plan: properties.target_plan,
    reason: properties.reason,
  });
}

const pageViews = new Map<string, number>();
export function trackMarketingPageView(path: string): void {
  if (typeof window === "undefined" || isCustomPublicHostname(window.location.hostname)) return;
  const safePath = marketingPath(path);
  if (!safePath || safePath !== marketingPath(window.location.pathname)) return;
  const key = `linktery_pageview:${safePath}`;
  let last = pageViews.get(key) || 0;
  try { last = Math.max(last, Number(sessionStorage.getItem(key)) || 0); } catch { /* Memory fallback. */ }
  if (last > Date.now() - 30 * 60 * 1000) return;
  pageViews.set(key, Date.now());
  try { sessionStorage.setItem(key, String(Date.now())); } catch { /* Memory fallback. */ }
  trackGrowthEvent("landing_pageview", { surface: safePath === "/" ? "landing" : "seo_content" });
}
