import type { SeoContentPageDefinition } from "@/lib/seoContent";

export const guideTopics = [
  { id: "all", label: "All guides" },
  { id: "essentials", label: "Essentials" },
  { id: "tracking", label: "Traffic & tracking" },
  { id: "api", label: "API recipes" },
  { id: "migration", label: "Migration" },
] as const;

export type GuideTopic = (typeof guideTopics)[number]["id"];

interface GuidePresentation {
  topic: Exclude<GuideTopic, "all">;
  summary: string;
}

export const guidePresentation: Record<string, GuidePresentation> = {
  "/guides/what-is-link-management": {
    topic: "essentials",
    summary: "Look beyond shortening. Learn how to organize shared URLs, update their destinations, and make sense of the traffic they bring.",
  },
  "/guides/url-shortener-vs-link-in-bio": {
    topic: "essentials",
    summary: "One destination or a page of choices? Pick the right format for the next link you share.",
  },
  "/guides/what-is-a-smart-link": {
    topic: "essentials",
    summary: "Understand routing rules, visitor signals, and fallback destinations before setting up your first smart link.",
  },
  "/guides/how-to-track-link-clicks": {
    topic: "tracking",
    summary: "Plan what to measure, name your campaign links consistently, and learn what a click count can actually tell you.",
  },
  "/guides/how-to-create-branded-short-url": {
    topic: "essentials",
    summary: "Choose a recognizable domain, verify its DNS settings, and test your branded link before sharing it.",
  },
  "/guides/dynamic-vs-static-qr-codes": {
    topic: "tracking",
    summary: "Know what a QR code stores and when a managed destination lets you change a link without reprinting.",
  },
  "/guides/utm-parameters-guide": {
    topic: "tracking",
    summary: "Get the five common UTM fields right and build naming conventions that keep campaign reports useful.",
  },
  "/guides/how-to-create-a-link-in-bio": {
    topic: "essentials",
    summary: "Choose a primary action, organize your content, and check the mobile experience before publishing your profile.",
  },
  "/guides/link-in-bio-analytics-guide": {
    topic: "tracking",
    summary: "Read profile views, unique visits, and card clicks together to find out where your page could work better.",
  },
  "/guides/deep-links-and-in-app-browsers": {
    topic: "tracking",
    summary: "See why links behave differently inside social apps, and build a realistic testing checklist for app handoffs.",
  },
  "/guides/create-short-links-with-linktery-api": {
    topic: "api",
    summary: "Create links from a CRM or publishing workflow, handle the response, and keep your API key out of the browser.",
  },
  "/guides/build-link-analytics-dashboard-with-api": {
    topic: "api",
    summary: "Turn aggregate link data into dashboard widgets, with sensible caching and safe server-side authentication.",
  },
  "/guides/migrate-from-linktree-to-linktery": {
    topic: "migration",
    summary: "Inventory your links, rebuild your profile, and test the new page before switching the URL in your bio.",
  },
  "/guides/migrate-from-bitly-to-linktery": {
    topic: "migration",
    summary: "Plan the move for your links, domains, and reporting records, then send traffic to the new routes in stages.",
  },
};

export function getGuidePresentation(page: SeoContentPageDefinition): GuidePresentation {
  return guidePresentation[page.path] ?? { topic: "essentials", summary: page.lead };
}

export function guideMatchesSearch(page: SeoContentPageDefinition, query: string): boolean {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const presentation = getGuidePresentation(page);
  const topicLabel = guideTopics.find((topic) => topic.id === presentation.topic)?.label ?? "";
  const searchable = [page.title, page.lead, page.path, presentation.summary, topicLabel, ...page.sections.map((section) => section.heading)].join(" ").toLocaleLowerCase();
  return words.every((word) => searchable.includes(word));
}
