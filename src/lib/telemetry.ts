import { pb } from "@/lib/pocketbase";

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
  source?: string;
  medium?: string;
  campaign?: string;
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
}

const GROWTH_CONTEXT_KEY = "linktery_growth_context_v1";
const GROWTH_CONTEXT_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

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

function referrerSource(): string {
  if (typeof document === "undefined" || !document.referrer) return "direct";
  try {
    const hostname = new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, "");
    if (!hostname || hostname === window.location.hostname.toLowerCase().replace(/^www\./, "")) {
      return "direct";
    }
    return safeAttributionValue(hostname, 64) || "referral";
  } catch {
    return "referral";
  }
}

function readGrowthContext(): GrowthContext {
  const fallback: GrowthContext = {
    journeyId: randomId().replace(/-/g, "_"),
    source: "direct",
    medium: "",
    campaign: "",
  };
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(GROWTH_CONTEXT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GrowthContext> & { capturedAt?: number };
      if (
        typeof parsed.journeyId === "string" &&
        /^[a-zA-Z0-9_-]{12,64}$/.test(parsed.journeyId) &&
        Number(parsed.capturedAt || 0) > Date.now() - GROWTH_CONTEXT_MAX_AGE_MS
      ) {
        return {
          journeyId: parsed.journeyId,
          source: safeAttributionValue(parsed.source || "direct", 64).toLowerCase() || "direct",
          medium: safeAttributionValue(parsed.medium, 64).toLowerCase(),
          campaign: safeAttributionValue(parsed.campaign, 96),
        };
      }
    }

    const params = new URLSearchParams(window.location.search);
    const context = {
      journeyId: fallback.journeyId,
      source: safeAttributionValue(params.get("utm_source") || referrerSource(), 64).toLowerCase() || "direct",
      medium: safeAttributionValue(params.get("utm_medium"), 64).toLowerCase(),
      campaign: safeAttributionValue(params.get("utm_campaign"), 96),
      capturedAt: Date.now(),
    };
    window.localStorage.setItem(GROWTH_CONTEXT_KEY, JSON.stringify(context));
    return context;
  } catch {
    return fallback;
  }
}

export function getGrowthJourneyId(): string {
  return readGrowthContext().journeyId;
}

export function sendTelemetry(payload: TelemetryPayload): void {
  if (typeof window === "undefined") return;
  const safePayload: TelemetryPayload = {
    event_name: payload.event_name,
    event_id: truncate(payload.event_id, 96),
    journey_id: truncate(payload.journey_id, 64),
    path: truncate(payload.path || window.location.pathname, 160),
    source: truncate(payload.source, 64),
    medium: truncate(payload.medium, 64),
    campaign: truncate(payload.campaign, 96),
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
  if (pb.authStore.isValid && pb.authStore.token) {
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
    surface: properties.surface,
    target_plan: properties.target_plan,
    reason: properties.reason,
  });
}
