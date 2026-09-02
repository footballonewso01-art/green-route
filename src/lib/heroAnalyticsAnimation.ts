export const HERO_ANALYTICS_START = { clicks: 100_000, country: 85 };
export const HERO_ANALYTICS_FINAL = { clicks: 143_873, country: 93 };
export const HERO_ANALYTICS_DELAY_MS = 160;
export const HERO_CLICKS_DURATION_MS = 1_600;
export const HERO_COUNTRY_TICK_MS = 700;
export const HERO_ANALYTICS_DURATION_MS = HERO_CLICKS_DURATION_MS + 2 * HERO_COUNTRY_TICK_MS;

/** One clock keeps the quick count-up and the final two country ticks in sync. */
export function getHeroAnalyticsFrame(elapsedMs: number) {
  const elapsed = Math.max(0, elapsedMs);
  if (elapsed >= HERO_CLICKS_DURATION_MS) {
    return {
      clicks: HERO_ANALYTICS_FINAL.clicks,
      country: Math.min(
        HERO_ANALYTICS_FINAL.country,
        91 + Math.floor((elapsed - HERO_CLICKS_DURATION_MS) / HERO_COUNTRY_TICK_MS),
      ),
    };
  }

  const progress = elapsed / HERO_CLICKS_DURATION_MS;
  const eased = 1 - (1 - progress) ** 2;
  return {
    clicks: Math.floor(HERO_ANALYTICS_START.clicks + (HERO_ANALYTICS_FINAL.clicks - HERO_ANALYTICS_START.clicks) * eased),
    country: Math.floor(HERO_ANALYTICS_START.country + (91 - HERO_ANALYTICS_START.country) * eased),
  };
}
