import { pb } from "@/lib/pocketbase";

const REFERRAL_STORAGE_KEY = "linktery_referral_first_touch";
const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type StoredReferral = {
  code: string;
  capturedAt: number;
};

export function normalizeReferralCode(value: string | null | undefined): string {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40);
}

export function getStoredReferral(): StoredReferral | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(REFERRAL_STORAGE_KEY) || "null") as StoredReferral | null;
    if (!parsed?.code || !parsed.capturedAt || Date.now() - parsed.capturedAt > ATTRIBUTION_TTL_MS) {
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    return null;
  }
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
  localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearStoredReferral(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  }
}

export async function claimStoredReferral(): Promise<boolean> {
  const referral = getStoredReferral();
  if (!referral || !pb.authStore.isValid) return false;

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
}
