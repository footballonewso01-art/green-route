import type { ReactNode } from "react";
import { ArrowUpRight, Check, ChevronRight, ExternalLink, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { getSeoContentLabel, type SeoContentPageDefinition } from "@/lib/seoContent";
import FeatureMarketingShell from "./FeatureMarketingShell";
import FeatureNavigation from "./FeatureNavigation";
import FeatureVisual from "./FeatureVisual";
import { getFeatureAvailability, getFeaturePresentation } from "./featurePresentation";
import styles from "./FeatureMarketing.module.css";

export default function FeatureDetailView({ page, children }: { page: SeoContentPageDefinition; children?: ReactNode }) {
  const presentation = getFeaturePresentation(page.path);
  return (
    <FeatureMarketingShell>
      <div className={`${styles.section} ${styles.detailContent}`}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link to="/">Home</Link><ChevronRight size={14} aria-hidden="true" />
            <Link to="/features">Features</Link><ChevronRight size={14} aria-hidden="true" />
            <span aria-current="page">{presentation.label}</span>
          </nav>
          <div className={styles.detailGrid}>
            <FeatureNavigation currentPath={page.path} />
            <div className={styles.detailBody}>
              <header className={styles.detailHeader}>
                <h1>{page.title}</h1>
                <p className={styles.lead}>{page.lead}</p>
                <div className={styles.availability}><span>{getFeatureAvailability(page.path)}</span><Link to="/pricing">Compare plans<ArrowUpRight size={14} aria-hidden="true" /></Link></div>
              </header>
              <section className={styles.overview} aria-label="Feature overview">
                <div className={styles.highlights}>
                  {page.highlights.map((highlight) => <div key={highlight.title}><Check size={18} aria-hidden="true" /><div><h2>{highlight.title}</h2><p>{highlight.text}</p></div></div>)}
                </div>
                <FeatureVisual key={page.path} path={page.path} />
              </section>
              {children}
              <nav className={styles.contents} aria-label="On this page">
                {page.sections.map((section, index) => <a key={section.heading} href={`#feature-section-${index + 1}`}>{section.heading}</a>)}
                {page.faqs.length > 0 && <a href="#feature-faq">FAQ</a>}
              </nav>
              <article className={styles.article}>
                {page.sections.map((section, index) => <section key={section.heading} id={`feature-section-${index + 1}`} className={styles.articleSection}>
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.bullets.length > 0 && <ul>{section.bullets.map((bullet) => <li key={bullet}><Check size={17} aria-hidden="true" /><span>{bullet}</span></li>)}</ul>}
                </section>)}
                {page.sources && page.sources.length > 0 && <aside className={styles.sources} aria-labelledby="feature-sources-title">
                  <h2 id="feature-sources-title">Sources and documentation</h2>
                  <ul>{page.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}<ExternalLink size={15} aria-hidden="true" /></a></li>)}</ul>
                </aside>}
                {page.faqs.length > 0 && <section id="feature-faq" className={styles.faq} aria-labelledby="feature-faq-title">
                  <h2 id="feature-faq-title">Frequently asked questions</h2>
                  {page.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}<Plus size={20} aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}
                </section>}
              </article>
              {page.related.length > 0 && <section className={styles.related} aria-labelledby="feature-related-title">
                <h2 id="feature-related-title">Related features & resources</h2>
                <div className={styles.relatedGrid}>{page.related.map((path) => <Link key={path} to={path}><span>{getSeoContentLabel(path)}</span><ArrowUpRight size={18} aria-hidden="true" /></Link>)}</div>
              </section>}
            </div>
          </div>
        </div>
      </div>
    </FeatureMarketingShell>
  );
}
