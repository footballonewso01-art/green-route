export const LINK_CARD_STYLE_IDS = [
  "minimal",
  "solid",
  "outline",
  "glass",
  "image-first",
] as const;

export type LinkCardStyleId = (typeof LINK_CARD_STYLE_IDS)[number];

export interface LinkCardStyleDefinition {
  id: LinkCardStyleId;
  name: string;
  description: string;
}

export const LINK_CARD_STYLES: LinkCardStyleDefinition[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Quiet rows that keep attention on the link titles.",
  },
  {
    id: "solid",
    name: "Solid",
    description: "High-contrast cards built for fast scanning and clicks.",
  },
  {
    id: "outline",
    name: "Outline",
    description: "Clean transparent cards with a precise border.",
  },
  {
    id: "glass",
    name: "Glass",
    description: "Layered translucent cards with subtle depth.",
  },
  {
    id: "image-first",
    name: "Image-first",
    description: "Visual cards that give uploaded link images more weight.",
  },
];

export const SOCIAL_LINK_STYLE_IDS = [
  "icons",
  "branded-pills",
] as const;

export type SocialLinkStyleId = (typeof SOCIAL_LINK_STYLE_IDS)[number];

export interface SocialLinkStyleDefinition {
  id: SocialLinkStyleId;
  name: string;
  description: string;
}

export const SOCIAL_LINK_STYLES: SocialLinkStyleDefinition[] = [
  {
    id: "icons",
    name: "Icons",
    description: "A compact social dock that keeps the header light.",
  },
  {
    id: "branded-pills",
    name: "Branded Pills",
    description: "Recognizable platform colors with short labels.",
  },
];

export function normalizeLinkCardStyle(value: unknown): LinkCardStyleId {
  return typeof value === "string" && LINK_CARD_STYLE_IDS.includes(value as LinkCardStyleId)
    ? (value as LinkCardStyleId)
    : "glass";
}

export function normalizeSocialLinkStyle(value: unknown): SocialLinkStyleId {
  return typeof value === "string" && SOCIAL_LINK_STYLE_IDS.includes(value as SocialLinkStyleId)
    ? (value as SocialLinkStyleId)
    : "icons";
}
