import FeatureHubView from "@/components/features/FeatureHubView";
import GuideHubView from "@/components/guides/GuideHubView";
import TemplateHubView from "@/components/templates/TemplateHubView";
import ToolHubView from "@/components/tools/ToolHubView";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES, type PageSeoConfig } from "@/lib/seo-config";
import { SEO_CONTENT_PAGES, SeoContentKind } from "@/lib/seoContent";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";

type HubKind = Extract<SeoContentKind, "feature" | "template" | "tool" | "guide">;

interface SeoHubPageProps {
  kind: HubKind;
}

const hubContent: Record<HubKind, {
  eyebrow: string;
  title: string;
  lead: string;
  cardLabel: string;
}> = {
  feature: {
    eyebrow: "PRODUCT CAPABILITIES",
    title: "Linktery Features",
    lead: "Start with the outcome you need, then explore the Linktery capability that supports it. Every feature page explains the workflow, limits, and practical use cases.",
    cardLabel: "Explore feature",
  },
  template: {
    eyebrow: "PUBLIC PROFILE DESIGN",
    title: "Link-in-Bio Templates",
    lead: "Choose a profile structure that matches your content and audience. Each template keeps the same managed links and analytics while changing the visual hierarchy.",
    cardLabel: "View template",
  },
  tool: {
    eyebrow: "FREE BROWSER TOOLS",
    title: "Link & Campaign Tools",
    lead: "Small utilities for common campaign tasks. Build a tagged URL or downloadable QR code directly in the browser without turning a simple job into a setup project.",
    cardLabel: "Open tool",
  },
  guide: {
    eyebrow: "PRACTICAL RESOURCES",
    title: "Link Management Guides",
    lead: "Clear, product-aware guides for planning campaigns, choosing the right public URL format, and interpreting traffic without inflated promises.",
    cardLabel: "Read guide",
  },
};

const hubPath: Record<HubKind, string> = {
  feature: "/features",
  template: "/templates",
  tool: "/tools",
  guide: "/guides",
};

const hubSeo: Record<HubKind, PageSeoConfig> = {
  feature: SEO_PAGES.featuresIndex,
  template: SEO_PAGES.templatesIndex,
  tool: SEO_PAGES.toolsIndex,
  guide: SEO_PAGES.guidesIndex,
};

export default function SeoHubPage({ kind }: SeoHubPageProps) {
  const content = hubContent[kind];
  const path = hubPath[kind];
  const seo = hubSeo[kind];
  const pages = SEO_CONTENT_PAGES.filter((page) => page.kind === kind);

  useSeo({
    title: seo.title,
    description: seo.description,
    canonical: path,
    structuredData: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          "@id": `${PRIMARY_ORIGIN}${path}#collection`,
          url: `${PRIMARY_ORIGIN}${path}`,
          name: content.title,
          description: seo.description,
          isPartOf: { "@id": `${PRIMARY_ORIGIN}/#website` },
        },
        {
          "@type": "ItemList",
          itemListElement: pages.map((page, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: page.title,
            url: `${PRIMARY_ORIGIN}${page.path}`,
          })),
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: PRIMARY_ORIGIN },
            { "@type": "ListItem", position: 2, name: content.title, item: `${PRIMARY_ORIGIN}${path}` },
          ],
        },
      ],
    },
  });

  if (kind === "feature") {
    return <FeatureHubView pages={pages} title={content.title} lead={content.lead} />;
  }

  if (kind === "template") {
    return <TemplateHubView pages={pages} title={content.title} />;
  }

  if (kind === "tool") {
    return <ToolHubView pages={pages} title={content.title} />;
  }

  return <GuideHubView pages={pages} title={content.title} />;
}
