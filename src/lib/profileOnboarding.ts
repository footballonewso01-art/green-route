import { pb } from "@/lib/pocketbase";
import { getGrowthJourneyId } from "@/lib/telemetry";

const RESERVATION_KEY = "linktery_profile_reservation_v1";

interface StoredReservation {
  slug: string;
  token: string;
  expiresAt: string;
}

interface StarterProfile {
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

function toPublicSlug(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
  return normalized || `member-${String(pb.authStore.model?.id || "account").slice(0, 8)}`;
}

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export async function ensureStarterProfile(
  accountUsername: string,
  reservedSlug = "",
): Promise<StarterProfile> {
  if (!pb.authStore.isValid || !pb.authStore.token || !pb.authStore.model?.id) {
    throw new Error("Sign in to finish setting up your Public Profile.");
  }
  const reservation = reservedSlug ? getReservation(reservedSlug) : null;

  if (import.meta.env.DEV) {
    try {
      const existing = await pb.collection("public_profiles").getFirstListItem(
        `user_id="${pb.authStore.model.id}"`,
        { fields: "id,slug", requestKey: null },
      );
      if (reservation) sessionStorage.removeItem(RESERVATION_KEY);
      return { id: existing.id, slug: String(existing.slug || "") };
    } catch (error) {
      if ((error as { status?: number }).status !== 404) throw error;
    }

    const baseSlug = toPublicSlug(reservation?.slug || accountUsername);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
      const candidate = `${baseSlug.slice(0, Math.max(1, 64 - suffix.length)).replace(/-+$/g, "")}${suffix}`;
      try {
        const created = await pb.collection("public_profiles").create({
          user_id: pb.authStore.model.id,
          slug: candidate,
          domain: "linktery.com",
          name: accountUsername || candidate,
          theme: "sunset",
          profile_template: "classic",
          link_card_style: "solid",
          social_link_style: "icons",
          card_color: "#000000",
          profile_background_mode: "color",
          profile_background_position: "center",
          profile_background_overlay: "balanced",
        });
        if (reservation) sessionStorage.removeItem(RESERVATION_KEY);
        return { id: created.id, slug: candidate };
      } catch (error) {
        if ((error as { status?: number }).status !== 400) throw error;
      }
    }
    throw new Error("We couldn't allocate a Public Profile address. Please try again.");
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch("/api/onboarding/profile-claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: pb.authStore.token,
      },
      credentials: "omit",
      body: JSON.stringify({
        slug: reservation?.slug || "",
        token: reservation?.token || "",
      }),
    });
    const result = await readJson(response);
    if (response.ok && typeof result.id === "string" && typeof result.slug === "string") {
      if (reservation) sessionStorage.removeItem(RESERVATION_KEY);
      return { id: result.id, slug: result.slug };
    }

    const isTransient = response.status === 429 || response.status === 500 || response.status === 503;
    if (attempt === 0 && isTransient) {
      await wait(350);
      continue;
    }
    throw new Error(typeof result.message === "string" ? result.message : "Your profile couldn't be created yet.");
  }

  throw new Error("Your profile couldn't be created yet.");
}
