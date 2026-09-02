import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, ChevronRight, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import MarketingHeader from "@/components/MarketingHeader";
import type { SeoContentPageDefinition } from "@/lib/seoContent";
import { getGuidePresentation, guideMatchesSearch, guideTopics, type GuideTopic } from "./guidePresentation";
import "@/styles/landing-rebrand.css";
import styles from "./Guides.module.css";

export default function GuideHubView({ pages, title }: { pages: SeoContentPageDefinition[]; title: string }) {
  const [topic, setTopic] = useState<GuideTopic>("all");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();
  const visiblePages = pages.filter((page) =>
    (topic === "all" || getGuidePresentation(page).topic === topic) && guideMatchesSearch(page, query),
  );
  const activeLabel = guideTopics.find((item) => item.id === topic)!.label;

  function clearSearch() {
    setQuery("");
    searchRef.current?.focus();
  }

  function clearFilters() {
    setTopic("all");
    clearSearch();
  }

  return (
    <div className={styles.page} data-guides-marketing>
      <a href="#guides-main" className={styles.skipLink}>Skip to guides</a>
      <MarketingHeader current="guides" />
      <main id="guides-main" className={styles.main}>
        <div className={styles.container}>
          <header className={styles.header}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link to="/">Home</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">Guides</span>
            </nav>
            <h1>{title}</h1>
            <p>Learn to set up links, track campaigns, and move your workflow to Linktery.</p>
          </header>

          <div className={styles.library}>
            <aside className={styles.sidebar} aria-label="Browse guide topics">
              <p className={styles.sidebarLabel}>Browse by topic</p>
              <div className={styles.topics} role="group" aria-label="Guide topics">
                {guideTopics.map((item) => {
                  const count = item.id === "all" ? pages.length : pages.filter((page) => getGuidePresentation(page).topic === item.id).length;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={`${item.label} (${count})`}
                      aria-pressed={topic === item.id}
                      aria-controls="guide-results"
                      onClick={() => setTopic(item.id)}
                      className={styles.topic}
                    >
                      <span>{item.label}</span><span className={styles.topicCount} aria-hidden="true">{count}</span>
                    </button>
                  );
                })}
              </div>
              <div className={styles.referenceNote}>
                <p>Looking for endpoints<br />and request examples?</p>
                <Link to="/documentation">Read the API docs<ArrowUpRight size={15} aria-hidden="true" /></Link>
              </div>
            </aside>

            <section className={styles.catalog} aria-label="Guides library">
              <div className={styles.searchBox}>
                <Search size={19} aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Escape") clearSearch(); }}
                  aria-label="Search guides"
                  aria-controls="guide-results"
                  placeholder="Search guides…"
                  className={styles.searchInput}
                />
                {query && <button type="button" onClick={clearSearch} aria-label="Clear search" className={styles.clearSearch}><X size={17} aria-hidden="true" /></button>}
              </div>

              <div className={styles.resultsHeader}>
                <h2>{activeLabel}</h2>
                <p role="status" aria-live="polite" aria-atomic="true">{visiblePages.length} {visiblePages.length === 1 ? "guide" : "guides"}{query.trim() ? " found" : ""}</p>
              </div>

              <div id="guide-results" className={styles.results}>
                {visiblePages.map((page, index) => {
                  const presentation = getGuidePresentation(page);
                  const label = guideTopics.find((item) => item.id === presentation.topic)!.label;
                  const isIntro = page.path === "/guides/what-is-link-management";
                  const headingId = `guide-${page.path.split("/").pop()}`;
                  return (
                    <motion.div
                      key={page.path}
                      data-guide-card={page.path}
                      className={isIntro ? styles.introEntry : styles.entry}
                      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: .05 }}
                      transition={{ duration: .45, delay: Math.min(index, 2) * .04, ease: [.16, 1, .3, 1] }}
                    >
                      <article>
                        <Link to={page.path} className={styles.guideLink} aria-labelledby={headingId}>
                          <div className={styles.guideCopy}>
                            <span className={styles.guideLabel}>{isIntro ? "Start here" : label}</span>
                            <h3 id={headingId}>{page.title}</h3>
                            <p>{presentation.summary}</p>
                            {isIntro && <span className={styles.introAction}>Read the guide<ArrowRight size={16} aria-hidden="true" /></span>}
                          </div>
                          {isIntro ? (
                            <div className={styles.linkLifecycle} aria-hidden="true">
                              <span>Create</span><i /><span>Share</span><i /><span>Improve<ArrowUpRight size={16} /></span>
                            </div>
                          ) : <span className={styles.rowArrow}><ArrowUpRight size={20} aria-hidden="true" /></span>}
                        </Link>
                      </article>
                    </motion.div>
                  );
                })}
                {visiblePages.length === 0 && (
                  <div className={styles.emptyState}>
                    <Search size={28} strokeWidth={1.5} aria-hidden="true" />
                    <h3>No guides found</h3>
                    <p>Try a shorter search or choose another topic.</p>
                    <button type="button" onClick={clearFilters}>Clear filters<ArrowRight size={16} aria-hidden="true" /></button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer variant="landing" />
    </div>
  );
}
