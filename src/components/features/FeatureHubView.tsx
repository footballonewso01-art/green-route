import { ArrowDown, ArrowUpRight, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { SeoContentPageDefinition } from "@/lib/seoContent";
import FeatureMarketingShell from "./FeatureMarketingShell";
import { featureGroups, featurePresentation, getFeatureAvailability, getFeaturePresentation } from "./featurePresentation";
import styles from "./FeatureMarketing.module.css";

export default function FeatureHubView({ pages, title }: { pages: SeoContentPageDefinition[]; title: string; lead: string }) {
  const featureOrder = Object.keys(featurePresentation);
  return (
    <FeatureMarketingShell>
      <div className={`${styles.section} ${styles.hubContent}`}>
        <div className={styles.container}>
          <header className={styles.hubHeader}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link to="/">Home</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">Features</span>
            </nav>
            <h1>{title}</h1>
            <p>Explore the tools, see how they work, and check what is included in your plan.</p>
          </header>
          <nav className={styles.categoryLinks} aria-label="Feature categories">
            {featureGroups.map((group) => <a key={group.id} href={`#features-${group.id}`}>{group.label}<ArrowDown size={14} aria-hidden="true" /></a>)}
          </nav>
          <div id="feature-catalog" className={styles.catalog}>
            {featureGroups.map((group) => (
              <section key={group.id} id={`features-${group.id}`} className={styles.catalogGroup} aria-labelledby={`features-${group.id}-title`}>
                <header className={styles.groupHeader}>
                  <h2 id={`features-${group.id}-title`}>{group.label}</h2>
                  <p>{group.description}</p>
                </header>
                <div className={styles.catalogGrid}>
                  {pages.filter((page) => getFeaturePresentation(page.path).group === group.id).sort((a, b) => featureOrder.indexOf(a.path) - featureOrder.indexOf(b.path)).map((page) => {
                    const { label, icon: Icon, summary, capabilities } = getFeaturePresentation(page.path);
                    return (
                      <Link key={page.path} to={page.path} className={styles.catalogCard} data-feature-resource={page.path}>
                        <div className={styles.cardHeading}><span className={styles.cardIcon}><Icon size={21} strokeWidth={1.7} aria-hidden="true" /></span><h3>{label}</h3><ArrowUpRight className={styles.cardArrow} size={19} aria-hidden="true" /></div>
                        <p>{summary}</p>
                        <ul className={styles.capabilities}>{capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul>
                        <span className={styles.cardAvailability}>{getFeatureAvailability(page.path)}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </FeatureMarketingShell>
  );
}
