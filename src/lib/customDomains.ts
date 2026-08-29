import { pb } from "@/lib/pocketbase";
import { maskError } from "@/lib/utils";
import { PublicAssetRequestError } from "@/lib/publicAssets";

export type CustomDomainTargetType = "link" | "profile";
export type CustomDomainStatus = "pending" | "active" | "failed";

const safeDomainMessages = new Set([
  "Enter a domain name without https://, a path, or a port.",
  "Wildcard and IP addresses cannot be connected.",
  "Enter a complete domain name.",
  "The domain contains an unsupported label.",
  "Enter a valid public domain name.",
  "This domain is reserved by the platform.",
  "This hostname is too long for DNS ownership verification.",
  "Select a valid Link or Public Profile.",
  "The selected target does not belong to this account.",
  "Activate the selected Link before connecting a domain.",
  "This domain is already connected to Linktery.",
  "This domain has already been verified by another Linktery connection.",
  "Creator Pro includes up to 2 custom domains. Disconnect one before adding another.",
  "Agency includes up to 10 custom domains. Disconnect one before adding another.",
  "Custom Domains require an active Creator Pro or Agency plan.",
  "This domain is outside your current plan limit. Disconnect another domain or upgrade your plan.",
  "Monthly custom domain setup allowance reached. Reassign an existing domain or try again after the rolling window resets.",
  "Custom domain setup is busy. Please try again in a minute.",
  "This domain is already connected, or you have too many pending domains. Complete or remove pending connections, then try again.",
  "This domain could not be updated. Check that the destination still exists and try again shortly.",
  "This Link points back to the domain you are connecting. Choose its final destination first.",
  "Use the final destination URL instead of another Linktery short URL. This prevents slow redirects and redirect loops.",
]);

// Whitelist product guidance only; never render raw database/provider errors.
export function customDomainError(error: unknown, fallback: string): string {
  const data = error as { status?: number; response?: { message?: string } } | undefined;
  const message = data?.response?.message || "";
  return Number(data?.status || 0) < 500 && safeDomainMessages.has(message) ? message : maskError(error, fallback);
}

export interface CustomDomainRecord {
  id: string;
  hostname: string;
  target_type: CustomDomainTargetType;
  target_id: string;
  target_name?: string;
  status: CustomDomainStatus;
  hostname_status: string;
  ssl_status: string;
  ownership_verified?: boolean;
  within_plan_limit?: boolean;
  cname: { name: string; value: string };
  ownership: { type: string; name: string; value: string };
  hostname_validation?: { type: string; name: string; value: string };
  ssl_validations?: Array<{ type: string; name: string; value: string }>;
  ssl_validation: { type: string; name: string; value: string };
  last_checked_at: string;
  activated_at: string;
  created: string;
  updated: string;
}

export interface CustomDomainTarget {
  type: CustomDomainTargetType;
  id: string;
  slug: string;
}

export function normalizeCustomDomainInput(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").split(/[/?#]/, 1)[0].replace(/\.$/, "");
}

export interface CustomDomainListResponse {
  available: boolean;
  entitled: boolean;
  enabled: boolean;
  limit: number;
  total: number;
  provisioning_limit?: number;
  provisioning_used?: number;
  provisioning_remaining?: number;
  provisioning_resets_at?: string;
  domains: CustomDomainRecord[];
  page: number;
  has_more: boolean;
}

export async function listCustomDomains(page = 1): Promise<CustomDomainListResponse> {
  return pb.send("/api/domains", { method: "GET", query: { page }, requestKey: null });
}

export async function listCustomDomainsForTarget(
  targetType: CustomDomainTargetType,
  targetId: string,
  page = 1,
): Promise<CustomDomainListResponse> {
  const response = await pb.send<CustomDomainListResponse>("/api/domains", {
    method: "GET",
    query: { page, target_type: targetType, target_id: targetId },
    requestKey: null,
  });
  // Keep staggered frontend/backend deploys safe: an older API ignores the
  // target query, so never trust it to have narrowed the owner-scoped result.
  return {
    ...response,
    domains: response.domains.filter((domain) => domain.target_type === targetType && domain.target_id === targetId),
  };
}

export async function createCustomDomain(input: {
  hostname: string;
  target_type: CustomDomainTargetType;
  target_id: string;
}): Promise<CustomDomainRecord> {
  const response = await pb.send<{ domain: CustomDomainRecord }>("/api/domains", {
    method: "POST",
    body: { ...input, hostname: normalizeCustomDomainInput(input.hostname) },
    requestKey: null,
  });
  return response.domain;
}

export async function updateCustomDomainTarget(
  id: string,
  target_type: CustomDomainTargetType,
  target_id: string,
): Promise<CustomDomainRecord> {
  const response = await pb.send<{ domain: CustomDomainRecord }>(`/api/domains/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { target_type, target_id },
    requestKey: null,
  });
  return response.domain;
}

export async function verifyCustomDomain(id: string): Promise<CustomDomainRecord> {
  const response = await pb.send<{ domain: CustomDomainRecord }>(`/api/domains/${encodeURIComponent(id)}/verify`, {
    method: "POST",
    requestKey: null,
  });
  return response.domain;
}

export async function deleteCustomDomain(id: string): Promise<void> {
  await pb.send(`/api/domains/${encodeURIComponent(id)}`, { method: "DELETE", requestKey: null });
}

export async function getPublicCustomDomainTarget(): Promise<CustomDomainTarget> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const unavailable = "Domain resolution is temporarily unavailable.";
  try {
    const response = await fetch(new URL("/api/public/custom-domain", window.location.origin), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new PublicAssetRequestError(response.status, response.status === 404 ? "Domain not found" : unavailable);
    }
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") throw new PublicAssetRequestError(503, unavailable);
    const { type, id, slug } = payload as Partial<CustomDomainTarget>;
    if ((type !== "link" && type !== "profile") || typeof id !== "string" || !/^[a-z0-9]{15}$/.test(id)
      || typeof slug !== "string" || !/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(slug)) {
      throw new PublicAssetRequestError(503, unavailable);
    }
    return { type, id, slug };
  } catch (error) {
    if (error instanceof PublicAssetRequestError) throw error;
    // A timeout or malformed response is not evidence of a missing domain.
    throw new PublicAssetRequestError(0, unavailable);
  } finally {
    clearTimeout(timeout);
  }
}
