import { useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, ChevronRight, CircleAlert, ExternalLink } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import Footer from "@/components/Footer";
import MarketingHeader from "@/components/MarketingHeader";
import BrandWordmark from "@/components/BrandWordmark";
import { competitors } from "@/components/alternatives/alternativeData";
import { comparisonPath, getComparisonFaq, getComparisonRows, productBriefs, resolveComparison, type ComparisonProduct } from "@/components/comparisons/comparisonData";
import styles from "@/components/comparisons/Comparisons.module.css";
import { comparisonEditorial } from "@/components/comparisons/comparisonEditorial";
import indexableComparisons from "@/data/indexable-comparisons.json";
import { useSeo } from "@/hooks/useSeo";
import { PLANS } from "@/lib/plans";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";
import "@/styles/landing-rebrand.css";

const sortedProducts = [...competitors].sort((a, b) => a.name.localeCompare(b.name));

function ComparisonPage({ a, b }: { a: ComparisonProduct; b: ComparisonProduct }) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [first, setFirst] = useState(a.slug);
  const [second, setSecond] = useState(b.slug);
  const canonical = comparisonPath(a, b);
  const editorial = comparisonEditorial[canonical.replace("/compare/", "")];
  const faq = getComparisonFaq(a, b);
  const rows = getComparisonRows(a, b);
  const migrationComparison = a.migrationOnly || b.migrationOnly;
  const pair = [a, b];
  const related = sortedProducts.filter((item) => item.slug !== a.slug && item.slug !== b.slug);
  const reveal = {
    initial: reduceMotion ? false as const : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: .12 },
    transition: { duration: .55, ease: [.16, 1, .3, 1] as [number, number, number, number] },
  };

  useSeo({
    title: `${a.name} vs ${b.name}: Features & Pricing | Linktery`,
    description: `Compare ${a.name} vs ${b.name} side-by-side, including published pricing, deep linking, custom domains, transaction fees, and analytics features.`,
    canonical,
    noIndex: !(indexableComparisons as string[]).includes(canonical.replace("/compare/", "")),
    followLinksOnNoIndex: true,
    faq,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: PRIMARY_ORIGIN },
        { "@type": "ListItem", position: 2, name: "Alternatives", item: `${PRIMARY_ORIGIN}/alternatives` },
        { "@type": "ListItem", position: 3, name: `${a.name} vs ${b.name}`, item: `${PRIMARY_ORIGIN}${canonical}` },
      ],
    },
  });

  function changeComparison(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = resolveComparison(`${first}-vs-${second}`);
    if (selected) navigate(comparisonPath(...selected));
  }

  return (
    <div className={styles.page} data-comparison-detail={`${a.slug}-vs-${b.slug}`}>
      <a href="#comparison-table" className={styles.skipLink}>Skip to comparison</a>
      <MarketingHeader current="alternatives" />
      <main>
        <section className={styles.intro} aria-labelledby="comparison-heading">
          <div className={styles.container}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link to="/alternatives">All alternatives</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">Platform comparison</span>
            </nav>
            <motion.div className={styles.titleRow} initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }}>
              <div>
                <h1 id="comparison-heading">{a.name} <span>vs</span> {b.name}</h1>
                <p>{migrationComparison ? "Check availability, preserve what matters, and plan the next destination." : "Two platforms. A closer look at the tools, terms, and trade-offs."}</p>
              </div>
              <a href="#comparison-table" className={styles.tableLink}>Compare the details<ArrowRight size={17} aria-hidden="true" /></a>
            </motion.div>

            <form onSubmit={changeComparison} className={styles.picker} aria-label="Choose platforms to compare">
              <label><span>First platform</span><select value={first} onChange={(event) => setFirst(event.target.value)}>{sortedProducts.map((item) => <option key={item.slug} value={item.slug} disabled={item.slug === second}>{item.name}</option>)}</select></label>
              <span className={styles.versus} aria-hidden="true">vs</span>
              <label><span>Second platform</span><select value={second} onChange={(event) => setSecond(event.target.value)}>{sortedProducts.map((item) => <option key={item.slug} value={item.slug} disabled={item.slug === first}>{item.name}</option>)}</select></label>
              <button type="submit">Compare<ArrowUpRight size={17} aria-hidden="true" /></button>
            </form>

            <div className={styles.briefs}>
              {pair.map((product) => <article key={product.slug}>
                <span className={styles.category}>{productBriefs[product.slug].category}</span>
                <h2>{product.name}</h2>
                <p>{productBriefs[product.slug].summary}</p>
                {product.notice && <div className={styles.notice}><CircleAlert size={17} aria-hidden="true" /><p>{product.notice}</p></div>}
                <ul>{product.strengths.map((strength) => <li key={strength}>{strength}</li>)}</ul>
              </article>)}
            </div>
          </div>
        </section>

        {editorial && <section className={styles.decision} aria-labelledby="workflow-heading">
          <div className={styles.container}>
            <div className={styles.sectionHeading}><h2 id="workflow-heading">Which fits your workflow?</h2></div>
            <p className={styles.editorialVerdict}>{editorial.verdict}</p>
            <p className={styles.tableNote}>Editorial analysis by Linktery, a competing provider. Sources checked September 5, 2026. The scenarios below are illustrative evaluation exercises, not measured customer results or hands-on benchmark claims.</p>
            <div className={styles.checks}>
              {editorial.sections.map((section) => <article key={section.title}>
                <h3>{section.title}</h3><p>{section.body}</p>
                <ul className={styles.editorialSteps}>{section.steps.map((step) => <li key={step}>{step}</li>)}</ul>
              </article>)}
            </div>
            <div className={styles.sources}>
              <div><h3>Evidence for this analysis</h3><ul>{editorial.sources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.label}<ExternalLink size={13} aria-hidden="true" /></a></li>)}</ul></div>
              <div><h3>Put the decision into practice</h3><ul>{editorial.related.map((link) => <li key={link.href}><Link to={link.href}>{link.label}<ArrowUpRight size={13} aria-hidden="true" /></Link></li>)}</ul></div>
            </div>
          </div>
        </section>}

        <section id="comparison-table" className={styles.comparison} aria-labelledby="details-heading">
          <div className={styles.container}>
            <div className={styles.sectionHeading}><h2 id="details-heading">{migrationComparison ? "Start with availability." : "The details that decide it."}</h2><span>Reviewed <time dateTime={a.reviewedAt}>{a.reviewedAt}</time></span></div>
            <div className={styles.tableWrap}>
              <table>
                <caption className="sr-only">{a.name} and {b.name}: {migrationComparison ? "availability and migration considerations" : "plans and capabilities"}</caption>
                <thead><tr><th scope="col">What to compare</th><th scope="col">{a.name}</th><th scope="col">{b.name}</th></tr></thead>
                <tbody>{rows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th><td><span className={styles.mobileLabel} aria-hidden="true">{a.name}</span>{row.a}</td><td><span className={styles.mobileLabel} aria-hidden="true">{b.name}</span>{row.b}</td></tr>)}</tbody>
              </table>
            </div>
            <p className={styles.tableNote}>“Confirm” means this review has not established the current entitlement—not that the feature is unavailable. Prices, billing periods, and add-ons are not interchangeable. Verify current terms with the provider before purchasing.</p>
            <div className={styles.sources}>
              {pair.map((product) => <div key={product.slug}><h3>{product.name} sources</h3>{product.sources.length ? <ul>{product.sources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.label}<ExternalLink size={13} aria-hidden="true" /></a></li>)}</ul> : <p>No current primary-source plan sheet verified. Ask the provider directly.</p>}</div>)}
            </div>
          </div>
        </section>

        <section className={styles.decision} aria-labelledby="decision-heading">
          <motion.div className={styles.container} {...reveal}>
            <div className={styles.sectionHeading}><h2 id="decision-heading">Before you choose.</h2><p>Try the work you actually do, not just the first screen.</p></div>
            {!editorial && <div className={styles.checks}>
              {pair.map((product) => <article key={product.slug}><span>Check with {product.name}</span><p>{productBriefs[product.slug].check}</p><Link to={`/alternatives/${product.slug}`}>Read the {product.name} alternative guide<ArrowUpRight size={16} aria-hidden="true" /></Link></article>)}
            </div>}
            <aside className={styles.linkteryOption} aria-labelledby="linktery-option-heading">
              <div className={styles.optionIntro}><BrandWordmark tone="light" /><span>A different fit</span><h3 id="linktery-option-heading">Need a page and a routing layer?</h3><p>Linktery combines public profiles with managed links. Keep your existing store or website as the destination.</p><Link to="/features">Explore Linktery features<ArrowUpRight size={17} aria-hidden="true" /></Link></div>
              <div className={styles.optionDetails}><dl><div><dt>Creator · ${PLANS.creator.price}</dt><dd>{PLANS.creator.limits.links} Smart Links, {PLANS.creator.limits.public_profiles} Public Profile, customization, and device targeting.</dd></div><div><dt>Creator Pro · ${PLANS.pro.price}/mo</dt><dd>{PLANS.pro.limits.links} Smart Links, {PLANS.pro.limits.public_profiles} profiles, {PLANS.pro.limits.custom_domain} custom domains, analytics, geo targeting, supported deep links, and API access.</dd></div></dl><p>No built-in checkout or collaborative seats. App handoffs depend on the destination and browser, with a web fallback.</p><Link to="/pricing">Full plan limits<ArrowRight size={15} aria-hidden="true" /></Link></div>
            </aside>
          </motion.div>
        </section>

        <section className={styles.faq} aria-labelledby="faq-heading">
          <motion.div className={`${styles.container} ${styles.faqGrid}`} {...reveal}>
            <div><span className={styles.category}>A few useful answers</span><h2 id="faq-heading">Compare with context.</h2></div>
            <div className={styles.faqList}>{faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
          </motion.div>
        </section>

        <section className={styles.related} aria-labelledby="related-heading">
          <div className={styles.container}>
            <div className={styles.sectionHeading}><h2 id="related-heading">Keep comparing.</h2><Link to="/alternatives">All alternatives<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
            <details className={styles.directory}><summary>Compare {a.name} with another platform<span>{related.length} comparisons</span></summary><nav aria-label="Related platform comparisons">{related.map((product) => <Link key={product.slug} to={comparisonPath(a, product)}>{[a, product].sort((left, right) => left.slug.localeCompare(right.slug)).map((item) => item.name).join(" vs ")}<ArrowUpRight size={14} aria-hidden="true" /></Link>)}</nav></details>
          </div>
        </section>
      </main>
      <Footer variant="landing" />
    </div>
  );
}

export default function CompetitorComparison() {
  const { comparisonSlug } = useParams<{ comparisonSlug: string }>();
  const pair = resolveComparison(comparisonSlug);
  if (!pair) return <Navigate to="/404" replace />;
  const canonical = comparisonPath(...pair);
  if (`/compare/${comparisonSlug}` !== canonical) return <Navigate to={canonical} replace />;
  return <ComparisonPage key={canonical} a={pair[0]} b={pair[1]} />;
}
