export const PROFILE_TEMPLATE_IDS = [
  "classic",
  "compact",
  "banner",
  "hero",
  "cutout",
  "visual",
] as const;

export type ProfileTemplateId = (typeof PROFILE_TEMPLATE_IDS)[number];

export interface ProfileTemplateDefinition {
  id: ProfileTemplateId;
  name: string;
  description: string;
  supportsImageBackground: boolean;
}

export const PROFILE_TEMPLATES: ProfileTemplateDefinition[] = [
  {
    id: "classic",
    name: "Classic Cover",
    description: "Large cinematic portrait with a soft fade into the profile.",
    supportsImageBackground: false,
  },
  {
    id: "compact",
    name: "Compact Circle",
    description: "Small circular avatar with links visible immediately.",
    supportsImageBackground: true,
  },
  {
    id: "banner",
    name: "Banner Circle",
    description: "Wide banner with a floating circular profile picture.",
    supportsImageBackground: false,
  },
  {
    id: "hero",
    name: "Hero Portrait",
    description: "Immersive portrait with identity layered over the image.",
    supportsImageBackground: false,
  },
  {
    id: "cutout",
    name: "Cutout Editorial",
    description: "Bold asymmetric portrait and magazine-style typography.",
    supportsImageBackground: false,
  },
  {
    id: "visual",
    name: "Visual Canvas",
    description: "Full-canvas artwork with a floating identity and layered cards.",
    supportsImageBackground: true,
  },
];

export const PROFILE_BACKGROUND_MODES = ["color", "image"] as const;
export type ProfileBackgroundMode = (typeof PROFILE_BACKGROUND_MODES)[number];

export const PROFILE_BACKGROUND_POSITIONS = ["top", "center", "bottom"] as const;
export type ProfileBackgroundPosition = (typeof PROFILE_BACKGROUND_POSITIONS)[number];

export const PROFILE_BACKGROUND_OVERLAYS = ["light", "balanced", "strong"] as const;
export type ProfileBackgroundOverlay = (typeof PROFILE_BACKGROUND_OVERLAYS)[number];

export function supportsProfileImageBackground(template: ProfileTemplateId): boolean {
  return PROFILE_TEMPLATES.find((item) => item.id === template)?.supportsImageBackground === true;
}

export function normalizeProfileTemplate(value: unknown): ProfileTemplateId {
  return typeof value === "string" && PROFILE_TEMPLATE_IDS.includes(value as ProfileTemplateId)
    ? (value as ProfileTemplateId)
    : "classic";
}

export function normalizeProfileBackgroundMode(value: unknown): ProfileBackgroundMode {
  return typeof value === "string" && PROFILE_BACKGROUND_MODES.includes(value as ProfileBackgroundMode)
    ? (value as ProfileBackgroundMode)
    : "color";
}

export function normalizeProfileBackgroundPosition(value: unknown): ProfileBackgroundPosition {
  return typeof value === "string" && PROFILE_BACKGROUND_POSITIONS.includes(value as ProfileBackgroundPosition)
    ? (value as ProfileBackgroundPosition)
    : "center";
}

export function normalizeProfileBackgroundOverlay(value: unknown): ProfileBackgroundOverlay {
  return typeof value === "string" && PROFILE_BACKGROUND_OVERLAYS.includes(value as ProfileBackgroundOverlay)
    ? (value as ProfileBackgroundOverlay)
    : "balanced";
}

export function isLightProfileColor(hex: string): boolean {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return false;

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return red * 0.299 + green * 0.587 + blue * 0.114 > 150;
}
