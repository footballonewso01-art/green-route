export type InAppBrowser = "instagram" | "threads" | "tiktok" | "facebook" | null;

export const detectInAppBrowser = (userAgent: string): InAppBrowser => {
  if (/Threads|Barcelona/i.test(userAgent)) return "threads";
  if (/Instagram/i.test(userAgent)) return "instagram";
  if (/TikTok|musical_ly/i.test(userAgent)) return "tiktok";
  if (/FBAN|FBAV/i.test(userAgent)) return "facebook";
  return null;
};

export const isAndroidUserAgent = (userAgent: string): boolean => /Android/i.test(userAgent);
export const isIOSUserAgent = (userAgent: string): boolean => /iPhone|iPad|iPod/i.test(userAgent);

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

const hasUnsafeControlCharacters = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
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
    if (destination.length > 8_192 || hasUnsafeControlCharacters(destination)) return destination;
    const url = new URL(destination);
    if (url.protocol !== "https:" && url.protocol !== "http:") return destination;
    if (url.username || url.password) return destination;
    // Android's intent URI reserves #Intent as its own fragment delimiter.
    // Falling back to HTTPS is safer than silently dropping an application
    // fragment such as #checkout or #message-42.
    if (url.hash) return destination;

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
 * Instagram and Threads expose an app-owned iOS URL handler that asks their
 * in-app browser to hand an HTTP(S) destination to the external browser. It is
 * not an Apple web standard, so keep it isolated to the matching Meta WebView
 * and retain the normal destination as a visible fallback.
 */
export const buildMetaExternalBrowserUrl = (
  destination: string,
  userAgent: string,
): string | null => {
  if (!isIOSUserAgent(userAgent)) return null;
  if (destination.length > 8_192 || hasUnsafeControlCharacters(destination)) return null;

  try {
    const url = new URL(destination);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;

    const inAppBrowser = detectInAppBrowser(userAgent);
    if (inAppBrowser === "instagram") {
      return `instagram://extbrowser/?url=${encodeURIComponent(url.toString())}`;
    }
    if (inAppBrowser === "threads") {
      return `barcelona://extbrowser/?url=${encodeURIComponent(url.toString())}`;
    }
  } catch {
    return null;
  }

  return null;
};

/**
 * Some social WebViews accept an external-browser navigation during page
 * load. Make exactly one best-effort attempt, then leave the stable handoff UI
 * in place for a real tap. The destination is never the Linktery short URL, so
 * a rejected handoff cannot re-enter the redirect resolver.
 */
export const prepareAutomaticExternalHandoff = ({
  destination,
  userAgent,
  storage,
  scope = "",
}: {
  destination: string;
  userAgent: string;
  storage: AttemptStorage;
  scope?: string;
}): AutomaticDeeplinkAttempt | null => {
  // The React renderer is only an availability fallback. Automatic Meta iOS
  // escape is owned by the server hot path where the operational kill switch
  // can disable an undocumented scheme instantly.
  if (!detectInAppBrowser(userAgent) || !isAndroidUserAgent(userAgent)) return null;

  const href = buildAndroidBrowserIntent(destination);
  if (!href || href === destination) return null;

  // Scope by short link when available, not by randomized A/B destination.
  // Otherwise a reload that selects another variant could trigger another
  // automatic browser escape in the same session.
  const storageKey = `linktery_deeplink_v2_${hashAttemptScope(scope || destination)}`;
  try {
    if (storage.getItem(storageKey)) return null;
    storage.setItem(storageKey, "attempted");
  } catch {
    // Without a persistent one-shot guard an automatic attempt could repeat
    // after WebView reloads or bfcache restores, so keep the manual action only.
    return null;
  }

  return {
    href,
    storageKey,
  };
};

export const getDeeplinkPrimaryAction = (destination: string, userAgent: string) => {
  if (isAndroidUserAgent(userAgent)) {
    const intent = buildAndroidBrowserIntent(destination);
    if (intent === destination) {
      const destinationName = getDeeplinkDestinationName(destination);
      return {
        href: destination,
        label: destinationName ? `Open ${destinationName}` : "Open destination",
      };
    }
    return {
      href: intent,
      label: "Open in Chrome",
    };
  }

  const metaExternalUrl = buildMetaExternalBrowserUrl(destination, userAgent);
  if (metaExternalUrl) {
    return {
      href: metaExternalUrl,
      label: "Open in Browser",
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
