export type AnalyticsTrafficReason =
  | "verified_bot"
  | "very_low_bot_score"
  | "automation_user_agent"
  | "prefetch_or_prerender"
  | "non_document_destination"
  | "non_navigation_mode";

interface CloudflareBotManagement {
  score?: number;
  verifiedBot?: boolean;
}

interface CloudflareRequestMetadata {
  botManagement?: CloudflareBotManagement;
}

export interface AnalyticsTrafficRequest {
  headers: Headers;
  cf?: CloudflareRequestMetadata;
}

export interface AnalyticsTrafficDecision {
  automated: boolean;
  reason?: AnalyticsTrafficReason;
}

const AUTOMATION_USER_AGENT = new RegExp([
  "bot",
  "crawler",
  "spider",
  "criteo",
  "facebookexternalhit",
  "facebot",
  "googlebot",
  "bingbot",
  "twitterbot",
  "linkedinbot",
  "pinterestbot",
  "slurp",
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "headlesschrome",
  "lighthouse",
  "phantomjs",
  "selenium",
  "playwright",
  "puppeteer",
  "cypress",
  "curl(?:/|\\s)",
  "wget(?:/|\\s)",
  "python-requests",
  "python-urllib",
  "aiohttp",
  "httpx(?:/|\\s)",
  "scrapy",
  "go-http-client",
  "libwww-perl",
  "okhttp",
  "postmanruntime",
  "httpie",
  "powershell",
  "node-fetch",
  "undici",
  "axios(?:/|\\s)",
  "zgrab",
  "masscan",
  "nmap scripting engine",
  "nikto",
  "sqlmap",
  "gobuster",
  "dirbuster",
  "ffuf",
].join("|"), "i");

/**
 * Classify only high-confidence automation signals. Missing browser metadata is
 * intentionally accepted so Safari, privacy browsers, older devices and
 * in-app WebViews are not excluded from analytics.
 */
export function classifyAnalyticsTraffic(
  request: AnalyticsTrafficRequest,
  options: { expectNavigation?: boolean } = {},
): AnalyticsTrafficDecision {
  const botManagement = request.cf?.botManagement;
  if (botManagement?.verifiedBot === true) {
    return { automated: true, reason: "verified_bot" };
  }

  const botScore = Number(botManagement?.score);
  if (Number.isFinite(botScore) && botScore >= 1 && botScore <= 5) {
    return { automated: true, reason: "very_low_bot_score" };
  }

  const userAgent = String(request.headers.get("User-Agent") || "").trim();
  if (userAgent && AUTOMATION_USER_AGENT.test(userAgent)) {
    return { automated: true, reason: "automation_user_agent" };
  }

  const purpose = String(
    request.headers.get("Sec-Purpose") || request.headers.get("Purpose") || "",
  ).toLowerCase();
  if (purpose.includes("prefetch") || purpose.includes("prerender")) {
    return { automated: true, reason: "prefetch_or_prerender" };
  }

  if (options.expectNavigation !== false) {
    const fetchDest = String(request.headers.get("Sec-Fetch-Dest") || "")
      .trim()
      .toLowerCase();
    if (fetchDest && fetchDest !== "document") {
      return { automated: true, reason: "non_document_destination" };
    }

    const fetchMode = String(request.headers.get("Sec-Fetch-Mode") || "")
      .trim()
      .toLowerCase();
    if (fetchMode && fetchMode !== "navigate") {
      return { automated: true, reason: "non_navigation_mode" };
    }
  }

  return { automated: false };
}
