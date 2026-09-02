import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import MarketingHeader from "@/components/MarketingHeader";
import SolutionWorkflow from "@/components/solutions/SolutionWorkflow";
import { solutionFilters, solutionGuides, solutionProfessions, type SolutionFilter } from "@/components/solutions/solutionPresentation";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";
import competitors from "@/data/competitors.json";
import "@/styles/landing-rebrand.css";
import styles from "@/components/solutions/Solutions.module.css";

const solutionSchema = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "CollectionPage", name: "Linktery solutions", url: PRIMARY_ORIGIN + "/solutions" },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: PRIMARY_ORIGIN },
        { "@type": "ListItem", position: 2, name: "Solutions", item: PRIMARY_ORIGIN + "/solutions" },
      ],
    },
    {
      "@type": "ItemList",
      itemListElement: [...solutionGuides, ...solutionProfessions].map((item, index) => ({
        "@type": "ListItem", position: index + 1, name: item.title, url: PRIMARY_ORIGIN + item.path,
      })),
    },
  ],
};

export default function SolutionsIndex() {
  const [filter, setFilter] = useState<SolutionFilter>("all");
  const reduceMotion = useReducedMotion();
  const guides = solutionGuides.filter((guide) => filter === "all" || guide.group === filter);

  useSeo({ ...SEO_PAGES.solutionsIndex, structuredData: solutionSchema });

  return (
    <div className={styles.page} data-solutions-marketing>
      <a href="#solutions-main" className={styles.skipLink}>Skip to solutions</a>
      <MarketingHeader current="solutions" />
      <main id="solutions-main" className={styles.main}>
        <div className={styles.container}>
          <header className={styles.header}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link to="/">Home</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">Solutions</span>
            </nav>
            <div className={styles.headerRow}>
              <div>
                <h1>Find your link workflow.</h1>
                <p>Share your work, sell an offer, or run a campaign. Start with the task you have in mind.</p>
              </div>
              <a href="#solutions-professions" className={styles.jumpLink}>Browse by profession<ArrowDown size={16} aria-hidden="true" /></a>
            </div>
          </header>

          <section aria-label="Solution guides" className={styles.catalog}>
            <div className={styles.toolbar}>
              <div className={styles.filters} role="group" aria-label="Filter solutions">
                {solutionFilters.map((option) => (
                  <button key={option.id} type="button" aria-pressed={filter === option.id} aria-controls="solution-results" onClick={() => setFilter(option.id)}>{option.label}</button>
                ))}
              </div>
              <span className={styles.resultCount} role="status">{guides.length} guides</span>
            </div>

            <div id="solution-results" className={styles.grid} data-filter={filter}>
              {guides.map((guide, index) => {
                const Icon = guide.icon;
                return (
                  <motion.article
                    key={guide.path}
                    data-solution-card={guide.path}
                    className={styles.card + (guide.visual ? " " + styles.featuredCard : "")}
                    initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: .08 }}
                    transition={{ duration: .45, delay: (index % 3) * .04, ease: [.16, 1, .3, 1] }}
                  >
                    <Link to={guide.path} className={styles.cardLink} aria-labelledby={guide.id + "-title"} aria-describedby={guide.id + "-summary"}>
                      {guide.visual && <SolutionWorkflow kind={guide.visual} />}
                      <div className={styles.cardContent}>
                        <div className={styles.cardEyebrow}><Icon size={16} strokeWidth={1.8} aria-hidden="true" /><span>{guide.label}</span></div>
                        <h2 id={guide.id + "-title"}>{guide.title}</h2>
                        <p id={guide.id + "-summary"}>{guide.description}</p>
                        <span className={styles.cardAction}>Explore solution<ArrowUpRight size={17} aria-hidden="true" /></span>
                      </div>
                    </Link>
                  </motion.article>
                );
              })}
            </div>
          </section>

          <section id="solutions-professions" className={styles.professions} aria-labelledby="professions-title">
            <div className={styles.sectionHeading}>
              <h2 id="professions-title">A setup for your kind of work.</h2>
              <p>See what to put on your page, from a portfolio and booking link to listings and new releases.</p>
            </div>
            <div className={styles.professionGrid}>
              {solutionProfessions.map(({ title, path, description, icon: Icon }, index) => (
                <motion.div key={path} initial={reduceMotion ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .1 }} transition={{ duration: .4, delay: (index % 4) * .04 }}>
                  <Link to={path} className={styles.professionLink}>
                    <Icon size={21} strokeWidth={1.6} aria-hidden="true" />
                    <span><strong>{title}</strong><small>{description}</small></span>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>

          <aside className={styles.comparisons} aria-labelledby="comparisons-title">
            <div><h2 id="comparisons-title">Moving from another tool?</h2><p>Compare the options before choosing your setup.</p></div>
            <nav aria-label="Platform comparisons">
              {competitors.slice(0, 3).map((competitor) => <Link key={competitor.slug} to={"/alternatives/" + competitor.slug}>{competitor.name}<ArrowUpRight size={14} aria-hidden="true" /></Link>)}
              <Link to="/alternatives" className={styles.allComparisons}>All comparisons<ArrowRight size={16} aria-hidden="true" /></Link>
            </nav>
          </aside>
        </div>
      </main>
      <Footer variant="landing" />
    </div>
  );
}
