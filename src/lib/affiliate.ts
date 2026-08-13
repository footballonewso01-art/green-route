import { pb } from "@/lib/pocketbase";

const REFERRAL_STORAGE_KEY = "linktery_referral_first_touch";
const REFERRAL_COOKIE_KEY = "linktery_referral_first_touch";
const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

type StoredReferral = {
  code: string;
  capturedAt: number;
};

let claimInFlight: Promise<boolean> | null = null;

export function normalizeReferralCode(value: string | null | undefined): string {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40);
}

function normalizeStoredReferral(value: unknown): StoredReferral | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<StoredReferral>;
  const code = normalizeReferralCode(candidate.code);
  const capturedAt = Number(candidate.capturedAt);
  const now = Date.now();

  if (
    !code ||
    !Number.isFinite(capturedAt) ||
    capturedAt <= 0 ||
    capturedAt > now + CLOCK_SKEW_TOLERANCE_MS ||
    now - capturedAt > ATTRIBUTION_TTL_MS
  ) {
    return null;
  }

  return { code, capturedAt };
}

function readLocalReferral(): StoredReferral | null {
  try {
    return normalizeStoredReferral(
      JSON.parse(localStorage.getItem(REFERRAL_STORAGE_KEY) || "null"),
    );
  } catch {
    return null;
  }
}

function writeLocalReferral(referral: StoredReferral): void {
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(referral));
  } catch {
    // A first-party cookie remains available when browser storage is blocked.
  }
}

function readCookieReferral(): StoredReferral | null {
  try {
    const prefix = `${REFERRAL_COOKIE_KEY}=`;
    const cookie = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));
    if (!cookie) return null;

    const decoded = decodeURIComponent(cookie.slice(prefix.length));
    const separatorIndex = decoded.lastIndexOf(":");
    if (separatorIndex <= 0) return null;

    return normalizeStoredReferral({
      code: decoded.slice(0, separatorIndex),
      capturedAt: Number(decoded.slice(separatorIndex + 1)),
    });
  } catch {
    return null;
  }
}

function writeCookieReferral(referral: StoredReferral): void {
  try {
    const remainingSeconds = Math.max(
      1,
      Math.floor((referral.capturedAt + ATTRIBUTION_TTL_MS - Date.now()) / 1000),
    );
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    const value = encodeURIComponent(`${referral.code}:${referral.capturedAt}`);
    document.cookie = `${REFERRAL_COOKIE_KEY}=${value}; Path=/; Max-Age=${remainingSeconds}; SameSite=Lax${secure}`;
  } catch {
    // localStorage remains the primary persistence layer.
  }
}

function persistReferral(referral: StoredReferral): void {
  writeLocalReferral(referral);
  writeCookieReferral(referral);
}

function clearReferralCookie(): void {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${REFERRAL_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  } catch {
    // Ignore browsers that disable cookie access entirely.
  }
}

export function getStoredReferral(): StoredReferral | null {
  if (typeof window === "undefined") return null;

  const candidates = [readLocalReferral(), readCookieReferral()]
    .filter((candidate): candidate is StoredReferral => candidate !== null)
    .sort((left, right) => left.capturedAt - right.capturedAt);
  const firstTouch = candidates[0] || null;

  if (!firstTouch) {
    clearStoredReferral();
    return null;
  }

  // Keep both stores in sync. Selecting the oldest valid timestamp preserves
  // first-touch attribution even if only one persistence layer was modified.
  persistReferral(firstTouch);
  return firstTouch;
}

// First touch wins. A later partner link cannot replace an attribution that is
// already waiting for registration in this browser.
export function captureReferral(code: string): StoredReferral | null {
  if (typeof window === "undefined") return null;
  const existing = getStoredReferral();
  if (existing) return existing;

  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;
  const next = { code: normalized, capturedAt: Date.now() };
  persistReferral(next);
  return next;
}

export function clearStoredReferral(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
    } catch {
      // Cookie cleanup below still runs if browser storage is unavailable.
    }
    clearReferralCookie();
  }
}

export async function claimStoredReferral(): Promise<boolean> {
  if (claimInFlight) return claimInFlight;

  const referral = getStoredReferral();
  if (!referral || !pb.authStore.isValid) return false;

  claimInFlight = (async () => {
    try {
      const result = await pb.send("/api/affiliate/claim", {
        method: "POST",
        body: { code: referral.code },
        requestKey: null,
      });
      if (result?.success) {
        clearStoredReferral();
        return true;
      }
      return false;
    } catch (error) {
      const status = Number((error as { status?: number })?.status || 0);
      if (status === 400 || status === 404 || status === 410) {
        // Invalid, self-owned, expired, or otherwise permanently ineligible
        // referrals must not be retried on every authenticated page load.
        clearStoredReferral();
      }
      throw error;
    } finally {
      claimInFlight = null;
    }
  })();

  return claimInFlight;
}
