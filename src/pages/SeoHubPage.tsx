import { ArrowRight, BookOpen, Layers3, Palette, Sparkles, Wrench } from "lucide-react";
import { Link } from "react-router-dom";

import Footer from "@/components/Footer";
import { useSeo } from "@/hooks/useSeo";
import { SEO_CONTENT_PAGES, SeoContentKind } from "@/lib/seoContent";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";

type HubKind = Extract<SeoContentKind, "feature" | "template" | "tool" | "guide">;

interface SeoHubPageProps {
  kind: HubKind;
}

const hubContent: Record<HubKind, {
  eyebrow: string;
  title: string;
  description: string;
  lead: string;
  cardLabel: string;
}> = {
  feature: {
    eyebrow: "PRODUCT CAPABILITIES",
    title: "Linktery Features",
    description: "Explore Linktery features for short links, public profiles, analytics, deep linking, routing, custom domains, QR codes, and API workflows.",
    lead: "Start with the outcome you need, then explore the Linktery capability that supports it. Every feature page explains the workflow, limits, and practical use cases.",
    cardLabel: "Explore feature",
  },
  template: {
    eyebrow: "PUBLIC PROFILE DESIGN",
    title: "Link-in-Bio Templates",
    description: "Compare Linktery public-profile templates, including Classic Cover, Compact Circle, Banner Circle, Hero Portrait, and Cutout Editorial.",
    lead: "Choose a profile structure that matches your content and audience. Each template keeps the same managed links and analytics while changing the visual hierarchy.",
    cardLabel: "View template",
  },
  tool: {
    eyebrow: "FREE BROWSER TOOLS",
    title: "Link & Campaign Tools",
    description: "Use Linktery's free UTM builder and URL QR code generator, then connect the result to managed links and analytics when needed.",
    lead: "Small utilities for common campaign tasks. Build a tagged URL or downloadable QR code directly in the browser without turning a simple job into a setup project.",
    cardLabel: "Open tool",
  },
  guide: {
    eyebrow: "PRACTICAL RESOURCES",
    title: "Link Management Guides",
    description: "Learn how to build, route, brand, measure, and maintain short links and link-in-bio profiles with practical Linktery guides.",
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

const hubIcon: Record<HubKind, typeof Sparkles> = {
  feature: Layers3,
  template: Palette,
  tool: Wrench,
  guide: BookOpen,
};

export default function SeoHubPage({ kind }: SeoHubPageProps) {
  const content = hubContent[kind];
  const path = hubPath[kind];
  const Icon = hubIcon[kind];
  const pages = SEO_CONTENT_PAGES.filter((page) => page.kind === kind);

  useSeo({
    title: `${content.title} | Linktery`,
    description: content.description,
    canonical: path,
    structuredData: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          "@id": `${PRIMARY_ORIGIN}${path}#collection`,
          url: `${PRIMARY_ORIGIN}${path}`,
          name: content.title,
          description: content.description,
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Linktery home">
            <img src="/logo.webp" alt="" className="h-11 w-auto mix-blend-screen" />
            <span className="text-xl font-extrabold tracking-tight">Linktery</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Resource categories">
            <Link className="transition-colors hover:text-foreground" to="/features">Features</Link>
            <Link className="transition-colors hover:text-foreground" to="/templates">Templates</Link>
            <Link className="transition-colors hover:text-foreground" to="/guides">Guides</Link>
            <Link className="transition-colors hover:text-foreground" to="/tools">Tools</Link>
            <Link className="transition-colors hover:text-foreground" to="/pricing">Pricing</Link>
          </nav>
          <Link to="/register" className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-foreground transition-transform hover:-translate-y-0.5">
            Start free
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border/60 px-5 py-16 sm:px-6 sm:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,hsl(var(--accent)/0.14),transparent_36%),radial-gradient(circle_at_80%_70%,rgba(16,185,129,0.08),transparent_32%)]" />
          <div className="relative mx-auto max-w-7xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs font-bold tracking-[0.14em] text-accent">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {content.eyebrow}
            </div>
            <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">{content.title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">{content.lead}</p>
          </div>
        </section>

        <section className="px-5 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-accent">{pages.length} resources</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Choose where to start</h2>
              </div>
              <Link to="/solutions" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-accent">
                Browse solutions <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pages.map((page) => (
                <article key={page.path} className="group flex min-h-64 flex-col rounded-2xl border border-border bg-card/55 p-6 transition-colors hover:border-accent/45 hover:bg-card">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{page.eyebrow}</p>
                  <h2 className="mt-4 text-xl font-extrabold tracking-tight">{page.title}</h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{page.lead}</p>
                  <Link to={page.path} className="mt-auto inline-flex items-center gap-2 pt-7 text-sm font-bold text-accent">
                    {content.cardLabel}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 bg-card/25 px-5 py-14 sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <Sparkles className="h-7 w-7 text-accent" aria-hidden="true" />
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight">Build the next step</h2>
            <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Create a short link or public profile, then use these resources as a reference while you configure and measure it.</p>
            <Link to="/register" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-bold text-accent-foreground">
              Create a free account <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
