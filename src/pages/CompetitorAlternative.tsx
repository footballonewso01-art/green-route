import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, BarChart3, Check, ChevronRight, CircleAlert, ExternalLink, Globe2, LayoutPanelTop, Route } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import Footer from "@/components/Footer";
import MarketingHeader from "@/components/MarketingHeader";
import BrandWordmark from "@/components/BrandWordmark";
import { competitors } from "@/components/alternatives/alternativeData";
import styles from "@/components/alternatives/Alternatives.module.css";
import { useSeo } from "@/hooks/useSeo";
import { PLANS } from "@/lib/plans";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";
import "@/styles/landing-rebrand.css";

const linkteryStrengths = [
  "Country and device rules in the same managed-link workflow",
  "Random, equal-probability destination splitting on Agency",
  "Public profiles, short links, domains, and analytics in one workspace",
  "External checkout routing without a Linktery transaction fee",
] as const;

export default function CompetitorAlternative() {
  const { competitorSlug } = useParams<{ competitorSlug: string }>();
  const reduceMotion = useReducedMotion();
  const competitor = competitors.find((item) => item.slug === competitorSlug);

  const faqItems = competitor ? [
    {
      question: `What should I compare before moving from ${competitor.name}?`,
      answer: `${competitor.question} ${competitor.checks[0]} Test a real mobile journey before moving every published URL.`,
    },
    {
      question: `Does Linktery have a free plan?`,
      answer: `Yes. The Creator plan includes ${PLANS.creator.limits.links} Smart Links, ${PLANS.creator.limits.public_profiles} Public Profile, full profile customization, and device targeting. Advanced analytics, deep links, geo targeting, API access, and custom domains begin on Creator Pro.`,
    },
    {
      question: `Can I connect my own domain to Linktery?`,
      answer: `Creator Pro supports up to ${PLANS.pro.limits.custom_domain} custom domains, while Agency supports up to ${PLANS.agency.limits.custom_domain}. Domain eligibility and DNS setup still need to be verified before publishing.`,
    },
    {
      question: `Does Linktery replace my checkout or storefront?`,
      answer: `No. Linktery routes visitors to the destination you configure. Payments, refunds, taxes, fulfillment, and processor fees remain with your storefront or checkout provider.`,
    },
  ] : [];

  useSeo({
    title: competitor?.alternativeSeoTitle || "Link-in-Bio Alternatives | Linktery",
    description: competitor?.alternativeSeoDescription || "Compare link-in-bio alternatives.",
    canonical: competitor ? `/alternatives/${competitor.slug}` : "",
    faq: faqItems,
    structuredData: competitor ? {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "SoftwareApplication",
          "@id": `${PRIMARY_ORIGIN}/#software`,
          name: "Linktery",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: PRIMARY_ORIGIN },
            { "@type": "ListItem", position: 2, name: "Alternatives", item: `${PRIMARY_ORIGIN}/alternatives` },
            { "@type": "ListItem", position: 3, name: `${competitor.name} alternative`, item: `${PRIMARY_ORIGIN}/alternatives/${competitor.slug}` },
          ],
        },
      ],
    } : undefined,
  });

  if (!competitor) return <Navigate to="/404" replace />;

  const related = competitors.filter((item) => item.slug !== competitor.slug).slice(0, 6);
  const relatedComparisons = competitors.filter((item) => item.slug !== competitor.slug).map((item) => {
    const pair = [competitor, item].sort((a, b) => a.slug.localeCompare(b.slug));
    return { label: `${pair[0].name} vs ${pair[1].name}`, href: `/compare/${pair[0].slug}-vs-${pair[1].slug}` };
  });
  const comparisonRows = [
    { label: "Free entry", linktery: `$0 · ${PLANS.creator.limits.links} Smart Links, ${PLANS.creator.limits.public_profiles} Public Profile`, competitor: competitor.facts.free },
    { label: "Paid plan", linktery: `$${PLANS.pro.price}/mo Creator Pro`, competitor: competitor.facts.paid },
    { label: "Custom domains", linktery: `${PLANS.pro.limits.custom_domain} on Pro · ${PLANS.agency.limits.custom_domain} on Agency`, competitor: competitor.facts.domains },
    { label: "Brand removal", linktery: "Included with Creator Pro", competitor: competitor.facts.branding },
    { label: "Country routing", linktery: "Creator Pro and Agency", competitor: competitor.facts.routing },
    { label: "App-aware destinations", linktery: "Paid plans: supported handoff with HTTPS fallback", competitor: competitor.facts.apps },
    { label: "Analytics", linktery: "Advanced analytics from Creator Pro", competitor: competitor.facts.analytics },
    { label: "Selling model / fees", linktery: "External checkout; no Linktery transaction fee. Provider fees still apply.", competitor: competitor.facts.fees },
  ];
  const visibleRows = competitor.migrationOnly ? comparisonRows.slice(0, 3) : comparisonRows;

  return (
    <div className={styles.page} data-alternative-detail={competitor.slug}>
      <a href="#comparison-table" className={styles.skipLink}>Skip to comparison</a>
      <MarketingHeader current="alternatives" />
      <main>
        <section className={styles.detailHero}>
          <div className={styles.container}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link to="/">Home</Link><ChevronRight size={14} aria-hidden="true" /><Link to="/alternatives">Alternatives</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{competitor.name}</span></nav>
            <div className={styles.detailHeroGrid}>
              <motion.div className={styles.detailHeroCopy} initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65, ease: [.16, 1, .3, 1] }}>
                <span className={styles.eyebrow}>{competitor.topic}</span>
                <h1>{competitor.name} alternative.</h1>
                <p>{competitor.description}</p>
                <div className={styles.heroActions}><a href="#comparison-table">See the comparison<ArrowRight size={17} aria-hidden="true" /></a><Link to="/register">Try Linktery free<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
              </motion.div>

              <motion.aside className={styles.snapshot} aria-labelledby="snapshot-title" initial={reduceMotion ? false : { opacity: 0, y: 14, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .7, delay: .08, ease: [.16, 1, .3, 1] }}>
                <div className={styles.snapshotHeader}><span id="snapshot-title">Decision snapshot</span><span><i />{competitor.migrationOnly ? "Migration checklist" : "Product fit"}</span></div>
                <div className={styles.snapshotNames}><div><span className={styles.linkteryMark}><BrandWordmark tone="light" /></span><small>Profiles + routing</small><strong>Linktery</strong></div><span>vs</span><div><span className={styles.competitorMark} aria-hidden="true">{competitor.name.slice(0, 2)}</span><small>{competitor.migrationOnly ? "Moving from" : "Compare with"}</small><strong>{competitor.name}</strong></div></div>
                <dl className={styles.snapshotFacts}><div><dt>Focus</dt><dd>{competitor.topic}</dd></div><div><dt>Key question</dt><dd>{competitor.question}</dd></div></dl>
              </motion.aside>
            </div>
          </div>
        </section>

        <section id="comparison-table" className={styles.comparisonSection} aria-labelledby="comparison-title">
          <div className={styles.container}>
            <div className={styles.sectionHeading}><div><span>Side-by-side</span><h2 id="comparison-title">Linktery vs {competitor.name}</h2></div><p>Use the table as a shortlist, then verify the current provider terms and test the workflows that matter to you.</p></div>
            {competitor.notice && <p className={styles.contextNotice}><CircleAlert size={18} aria-hidden="true" />{competitor.notice}</p>}
            <div className={styles.tableWrap}>
              <table><caption className="sr-only">Linktery and {competitor.name}: plans and capabilities</caption><thead><tr><th scope="col">Decision</th><th scope="col">Linktery</th><th scope="col">{competitor.name}</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th><td><span className={styles.mobileColumnLabel} aria-hidden="true">Linktery</span>{row.linktery}</td><td><span className={styles.mobileColumnLabel} aria-hidden="true">{competitor.name}</span>{row.competitor}</td></tr>)}</tbody></table>
            </div>
            <div className={styles.sourceNote}><CircleAlert size={17} aria-hidden="true" /><div><p>Reviewed {competitor.reviewedAt}. “Confirm” means this review has not established the current entitlement—not that the feature is unavailable. Verify plans before purchasing.</p><div className={styles.sourceLinks}><Link to="/pricing">Linktery plans<ArrowUpRight size={13} aria-hidden="true" /></Link>{competitor.sources.map((source) => <a key={source.href} href={source.href} target="_blank" rel="noreferrer">{source.label}<ExternalLink size={13} aria-hidden="true" /></a>)}</div></div></div>
          </div>
        </section>

        <section className={styles.fitSection} aria-labelledby="fit-title">
          <div className={`${styles.container} ${styles.fitGrid}`}>
            <div className={styles.fitIntro}><span>Product fit</span><h2 id="fit-title">The stronger option depends on the workflow.</h2><p>Separate the public page from the system behind it. A beautiful profile may be enough; a campaign operation may also need routing, domains, analytics, and repeatable controls.</p></div>
            <div className={styles.fitColumns}>
              <article><div className={styles.fitTitle}><span className={styles.linkteryMark}><BrandWordmark tone="light" /></span><div><small>Choose when you need</small><h3>Linktery</h3></div></div><ul>{linkteryStrengths.map((item) => <li key={item}><Check size={15} aria-hidden="true" />{item}</li>)}</ul></article>
              <article><div className={styles.fitTitle}><span className={styles.competitorMark} aria-hidden="true">{competitor.name.slice(0, 2)}</span><div><small>{competitor.migrationOnly ? "Keep track of" : "Consider if you rely on"}</small><h3>{competitor.name}</h3></div></div><ul>{competitor.strengths.map((item) => <li key={item}><Check size={15} aria-hidden="true" />{item}</li>)}</ul></article>
            </div>
          </div>
        </section>

        <section className={styles.criteriaSection} aria-labelledby="criteria-title">
          <div className={styles.container}>
            <div className={styles.sectionHeading}><div><span>Look past the homepage</span><h2 id="criteria-title">Test three real journeys.</h2></div><p>A comparison becomes useful when it follows the visitor, the operator, and the brand owner through an actual task.</p></div>
            <div className={styles.criteriaGrid}>
              <article><Route size={25} strokeWidth={1.5} aria-hidden="true" /><span>Traffic journey</span><h3>One link, more than one audience</h3><p>Test country and device rules, the unmatched default, and a supported app-aware destination. The fallback should remain useful when a handoff is blocked.</p></article>
              <article><BarChart3 size={25} strokeWidth={1.5} aria-hidden="true" /><span>Operator journey</span><h3>From publish to explanation</h3><p>Create a tracked link, label the campaign consistently, and confirm that reporting exposes the dimensions your team uses to make decisions.</p></article>
              <article><Globe2 size={25} strokeWidth={1.5} aria-hidden="true" /><span>Ownership journey</span><h3>Move under your own brand</h3><p>Check domain eligibility, DNS setup, branding removal, profile limits, and what happens to public URLs if the plan changes later.</p></article>
            </div>
          </div>
        </section>

        <section className={styles.tradeoffs} aria-labelledby="tradeoffs-title">
          <div className={`${styles.container} ${styles.tradeoffGrid}`}>
            <div><span>Before migrating</span><h2 id="tradeoffs-title">Your {competitor.name} move, thought through.</h2><p>Keep the parts of your current setup that work. You can test Linktery alongside an existing website or store before deciding what to replace.</p></div>
            <article><div className={styles.tradeoffTitle}><LayoutPanelTop size={22} aria-hidden="true" /><h3>Migration checklist</h3></div><ul>{competitor.checks.map((item) => <li key={item}><Check size={15} aria-hidden="true" />{item}</li>)}</ul><p>Linktery does not include native checkout, product fulfillment, or collaborative team seats. Plan those tools separately if your current workflow depends on them.</p></article>
          </div>
        </section>

        <section className={styles.faq} aria-labelledby="alternative-faq-title">
          <div className={`${styles.container} ${styles.faqGrid}`}><div><span>Questions before switching</span><h2 id="alternative-faq-title">Resolve the practical details.</h2></div><div className={styles.faqList}>{faqItems.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></div>
        </section>

        <section className={styles.related} aria-labelledby="related-alternatives-title">
          <div className={styles.container}><div className={styles.relatedHeading}><div><span>Keep comparing</span><h2 id="related-alternatives-title">Review another familiar platform.</h2></div><Link to="/alternatives">All alternatives<ArrowRight size={16} aria-hidden="true" /></Link></div><div className={styles.relatedGrid}>{related.map((item) => <Link key={item.slug} to={`/alternatives/${item.slug}`}><strong>{item.name}</strong><small>{item.topic}</small><ArrowUpRight size={16} aria-hidden="true" /></Link>)}</div><details className={styles.comparisonDirectory}><summary>Compare {competitor.name} with other platforms</summary><div>{relatedComparisons.map((item) => <Link key={item.href} to={item.href}>{item.label}<ArrowUpRight size={14} aria-hidden="true" /></Link>)}</div></details></div>
        </section>

        <section className={styles.detailCta}><div className={`${styles.container} ${styles.ctaCard}`}><div><span>Test the Linktery side</span><h2>Build one real workflow before you move every link.</h2></div><Link to="/register">Start free<ArrowUpRight size={18} aria-hidden="true" /></Link></div></section>
      </main>
      <Footer variant="landing" />
    </div>
  );
}
