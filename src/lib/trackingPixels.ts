export type TrackingPixelInput = {
  fb_pixel?: unknown;
  google_pixel?: unknown;
  tiktok_pixel?: unknown;
};

export type NormalizedTrackingPixels = {
  valid: boolean;
  error?: string;
  meta: string;
  google: string;
  tiktok: string;
};

export function normalizeTrackingPixels(input: TrackingPixelInput): NormalizedTrackingPixels {
  const meta = typeof input.fb_pixel === "string" ? input.fb_pixel.trim() : "";
  const google = typeof input.google_pixel === "string" ? input.google_pixel.trim().toUpperCase() : "";
  const tiktok = typeof input.tiktok_pixel === "string" ? input.tiktok_pixel.trim().toUpperCase() : "";

  if (meta && !/^[0-9]{5,32}$/.test(meta)) {
    return { valid: false, error: "Meta Pixel ID must contain only 5–32 digits.", meta: "", google: "", tiktok: "" };
  }
  if (google && !/^(?:GT|G|AW|DC)-[A-Z0-9]{4,32}$/.test(google)) {
    return { valid: false, error: "Use a valid Google tag ID with a GT-, G-, AW-, or DC- prefix.", meta: "", google: "", tiktok: "" };
  }
  if (tiktok && !/^[A-Z0-9]{8,64}$/.test(tiktok)) {
    return { valid: false, error: "TikTok Pixel ID must contain only 8–64 letters or numbers.", meta: "", google: "", tiktok: "" };
  }

  return { valid: true, meta, google, tiktok };
}
