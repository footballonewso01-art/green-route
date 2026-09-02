import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";

import BrandWordmark from "@/components/BrandWordmark";
import { exploreLinks, resourceLinks } from "@/lib/marketingLinks";
import styles from "./Footer.module.css";

const footerLinkClass =
  "inline-flex min-h-11 items-center whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-accent focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const landingFooterGroups = [
  { title: "Product", label: "Linktery product", links: exploreLinks.slice(0, 3) },
  { title: "Discover", label: "Discover Linktery", links: exploreLinks.slice(3) },
  { title: "Resources", label: "Linktery resources", links: resourceLinks.slice(0, 3) },
] as const;

const legalLinks = resourceLinks.slice(3);

interface FooterProps {
  variant?: "default" | "landing";
}

function LegacyFooter() {
  return (
    <footer className="relative z-10 border-t border-border/60 bg-background/70 px-4 font-sans sm:px-6">
      <div className="mx-auto max-w-7xl">
        <section
          aria-labelledby="footer-cta-title"
          data-footer-cta="true"
          className="grid gap-7 border-b border-border/50 pb-7 pt-10 sm:pb-8 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
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
            <BrandWordmark tone="light" className="h-8 w-auto" />
          </Link>
          <p className="text-xs leading-5 text-muted-foreground">© 2026 Linktery. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

function LandingFooter() {
  const reduceMotion = useReducedMotion();
  const reveal = reduceMotion ? false : { opacity: 0, y: 20 };
  const transition = (delay: number) => ({
    duration: reduceMotion ? 0 : 0.65,
    delay: reduceMotion ? 0 : delay,
    ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
  });

  return (
    <footer className={styles.landingFooter} data-landing-footer>
      <div className={styles.bridge}>
        <motion.div
          initial={reveal}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={transition(0)}
          className={styles.bridgeInner}
        >
          <section className={styles.ctaCard} aria-labelledby="landing-footer-cta-title" data-footer-cta="true">
            <div className={styles.ctaCopy}>
              <h2 id="landing-footer-cta-title">Put your next link to work.</h2>
              <p>Create a polished profile or smart link, route each visitor, and understand every result.</p>
            </div>
            <Link to="/register" className={styles.ctaAction}>
              Start free <ArrowUpRight size={18} strokeWidth={1.8} aria-hidden="true" />
            </Link>
          </section>
        </motion.div>
      </div>

      <div className={styles.footerBody}>
        <div className={styles.footerInner}>
          <div className={styles.footerGrid}>
            <motion.div
              initial={reveal}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={transition(0)}
              className={styles.brandColumn}
            >
              <Link to="/" aria-label="Linktery home" className={styles.brand}>
                <BrandWordmark tone="light" />
              </Link>
              <p>Smart links, public profiles, and analytics in one workspace.</p>
            </motion.div>

            {landingFooterGroups.map((group, index) => (
              <motion.div
                key={group.title}
                initial={reveal}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={transition(index * 0.07)}
                className={styles.navColumn}
              >
                <h3>{group.title}</h3>
                <nav aria-label={group.label}>
                  {group.links.map((item) => (
                    <Link key={item.to} to={item.to} className={styles.navLink}>{item.label}</Link>
                  ))}
                </nav>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={reveal}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={transition(0.24)}
            className={styles.bottomBar}
          >
            <p>© 2026 Linktery. All rights reserved.</p>
            <nav aria-label="Legal">
              {legalLinks.map((item) => <Link key={item.to} to={item.to} className={styles.navLink}>{item.label}</Link>)}
            </nav>
          </motion.div>
        </div>
      </div>
    </footer>
  );
}

export default function Footer({ variant = "default" }: FooterProps) {
  return variant === "landing" ? <LandingFooter /> : <LegacyFooter />;
}
