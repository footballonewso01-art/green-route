import type { LinkCardStyleId } from "@/lib/profileAppearance";
import type { ProfileTemplateId } from "@/lib/profileTemplates";

export const templateFilters = [
  { id: "all", label: "All layouts" },
  { id: "portrait", label: "Portrait-led" },
  { id: "content", label: "Content-first" },
] as const;

export type TemplateFilter = typeof templateFilters[number]["id"];

interface TemplatePresentation {
  category: Exclude<TemplateFilter, "all">;
  summary: string;
  detail: string;
  color: string;
  cardStyle: LinkCardStyleId;
  traits: [string, string, string];
}

// These are editable example styles, not additional product templates or customer profiles.
export const templatePresentation: Record<ProfileTemplateId, TemplatePresentation> = {
  classic: {
    category: "portrait",
    summary: "A cinematic cover with a soft transition into your links.",
    detail: "Lead with a strong image, then let your content follow. A familiar starting point for a personal brand or creative business.",
    color: "#101e18",
    cardStyle: "glass",
    traits: ["Large cover image", "Centered identity", "Soft image transition"],
  },
  compact: {
    category: "content",
    summary: "A smaller introduction. More room for what you share.",
    detail: "Keep your identity compact and bring your destinations into view sooner. Well suited to a focused collection of resources.",
    color: "#f0e8dc",
    cardStyle: "solid",
    traits: ["Circular avatar", "Links near the top", "Optional image background"],
  },
  banner: {
    category: "content",
    summary: "A wide banner and a familiar, floating profile image.",
    detail: "Pair a broad visual introduction with a clear profile identity. Your avatar stays distinct from the surrounding composition.",
    color: "#dbe6ee",
    cardStyle: "outline",
    traits: ["Wide image treatment", "Floating circular avatar", "Centered content"],
  },
  hero: {
    category: "portrait",
    summary: "An immersive portrait that puts your identity up front.",
    detail: "Let a portrait set the scene, with your name and introduction layered over the image before visitors reach your links.",
    color: "#14181c",
    cardStyle: "image-first",
    traits: ["Portrait-led opening", "Layered name and bio", "Full-width image"],
  },
  cutout: {
    category: "portrait",
    summary: "An asymmetric composition with an editorial point of view.",
    detail: "Combine an offset portrait with expressive typography. A distinctive layout for a concise portfolio or creative profile.",
    color: "#e8dded",
    cardStyle: "minimal",
    traits: ["Offset portrait", "Editorial typography", "Left-aligned identity"],
  },
  visual: {
    category: "content",
    summary: "Full-canvas imagery with your content layered on top.",
    detail: "Use background artwork to set the mood across the whole page. The profile identity and link cards float above it.",
    color: "#10251f",
    cardStyle: "glass",
    traits: ["Full-page background", "Floating identity", "Layered link cards"],
  },
};
