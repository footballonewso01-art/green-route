import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import MarketingHeader from "@/components/MarketingHeader";
import { comparisonCriteria, competitors } from "@/components/alternatives/alternativeData";
import styles from "@/components/alternatives/Alternatives.module.css";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";
import { createPageBreadcrumbSchema } from "@/lib/breadcrumbSchema";
import "@/styles/landing-rebrand.css";

export default function AlternativesIndex() {
  const [query, setQuery] = useState("");
  const reduceMotion = useReducedMotion();

  useSeo({
    ...SEO_PAGES.alternativesIndex,
    structuredData: createPageBreadcrumbSchema("Alternatives", SEO_PAGES.alternativesIndex.canonical),
  });

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return competitors;
    return competitors.filter((competitor) => [
      competitor.name,
      competitor.description,
      competitor.topic,
      ...competitor.strengths,
    ].some((value) => value.toLowerCase().includes(normalized)));
  }, [query]);

  return (
    <div className={styles.page} data-alternatives-index>
      <a href="#alternative-directory" className={styles.skipLink}>Skip to alternatives</a>
      <MarketingHeader current="alternatives" />
      <main>
        <section className={styles.indexHero}>
          <div className={`${styles.container} ${styles.indexHeroGrid}`}>
            <motion.div
              className={styles.indexHeroCopy}
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: .65, ease: [.16, 1, .3, 1] }}
            >
              <span className={styles.eyebrow}>Link-in-bio alternatives</span>
              <h1>Choose the tool by the work it needs to do.</h1>
              <p>Explore {competitors.length} alternative and migration guides. Compare page control, routing, analytics, and domain ownership against the work you need to do.</p>
              <div className={styles.heroActions}>
                <a href="#alternative-directory">Compare platforms<ArrowRight size={17} aria-hidden="true" /></a>
                <Link to="/pricing">See Linktery plans<ArrowUpRight size={16} aria-hidden="true" /></Link>
              </div>
            </motion.div>

            <motion.div
              className={styles.decisionBoard}
              initial={reduceMotion ? false : { opacity: 0, y: 14, scale: .985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: .7, delay: .08, ease: [.16, 1, .3, 1] }}
              aria-label="Comparison framework"
            >
              <div className={styles.boardHeader}><span>Decision framework</span><span><i />{competitors.length} reviews</span></div>
              <div className={styles.boardLead}><SlidersHorizontal size={32} strokeWidth={1.35} aria-hidden="true" /><span>One framework</span><strong>Four questions before you switch.</strong></div>
              <ul>{comparisonCriteria.map((criterion) => <li key={criterion.label}><div><strong>{criterion.label}</strong><p>{criterion.description}</p></div><Check size={15} aria-hidden="true" /></li>)}</ul>
            </motion.div>
          </div>
        </section>

        <section id="alternative-directory" className={styles.directory} aria-labelledby="alternative-directory-title">
          <div className={styles.container}>
            <div className={styles.directoryHeader}>
              <div><span>Platform directory</span><h2 id="alternative-directory-title">Start with the product you already know.</h2></div>
              <div className={styles.searchField}>
                <Search size={18} aria-hidden="true" />
                <label className="sr-only" htmlFor="alternative-search">Search alternatives</label>
                <input id="alternative-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setQuery(""); }} placeholder="Search a platform" />
                {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={16} aria-hidden="true" /></button>}
              </div>
            </div>

            <div className={styles.resultLine} aria-live="polite"><span>{results.length} {results.length === 1 ? "match" : "comparisons"}</span><p>Provider pricing and features can change. Verify the official plan page before purchasing.</p></div>

            {results.length > 0 ? (
              <div className={styles.alternativeGrid}>
                {results.map((competitor, index) => (
                  <motion.article
                    key={competitor.slug}
                    className={styles.alternativeCard}
                    initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: .12 }}
                    transition={{ duration: .5, delay: (index % 4) * .035, ease: [.16, 1, .3, 1] }}
                  >
                    <div className={styles.cardTop}><span className={styles.competitorMark} aria-hidden="true">{competitor.name.slice(0, 2)}</span><span>{competitor.migrationOnly ? "Migration guide" : "Alternative review"}</span></div>
                    <div className={styles.cardCopy}><h3>{competitor.name}</h3><p>{competitor.description}</p></div>
                    <dl className={styles.cardFacts}>
                      <div><dt>Compare for</dt><dd>{competitor.topic}</dd></div>
                      <div><dt>Plan context</dt><dd>{competitor.facts.paid}</dd></div>
                    </dl>
                    <Link to={`/alternatives/${competitor.slug}`} aria-label={`Compare Linktery with ${competitor.name}`}>Compare with Linktery<ArrowRight size={17} aria-hidden="true" /></Link>
                  </motion.article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}><strong>No platform matches “{query}”.</strong><p>Try the company name or a capability such as analytics, domains, or routing.</p><button type="button" onClick={() => setQuery("")}>Show all alternatives</button></div>
            )}
          </div>
        </section>

        <section className={styles.indexCta}>
          <div className={`${styles.container} ${styles.ctaCard}`}><div><span>Compare the product itself</span><h2>See the plans behind the Linktery side of every review.</h2></div><Link to="/pricing">Compare Linktery plans<ArrowUpRight size={18} aria-hidden="true" /></Link></div>
        </section>
      </main>
      <Footer variant="landing" />
    </div>
  );
}
