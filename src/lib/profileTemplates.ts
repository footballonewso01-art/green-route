export const PROFILE_TEMPLATE_IDS = [
  "classic",
  "compact",
  "banner",
  "hero",
  "cutout",
] as const;

export type ProfileTemplateId = (typeof PROFILE_TEMPLATE_IDS)[number];

export interface ProfileTemplateDefinition {
  id: ProfileTemplateId;
  name: string;
  description: string;
}

export const PROFILE_TEMPLATES: ProfileTemplateDefinition[] = [
  {
    id: "classic",
    name: "Classic Cover",
    description: "Large cinematic portrait with a soft fade into the profile.",
  },
  {
    id: "compact",
    name: "Compact Circle",
    description: "Small circular avatar with links visible immediately.",
  },
  {
    id: "banner",
    name: "Banner Circle",
    description: "Wide banner with a floating circular profile picture.",
  },
  {
    id: "hero",
    name: "Hero Portrait",
    description: "Immersive portrait with identity layered over the image.",
  },
  {
    id: "cutout",
    name: "Cutout Editorial",
    description: "Bold asymmetric portrait and magazine-style typography.",
  },
];

export function normalizeProfileTemplate(value: unknown): ProfileTemplateId {
  return typeof value === "string" && PROFILE_TEMPLATE_IDS.includes(value as ProfileTemplateId)
    ? (value as ProfileTemplateId)
    : "classic";
}

export function isLightProfileColor(hex: string): boolean {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return false;

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return red * 0.299 + green * 0.587 + blue * 0.114 > 150;
}
