import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const exploreLinks = [
  { label: "All Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
  { label: "Profile Templates", to: "/templates" },
  { label: "Solutions", to: "/solutions" },
  { label: "Free Tools", to: "/tools" },
] as const;

const resourceLinks = [
  { label: "API Documentation", to: "/documentation" },
  { label: "Public API", to: "/features/public-api" },
  { label: "Guides", to: "/guides" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
] as const;

const footerLinkClass =
  "inline-flex min-h-11 items-center whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-accent focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-border/60 bg-background/70 px-4 font-sans sm:px-6">
      <div className="mx-auto max-w-7xl">
        <section
          aria-labelledby="footer-cta-title"
          className="grid gap-7 border-b border-border/50 py-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
        >
          <div className="max-w-2xl">
            <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
              One link. Clearer traffic.
            </p>
            <h2 id="footer-cta-title" className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Put your next link to work.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Create a Link-in-Bio profile or smart redirect, then see exactly where your traffic goes.
            </p>
          </div>
          <Link
            to="/register"
            className="btn-primary-glow inline-flex min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap !px-6 !py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-fit"
          >
            Start for free <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        <div className="grid gap-2 border-b border-border/40 py-5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-start sm:gap-6">
          <h3 className="pt-3 text-xs font-bold uppercase tracking-[0.14em] text-foreground">Explore</h3>
          <nav aria-label="Explore Linktery" className="flex min-w-0 flex-wrap gap-x-5">
            {exploreLinks.map((item) => (
              <Link key={item.to} to={item.to} className={footerLinkClass}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="grid gap-2 border-b border-border/40 py-5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-start sm:gap-6">
          <h3 className="pt-3 text-xs font-bold uppercase tracking-[0.14em] text-foreground">Resources</h3>
          <nav aria-label="Linktery resources" className="flex min-w-0 flex-wrap gap-x-5">
            {resourceLinks.map((item) => (
              <Link key={item.to} to={item.to} className={footerLinkClass}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/"
            aria-label="Linktery home"
            className="flex min-h-11 w-fit items-center gap-2.5 transition-opacity hover:opacity-80 focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <img src="/logo.webp" alt="" className="h-10 w-auto mix-blend-screen" />
            <span className="text-base font-extrabold tracking-tight text-foreground">Linktery</span>
          </Link>
          <p className="text-xs leading-5 text-muted-foreground">© 2026 Linktery. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
