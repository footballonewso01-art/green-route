import { pb } from "@/lib/pocketbase";
import type { CoreLinkRecord, ProfileLinkRecord } from "@/lib/profileLinks";
import { DEFAULT_AVAILABLE_DOMAINS, PRIMARY_DOMAIN, PRIMARY_ORIGIN } from "@/lib/siteConfig";

export interface PublicProfileRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  slug: string;
  domain?: string;
  name?: string;
  bio?: string;
  theme?: string;
  card_color?: string;
  online_counter?: boolean;
  social_links?: Array<{ id: string; url: string; icon_type: string; icon_value: string; label?: string }>;
  custom_theme_bg?: string;
  avatar?: string;
  profile_template?: string;
  link_card_style?: string;
  social_link_style?: string;
  profile_background_mode?: string;
  profile_background_image?: string;
  profile_background_position?: string;
  profile_background_overlay?: string;
  plan?: string;
}

export interface PublicProfileLinkRecord extends Omit<ProfileLinkRecord, "user_id" | "expand"> {
  collectionId: string;
  collectionName: string;
  link: CoreLinkRecord;
}

interface PublicProfileResponse {
  profile: PublicProfileRecord;
  links: PublicProfileLinkRecord[];
  has_more?: boolean;
}

interface SlugAvailabilityOptions {
  excludeLinkId?: string;
  excludeProfileId?: string;
}

export class PublicAssetRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "PublicAssetRequestError";
    this.status = status;
  }
}

export interface PublicResolvedLink extends Pick<CoreLinkRecord, "id" | "slug" | "destination_url" | "active" | "title" | "mode" | "domain"> {
  [key: string]: unknown;
  interstitial_enabled?: boolean;
  fb_pixel?: string;
  google_pixel?: string;
  tiktok_pixel?: string;
}

function publicPath(pathname: string, params?: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

async function sendPublicJson<T>(path: string): Promise<T> {
  // PocketBase 0.21 appends absolute inputs to its own base URL (for example,
  // /https://linktery.com/...). Production public routing must instead pass
  // through the current Cloudflare hostname so host/country/IP stay attested.
  if (import.meta.env.DEV) {
    return pb.send<T>(path, { method: "GET", requestKey: null });
  }

  const url = new URL(path, window.location.origin);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
    });
  } catch {
    throw new PublicAssetRequestError(0, "Public routing is temporarily unavailable.");
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // A malformed edge response is an outage, never a genuine missing link.
  }

  if (!response.ok) {
    const upstreamMessage = payload && typeof payload === "object" && "message" in payload
      ? String((payload as { message?: unknown }).message || "")
      : "";
    throw new PublicAssetRequestError(
      response.status,
      upstreamMessage || (response.status === 404
        ? "Not found"
        : "Public routing is temporarily unavailable."),
    );
  }

  return payload as T;
}

export function getPublicAssetRequestStatus(error: unknown): number {
  return error instanceof PublicAssetRequestError ? error.status : 0;
}

export function resolvePublicLink(slug: string, domain: string): Promise<PublicResolvedLink> {
  const path = publicPath(`/api/public/links/${encodeURIComponent(slug)}`, { domain });
  return sendPublicJson<PublicResolvedLink>(path);
}

export async function getPublicProfile(slug: string, domain: string): Promise<PublicProfileResponse> {
  const path = `/api/public/profiles/${encodeURIComponent(slug)}`;
  const getPage = (page: number) => {
    const pagePath = publicPath(path, { domain, page: String(page) });
    return sendPublicJson<PublicProfileResponse>(pagePath);
  };
  const response = await getPage(1);
  let page = 1;
  let hasMore = response.has_more === true;
  while (hasMore) {
    const next = await getPage(++page);
    response.links.push(...next.links);
    hasMore = next.has_more === true;
  }
  return response;
}

// Card clicks always use the Link's own hostname, which may differ from the
// profile's. Customer hostnames own only their root, never an arbitrary /slug.
export function getPublicProfileCardHref(
  link: Pick<CoreLinkRecord, "slug" | "domain">,
  profileId: string,
  profileLinkId: string,
  customDomainRoot: boolean,
  currentHostname = typeof window === "undefined" ? PRIMARY_DOMAIN : window.location.hostname,
): string {
  const path = `/${encodeURIComponent(link.slug)}?ref=profile&profile_id=${encodeURIComponent(profileId)}&profile_link_id=${encodeURIComponent(profileLinkId)}`;
  if (import.meta.env.MODE === "staging") {
    return customDomainRoot
      ? `https://linktery-frontend-staging.footballonewso01.workers.dev${path}`
      : path;
  }
  const currentHost = currentHostname.trim().toLowerCase().replace(/\.$/, "");
  const isPreviewHost = currentHost === "localhost" || currentHost.endsWith(".localhost")
    || currentHost === "[::1]" || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(currentHost)
    || [".workers.dev", ".pages.dev", ".vercel.app"].some((suffix) => currentHost.endsWith(suffix));
  // Local/staging databases must not send preview clicks to production links.
  if (!customDomainRoot && isPreviewHost) return path;

  const host = String(link.domain || "").trim().toLowerCase().replace(/\.$/, "");
  const origin = DEFAULT_AVAILABLE_DOMAINS.includes(host as typeof DEFAULT_AVAILABLE_DOMAINS[number])
    ? `https://${host}` : PRIMARY_ORIGIN;
  if (!customDomainRoot && origin === `https://${currentHost}`) return path;
  return origin + path;
}

export async function isPublicSlugAvailable(
  slug: string,
  options: SlugAvailabilityOptions = {},
): Promise<boolean> {
  const response = await pb.send<{ available: boolean }>(
    publicPath(`/api/public/slugs/${encodeURIComponent(slug)}/availability`, {
      exclude_link_id: options.excludeLinkId,
      exclude_profile_id: options.excludeProfileId,
    }),
    { method: "GET", requestKey: null },
  );
  return response.available === true;
}
