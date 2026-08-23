import { pb } from "@/lib/pocketbase";
import { getGrowthJourneyId } from "@/lib/telemetry";

const RESERVATION_KEY = "linktery_profile_reservation_v1";

interface StoredReservation {
  slug: string;
  token: string;
  expiresAt: string;
}

interface ClaimedProfile {
  id: string;
  slug: string;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function reserveStarterProfile(slug: string): Promise<void> {
  if (import.meta.env.DEV) {
    sessionStorage.setItem(RESERVATION_KEY, JSON.stringify({
      slug,
      token: "development-only",
      expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    } satisfies StoredReservation));
    return;
  }
  const response = await fetch("/api/onboarding/profile-reservation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify({ slug, journey_id: getGrowthJourneyId() }),
  });
  const result = await readJson(response);
  if (!response.ok || typeof result.token !== "string") {
    throw new Error(typeof result.message === "string" ? result.message : "We couldn't reserve this address.");
  }
  const reservation: StoredReservation = {
    slug: String(result.slug || slug),
    token: result.token,
    expiresAt: String(result.expires_at || ""),
  };
  sessionStorage.setItem(RESERVATION_KEY, JSON.stringify(reservation));
}

function getReservation(slug: string): StoredReservation | null {
  try {
    const raw = sessionStorage.getItem(RESERVATION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredReservation>;
    if (value.slug !== slug || typeof value.token !== "string") return null;
    if (value.expiresAt && new Date(value.expiresAt).getTime() <= Date.now()) return null;
    return value as StoredReservation;
  } catch {
    return null;
  }
}

export async function claimStarterProfile(slug: string): Promise<ClaimedProfile | null> {
  if (!slug || !pb.authStore.isValid || !pb.authStore.token) return null;
  const reservation = getReservation(slug);
  if (!reservation) return null;

  if (import.meta.env.DEV) {
    const created = await pb.collection("public_profiles").create({
      user_id: pb.authStore.model?.id,
      slug,
      domain: "linktery.com",
      name: slug,
      username: slug,
      theme: "sunset",
      profile_template: "classic",
      link_card_style: "solid",
      social_link_style: "icons",
      card_color: "#000000",
    });
    sessionStorage.removeItem(RESERVATION_KEY);
    return { id: created.id, slug };
  }

  const response = await fetch("/api/onboarding/profile-claim", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: pb.authStore.token,
    },
    credentials: "omit",
    body: JSON.stringify({ slug, token: reservation.token }),
  });
  const result = await readJson(response);
  if (!response.ok || typeof result.id !== "string") {
    throw new Error(typeof result.message === "string" ? result.message : "Your profile couldn't be created yet.");
  }
  sessionStorage.removeItem(RESERVATION_KEY);
  return { id: result.id, slug: String(result.slug || slug) };
}
