export type InAppBrowser = "instagram" | "tiktok" | "facebook" | null;

export const detectInAppBrowser = (userAgent: string): InAppBrowser => {
  if (/Instagram/i.test(userAgent)) return "instagram";
  if (/TikTok/i.test(userAgent)) return "tiktok";
  if (/FBAN|FBAV/i.test(userAgent)) return "facebook";
  return null;
};

export const isAndroidUserAgent = (userAgent: string): boolean => /Android/i.test(userAgent);

const AUTOMATIC_ATTEMPT_TTL_MS = 15_000;

interface AttemptStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface AutomaticDeeplinkAttempt {
  href: string;
  storageKey: string;
}

const hashAttemptScope = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const getDeeplinkDestinationName = (destination: string): string | null => {
  try {
    const hostname = new URL(destination).hostname.toLowerCase().replace(/^www\./, "");
    if (hostname === "youtu.be" || hostname.endsWith(".youtube.com") || hostname === "youtube.com") return "YouTube";
    if (hostname === "t.me" || hostname === "telegram.me" || hostname.endsWith(".telegram.me")) return "Telegram";
    if (hostname === "open.spotify.com") return "Spotify";
    if (hostname === "tiktok.com" || hostname.endsWith(".tiktok.com")) return "TikTok";
    if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) return "Instagram";
    return null;
  } catch {
    return null;
  }
};

/**
 * Android browsers only allow an external intent reliably after a user gesture.
 * The destination remains the fallback so a missing Chrome installation never
 * sends the visitor back through the Linktery short URL.
 */
export const buildAndroidBrowserIntent = (destination: string): string => {
  try {
    const url = new URL(destination);
    if (url.protocol !== "https:" && url.protocol !== "http:") return destination;

    const scheme = url.protocol.slice(0, -1);
    // Android reserves the fragment for the #Intent payload delimiter. The
    // direct fallback still retains any original destination fragment.
    const target = `${url.host}${url.pathname}${url.search}`;
    return `intent://${target}#Intent;scheme=${scheme};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(destination)};end`;
  } catch {
    return destination;
  }
};

/**
 * Some Android social WebViews accept an intent navigation during page load,
 * while Chrome may reject it without a user gesture. Make exactly one best-
 * effort attempt, then leave the stable handoff UI in place for a real tap.
 */
export const prepareAutomaticExternalHandoff = ({
  destination,
  userAgent,
  storage,
  scope = "",
  now = Date.now(),
}: {
  destination: string;
  userAgent: string;
  storage: AttemptStorage;
  scope?: string;
  now?: number;
}): AutomaticDeeplinkAttempt | null => {
  if (!detectInAppBrowser(userAgent) || !isAndroidUserAgent(userAgent)) return null;

  const href = buildAndroidBrowserIntent(destination);
  if (href === destination) return null;

  const storageKey = `linktery_deeplink_v2_${hashAttemptScope(`${scope}|${destination}`)}`;
  try {
    const previousAttempt = Number(storage.getItem(storageKey) || "0");
    if (Number.isFinite(previousAttempt) && now - previousAttempt < AUTOMATIC_ATTEMPT_TTL_MS) {
      return null;
    }
    storage.setItem(storageKey, String(now));
  } catch {
    // Without a persistent one-shot guard an automatic attempt could repeat
    // after WebView reloads or bfcache restores, so keep the manual action only.
    return null;
  }

  return { href, storageKey };
};

export const getDeeplinkPrimaryAction = (destination: string, userAgent: string) => {
  if (isAndroidUserAgent(userAgent)) {
    return {
      href: buildAndroidBrowserIntent(destination),
      label: "Open in Chrome",
    };
  }

  // There is no documented web URL scheme that can force Safari from an iOS
  // third-party WebView. A user-tapped HTTPS URL can still activate the
  // destination's Universal Link/native app association when supported.
  const destinationName = getDeeplinkDestinationName(destination);
  return {
    href: destination,
    label: destinationName ? `Open ${destinationName}` : "Open destination",
  };
};
