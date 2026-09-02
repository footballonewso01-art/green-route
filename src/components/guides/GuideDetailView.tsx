import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, Clock3, ExternalLink, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import MarketingHeader from "@/components/MarketingHeader";
import { useSeo } from "@/hooks/useSeo";
import { getSeoContentLabel, type SeoContentPageDefinition } from "@/lib/seoContent";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";
import { getGuidePresentation, guideTopics } from "./guidePresentation";
import "@/styles/landing-rebrand.css";
import styles from "./GuideDetails.module.css";

const anchorFor = (heading: string) => heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const nextActionByTopic = {
  essentials: { label: "Explore Linktery features", path: "/features" },
  tracking: { label: "Open campaign tools", path: "/tools" },
  api: { label: "Read API documentation", path: "/documentation" },
  migration: { label: "Browse profile templates", path: "/templates" },
} as const;

export default function GuideDetailView({ page }: { page: SeoContentPageDefinition }) {
  const reduceMotion = useReducedMotion();
  const presentation = getGuidePresentation(page);
  const topicLabel = guideTopics.find((topic) => topic.id === presentation.topic)?.label || "Guide";
  const nextAction = nextActionByTopic[presentation.topic];
  const words = [page.title, page.lead, ...page.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...section.bullets]), ...page.faqs.flatMap((faq) => [faq.question, faq.answer])].join(" ").trim().split(/\s+/).length;
  const readingMinutes = Math.max(4, Math.ceil(words / 190));
  const related = page.related.filter((path) => path !== "/register").slice(0, 4);

  useSeo({
    title: page.seoTitle,
    description: page.seoDescription,
    canonical: page.path,
    faq: page.faqs,
    structuredData: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          "@id": `${PRIMARY_ORIGIN}${page.path}#article`,
          url: `${PRIMARY_ORIGIN}${page.path}`,
          headline: page.title,
          description: page.seoDescription,
          inLanguage: "en",
          mainEntityOfPage: { "@id": `${PRIMARY_ORIGIN}${page.path}#article` },
          author: { "@id": `${PRIMARY_ORIGIN}/#organization` },
          publisher: { "@id": `${PRIMARY_ORIGIN}/#organization` },
          isPartOf: { "@id": `${PRIMARY_ORIGIN}/#website` },
          ...(page.sources?.length ? { citation: page.sources.map((source) => source.url) } : {}),
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: PRIMARY_ORIGIN },
            { "@type": "ListItem", position: 2, name: "Guides", item: `${PRIMARY_ORIGIN}/guides` },
            { "@type": "ListItem", position: 3, name: page.title, item: `${PRIMARY_ORIGIN}${page.path}` },
          ],
        },
      ],
    },
  });

  return (
    <div className={styles.page} data-guide-detail={page.path}>
      <a href="#guide-article" className={styles.skipLink}>Skip to article</a>
      <MarketingHeader current="guides" />
      <main>
        <section className={styles.hero}>
          <div className={styles.container}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link to="/">Home</Link><ChevronRight size={14} aria-hidden="true" /><Link to="/guides">Guides</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{topicLabel}</span>
            </nav>
            <div className={styles.heroGrid}>
              <motion.div
                className={styles.heroCopy}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: .65, ease: [.16, 1, .3, 1] }}
              >
                <div className={styles.meta}><span><BookOpen size={14} aria-hidden="true" />{page.eyebrow}</span><span><Clock3 size={13} aria-hidden="true" />{readingMinutes} min read</span></div>
                <h1>{page.title}</h1>
                <p>{presentation.summary}</p>
                <div className={styles.actions}><a href="#guide-article">Start reading<ArrowRight size={17} aria-hidden="true" /></a><Link to={nextAction.path}>{nextAction.label}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
              </motion.div>
              <motion.div
                className={styles.guideMap}
                role="complementary"
                aria-labelledby="guide-map-title"
                initial={reduceMotion ? false : { opacity: 0, y: 14, scale: .98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: .7, delay: .08, ease: [.16, 1, .3, 1] }}
              >
                <div className={styles.mapHeader}><span id="guide-map-title">In this guide</span><span><i />{topicLabel}</span></div>
                <div className={styles.mapTitle}><FileText size={36} strokeWidth={1.3} aria-hidden="true" /><span>Reading path</span><strong>{page.sections.length} focused sections</strong></div>
                <ol>{page.sections.map((section, index) => <li key={section.heading}><a href={`#${anchorFor(section.heading)}`}><span>0{index + 1}</span><strong>{section.heading}</strong><ArrowRight size={15} aria-hidden="true" /></a></li>)}</ol>
                <p>Written around the workflow, limits, and decisions that matter in practice.</p>
              </motion.div>
            </div>
          </div>
        </section>

        <article id="guide-article" className={styles.article}>
          <div className={`${styles.container} ${styles.articleGrid}`}>
            <aside className={styles.articleRail} aria-label="Article navigation">
              <span>Contents</span>
              <nav>{page.sections.map((section, index) => <a href={`#${anchorFor(section.heading)}`} key={section.heading}><span>0{index + 1}</span>{section.heading}</a>)}</nav>
              <Link to="/guides">All guides<ArrowRight size={15} aria-hidden="true" /></Link>
            </aside>
            <div className={styles.articleBody}>
              <div className={styles.leadBlock}><span>The short version</span><p>{page.lead}</p></div>
              {page.sections.map((section, index) => (
                <motion.section
                  id={anchorFor(section.heading)}
                  key={section.heading}
                  className={styles.articleSection}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: .1 }}
                  transition={{ duration: .55, delay: index * .04, ease: [.16, 1, .3, 1] }}
                >
                  <div className={styles.sectionLabel}><span>0{index + 1}</span><span>{topicLabel}</span></div>
                  <h2>{section.heading}</h2>
                  <div className={styles.prose}>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
                  {section.bullets.length > 0 && <ul>{section.bullets.map((bullet) => <li key={bullet}><Check size={15} aria-hidden="true" />{bullet}</li>)}</ul>}
                </motion.section>
              ))}

              {page.sources && page.sources.length > 0 && (
                <aside className={styles.sources} aria-labelledby="guide-sources-title">
                  <div><span>Primary references</span><h2 id="guide-sources-title">Sources and platform documentation</h2><p>Platform behavior and export options can change. Recheck the original documentation before a migration or technical rollout.</p></div>
                  <ul>{page.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}<ExternalLink size={14} aria-hidden="true" /></a></li>)}</ul>
                </aside>
              )}
            </div>
          </div>
        </article>

        <section className={styles.faq}>
          <div className={`${styles.container} ${styles.faqGrid}`}>
            <div><span>Questions after reading</span><h2>Clarify the edge cases.</h2></div>
            <div className={styles.faqList}>{page.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div>
          </div>
        </section>

        <section className={styles.related} aria-labelledby="related-guides-title">
          <div className={styles.container}>
            <div className={styles.relatedHeading}><div><span>Keep learning</span><h2 id="related-guides-title">Continue with the next practical question.</h2></div><Link to="/guides">Browse all guides<ArrowRight size={17} aria-hidden="true" /></Link></div>
            <div className={styles.relatedGrid}>{related.map((path) => <Link key={path} to={path}><span>Related resource</span><strong>{getSeoContentLabel(path)}</strong><ArrowUpRight size={18} aria-hidden="true" /></Link>)}</div>
          </div>
        </section>

        <section className={styles.cta}>
          <div className={`${styles.container} ${styles.ctaCard}`}><div><span>Put the guide into practice</span><h2>Build the next link with the workflow in mind.</h2></div><Link to={nextAction.path}>{nextAction.label}<ArrowUpRight size={18} aria-hidden="true" /></Link></div>
        </section>
      </main>
      <Footer variant="landing" />
    </div>
  );
}
