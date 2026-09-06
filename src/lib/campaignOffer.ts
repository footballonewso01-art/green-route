const STORAGE_KEY = "linktery_campaign_offer_v1";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeCode(value: unknown): string {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
}

export function captureCampaignPromocode(value: string): string {
  const code = normalizeCode(value);
  if (!code || typeof window === "undefined") return "";
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, capturedAt: Date.now() }));
  } catch { /* Registration URL still receives the code as a fallback. */ }
  return code;
}

export function getStoredCampaignPromocode(): string {
  if (typeof window === "undefined") return "";
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as {
      code?: unknown;
      capturedAt?: unknown;
    } | null;
    const capturedAt = Number(parsed?.capturedAt || 0);
    const code = normalizeCode(parsed?.code);
    if (!code || capturedAt <= 0 || capturedAt > Date.now() || capturedAt < Date.now() - MAX_AGE_MS) {
      clearStoredCampaignPromocode();
      return "";
    }
    return code;
  } catch {
    clearStoredCampaignPromocode();
    return "";
  }
}

export function clearStoredCampaignPromocode(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Best effort. */ }
}
