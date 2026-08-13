import { WORLD_ATLAS_NUMERIC_TO_ALPHA2 } from "@/data/worldAtlasCountryCodes";

const worldAtlasCountryCodes = new Set(Object.values(WORLD_ATLAS_NUMERIC_TO_ALPHA2));

export function resolveWorldAtlasCountryCode(id: unknown): string | null {
  const numericId = String(id ?? "").trim().padStart(3, "0");
  return WORLD_ATLAS_NUMERIC_TO_ALPHA2[numericId] || null;
}

export function isWorldAtlasCountryCode(code: string): boolean {
  return worldAtlasCountryCodes.has(code);
}

export function getCountryTrafficIntensity(clicks: number, maxClicks: number): number {
  if (!Number.isFinite(clicks) || !Number.isFinite(maxClicks) || clicks <= 0 || maxClicks <= 0) {
    return 0;
  }
  return Math.min(1, Math.log1p(clicks) / Math.log1p(maxClicks));
}
