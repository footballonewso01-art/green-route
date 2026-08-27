import { pb } from "@/lib/pocketbase";
import type { CoreLinkRecord, ProfileLinkRecord } from "@/lib/profileLinks";

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

export function resolvePublicLink(slug: string, domain: string): Promise<PublicResolvedLink> {
  const path = publicPath(`/api/public/links/${encodeURIComponent(slug)}`, { domain });
  // In production the first-party Worker provides trustworthy country/IP
  // context. Local Vite has no edge runtime, so use the configured local API.
  const url = import.meta.env.DEV ? path : new URL(path, window.location.origin).toString();
  return pb.send(url, {
    method: "GET",
    requestKey: null,
  });
}

export async function getPublicProfile(slug: string, domain: string): Promise<PublicProfileResponse> {
  const path = `/api/public/profiles/${encodeURIComponent(slug)}`;
  const getPage = (page: number) => pb.send<PublicProfileResponse>(
    publicPath(path, { domain, page: String(page) }),
    { method: "GET", requestKey: null },
  );
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
