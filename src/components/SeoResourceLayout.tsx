import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronRight, ExternalLink } from "lucide-react";
import Footer from "@/components/Footer";
import { useSeo } from "@/hooks/useSeo";
import {
  getSeoContentLabel,
  SeoContentPageDefinition,
} from "@/lib/seoContent";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";

interface SeoResourceLayoutProps {
  page: SeoContentPageDefinition;
  children?: ReactNode;
  preview?: ReactNode;
}

const kindLabels: Record<SeoContentPageDefinition["kind"], string> = {
  feature: "Features",
  template: "Templates",
  tool: "Tools",
  guide: "Guides",
};

export default function SeoResourceLayout({ page, children, preview }: SeoResourceLayoutProps) {
  const sectionRoot = `/${page.kind === "feature" ? "features" : page.kind === "template" ? "templates" : page.kind === "tool" ? "tools" : "guides"}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": page.kind === "guide" ? "Article" : "WebPage",
        "@id": `${PRIMARY_ORIGIN}${page.path}#page`,
        url: `${PRIMARY_ORIGIN}${page.path}`,
        name: page.seoTitle,
        description: page.seoDescription,
        ...(page.kind === "guide" ? {
          headline: page.title,
          author: { "@id": `${PRIMARY_ORIGIN}/#organization` },
          publisher: { "@id": `${PRIMARY_ORIGIN}/#organization` },
        } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: PRIMARY_ORIGIN },
          { "@type": "ListItem", position: 2, name: kindLabels[page.kind], item: `${PRIMARY_ORIGIN}${sectionRoot}` },
          { "@type": "ListItem", position: 3, name: page.title, item: `${PRIMARY_ORIGIN}${page.path}` },
        ],
      },
    ],
  };

  useSeo({
    title: page.seoTitle,
    description: page.seoDescription,
    canonical: page.path,
    faq: page.faqs,
    structuredData,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Linktery home">
            <img src="/logo.webp" alt="" className="h-11 w-auto mix-blend-screen" />
            <span className="text-xl font-extrabold tracking-tight">Linktery</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="SEO resources">
            <Link className="transition-colors hover:text-foreground" to="/features/link-management">Features</Link>
            <Link className="transition-colors hover:text-foreground" to="/templates/link-in-bio">Templates</Link>
            <Link className="transition-colors hover:text-foreground" to="/guides/what-is-link-management">Guides</Link>
            <Link className="transition-colors hover:text-foreground" to="/pricing">Pricing</Link>
          </nav>
          <Link to="/register" className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-foreground transition-transform hover:-translate-y-0.5">
            Start free
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border/60 px-5 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,hsl(var(--accent)/0.14),transparent_34%),radial-gradient(circle_at_82%_64%,rgba(16,185,129,0.08),transparent_36%)]" />
          <div className="relative mx-auto max-w-7xl">
            <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{kindLabels[page.kind]}</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-foreground">{page.title}</span>
            </nav>

            <div className={`grid items-center gap-10 ${preview ? "lg:grid-cols-[1.05fr_0.95fr]" : "max-w-4xl"}`}>
              <div>
                <div className="mb-5 inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs font-bold tracking-[0.16em] text-accent">
                  {page.eyebrow}
                </div>
                <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                  {page.title}
                </h1>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
                  {page.lead}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-bold text-accent-foreground transition-transform hover:-translate-y-0.5">
                    Create a free Linktery <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/pricing" className="inline-flex items-center justify-center rounded-xl border border-border bg-card/70 px-5 py-3 font-semibold hover:bg-card">
                    Compare plans
                  </Link>
                </div>
              </div>
              {preview}
            </div>
          </div>
        </section>

        {page.highlights.length > 0 && (
          <section className="border-b border-border/60 px-5 py-12 sm:px-6">
            <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
              {page.highlights.map((highlight) => (
                <article key={highlight.title} className="rounded-2xl border border-border bg-card/60 p-6">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Check className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg font-bold">{highlight.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{highlight.text}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {children}

        <article className="px-5 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-4xl space-y-16">
            {page.sections.map((section) => (
              <section key={section.heading} className="scroll-mt-24">
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{section.heading}</h2>
                <div className="mt-5 space-y-4 text-base leading-8 text-muted-foreground sm:text-lg">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
                {section.bullets.length > 0 && (
                  <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/40 p-4 text-sm leading-6">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-accent" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </article>

        <section className="border-y border-border/60 bg-card/25 px-5 py-16 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-extrabold tracking-tight">Frequently asked questions</h2>
            <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-background/70 px-5 sm:px-7">
              {page.faqs.map((faq) => (
                <details key={faq.question} className="group py-5">
                  <summary className="cursor-pointer list-none pr-8 font-bold marker:content-none">
                    {faq.question}
                  </summary>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-2xl font-extrabold tracking-tight">Continue exploring</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {page.related.map((path) => (
                <Link key={path} to={path} className="group flex min-h-32 flex-col justify-between rounded-2xl border border-border bg-card/50 p-5 transition-colors hover:border-accent/50 hover:bg-card">
                  <span className="font-bold">{getSeoContentLabel(path)}</span>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                    Open resource <ExternalLink className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
