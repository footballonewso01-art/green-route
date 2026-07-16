import pages from "@/data/seo-content-pages.json";

export type SeoContentKind = "feature" | "template" | "tool" | "guide";

export interface SeoContentHighlight {
  title: string;
  text: string;
}

export interface SeoContentSection {
  heading: string;
  paragraphs: string[];
  bullets: string[];
}

export interface SeoContentFaq {
  question: string;
  answer: string;
}

export interface SeoContentPageDefinition {
  path: string;
  kind: SeoContentKind;
  templateId?: "hub" | "classic" | "compact" | "banner" | "hero" | "cutout";
  eyebrow: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  lead: string;
  highlights: SeoContentHighlight[];
  sections: SeoContentSection[];
  faqs: SeoContentFaq[];
  related: string[];
}

export const SEO_CONTENT_PAGES = pages as SeoContentPageDefinition[];

export function getSeoContentPage(pathname: string): SeoContentPageDefinition | undefined {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  return SEO_CONTENT_PAGES.find((page) => page.path === normalized);
}

export function getSeoContentLabel(pathname: string): string {
  const pageTitle = getSeoContentPage(pathname)?.title;
  if (pageTitle) return pageTitle;

  const knownLabels: Record<string, string> = {
    "/register": "Create a Free Account",
    "/pricing": "Pricing Plans",
  };
  if (knownLabels[pathname]) return knownLabels[pathname];

  const acronyms = new Set(["qr", "ugc", "url", "utm", "seo"]);
  const slug = pathname.split("/").filter(Boolean).pop();
  if (!slug) return pathname;

  return slug
    .split("-")
    .map((word) => (acronyms.has(word) ? word.toUpperCase() : `${word.charAt(0).toUpperCase()}${word.slice(1)}`))
    .join(" ");
}
