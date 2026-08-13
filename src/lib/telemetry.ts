import { pb } from "@/lib/pocketbase";

type TelemetryEvent =
  | "landing_pageview"
  | "active_session"
  | "client_error"
  | "unhandled_rejection";

interface TelemetryPayload {
  event_name: TelemetryEvent;
  path?: string;
  message?: string;
  filename?: string;
  line?: number;
  column?: number;
  stack?: string;
}

const truncate = (value: unknown, max: number) => String(value ?? "").slice(0, max);

export function sendTelemetry(payload: TelemetryPayload): void {
  const safePayload: TelemetryPayload = {
    event_name: payload.event_name,
    path: truncate(payload.path || window.location.pathname, 160),
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
