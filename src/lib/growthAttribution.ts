export interface AcquisitionContext {
  journeyId: string;
  source: string;
  medium: string;
  campaign: string;
  landingPath: string;
  capturedAt: number;
}

// Query strings can contain email addresses, reservation slugs or auth tokens.
// Persist only public marketing paths, never a profile or dashboard URL.
export function marketingPath(value: string): string {
  const path = value.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  return /^(?:\/|\/(?:features|guides|tools|templates|solutions|alternatives|compare)(?:\/[a-z0-9-]+)?|\/pricing|\/documentation)$/.test(path)
    ? path.slice(0, 160) : "";
}

export function acquisitionSource(search: string, referrer: string, hostname: string) {
  const params = new URLSearchParams(search);
  const clean = (value: string | null, max: number) => Array.from(value || "")
    .map((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? " " : character)
    .join("").trim().slice(0, max);
  let source = "direct";
  let medium = "";
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
    if (host !== hostname.toLowerCase().replace(/^www\./, "") &&
        !["linktery.com", "linktery.bio", "hotme.online", "hotmylinks.cc"].includes(host)) {
      source = host;
      medium = /^(?:google\.(?:com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})|(?:[a-z]+\.)?bing\.com|duckduckgo\.com|(?:[a-z]+\.)?search\.yahoo\.com|(?:[a-z]+\.)?yandex\.(?:ru|com))$/.test(host) ? "organic" : "referral";
    }
  } catch { /* Empty or unavailable referrers remain direct, not guessed organic. */ }
  const tagged = params.has("utm_source") || params.has("utm_medium") || params.has("gclid") || params.has("msclkid");
  return {
    source: clean(params.get("utm_source") || source, 64).toLowerCase(),
    // Explicit campaign tags take precedence over a search-engine referrer.
    medium: clean(params.get("utm_medium") || (tagged ? (params.has("gclid") || params.has("msclkid") ? "cpc" : "campaign") : medium), 64).toLowerCase(),
    campaign: clean(params.get("utm_campaign"), 96),
  };
}
