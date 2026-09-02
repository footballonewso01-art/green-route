import { CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Layers3, MoveRight } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import MarketingHeader from "@/components/MarketingHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useSeo } from "@/hooks/useSeo";
import { PROFILE_TEMPLATE_IDS, type ProfileTemplateId } from "@/lib/profileTemplates";
import { getSeoContentLabel, type SeoContentPageDefinition } from "@/lib/seoContent";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";
import TemplateProfilePreview from "./TemplateProfilePreview";
import { templatePresentation } from "./templatePresentation";
import "@/styles/landing-rebrand.css";
import styles from "./TemplateDetails.module.css";

type TemplatePage = SeoContentPageDefinition;

const showcaseTemplates: ProfileTemplateId[] = ["compact", "hero", "cutout"];

function TemplateStage({ page }: { page: TemplatePage }) {
  const isCollection = page.templateId === "hub" || !page.templateId;
  const template = !isCollection ? page.templateId as ProfileTemplateId : undefined;
  const presentation = template ? templatePresentation[template] : undefined;
  const stageStyle = presentation ? ({ "--detail-template-color": presentation.color } as CSSProperties) : undefined;

  return (
    <div className={styles.stage} data-template-stage={page.templateId || "hub"} style={stageStyle}>
      <div className={styles.stageHeader}>
        <span>{isCollection ? "Six profile structures" : "Rendered from the profile editor"}</span>
        <span><i /> Responsive preview</span>
      </div>
      {isCollection ? (
        <div className={styles.collectionDeck} aria-hidden="true">
          {showcaseTemplates.map((item) => (
            <div className={styles.deckPhone} data-deck-template={item} key={item}>
              <TemplateProfilePreview template={item} full />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.phoneShell} aria-label={`${page.title} example profile`}>
          <div className={styles.phoneViewport}>
            <TemplateProfilePreview template={template!} full />
          </div>
        </div>
      )}
      <div className={styles.stageFooter}>
        <span>{isCollection ? "One profile. Six ways to arrange it." : presentation?.summary}</span>
        <span>390 px <MoveRight size={13} aria-hidden="true" /> fluid</span>
      </div>
    </div>
  );
}

export default function TemplateDetailView({ page }: { page: TemplatePage }) {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const isCollection = page.templateId === "hub" || !page.templateId;
  const template = !isCollection ? page.templateId as ProfileTemplateId : undefined;
  const traits = template ? templatePresentation[template].traits : ["Six responsive structures", "Shared profile content", "Switch layouts later"];
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
          "@type": "WebPage",
          "@id": `${PRIMARY_ORIGIN}${page.path}#page`,
          url: `${PRIMARY_ORIGIN}${page.path}`,
          name: page.seoTitle,
          description: page.seoDescription,
          inLanguage: "en",
          isPartOf: { "@id": `${PRIMARY_ORIGIN}/#website` },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: PRIMARY_ORIGIN },
            { "@type": "ListItem", position: 2, name: "Templates", item: `${PRIMARY_ORIGIN}/templates` },
            { "@type": "ListItem", position: 3, name: page.title, item: `${PRIMARY_ORIGIN}${page.path}` },
          ],
        },
      ],
    },
  });

  return (
    <div className={styles.page} data-template-detail={page.templateId || "hub"}>
      <a href="#template-detail-main" className={styles.skipLink}>Skip to template details</a>
      <MarketingHeader current="templates" />
      <main id="template-detail-main">
        <section className={styles.hero}>
          <div className={styles.container}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link to="/">Home</Link><ChevronRight size={14} aria-hidden="true" />
              <Link to="/templates">Templates</Link><ChevronRight size={14} aria-hidden="true" />
              <span aria-current="page">{isCollection ? "Layout guide" : page.title.replace(" Link-in-Bio Template", "")}</span>
            </nav>
            <div className={styles.heroGrid}>
              <motion.div
                className={styles.heroCopy}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: .65, ease: [.16, 1, .3, 1] }}
              >
                <span className={styles.eyebrow}><Layers3 size={14} aria-hidden="true" />{page.eyebrow}</span>
                <h1>{page.title}</h1>
                <p>{page.lead}</p>
                <ul className={styles.traits}>{traits.map((trait) => <li key={trait}><Check size={14} aria-hidden="true" />{trait}</li>)}</ul>
                <div className={styles.actions}>
                  <Link to={user ? "/dashboard/profile" : "/register"} className={styles.primaryAction}>
                    {user ? "Open profile editor" : isCollection ? "Create a free profile" : "Start with this layout"}<ArrowUpRight size={18} aria-hidden="true" />
                  </Link>
                  <Link to="/templates" className={styles.secondaryAction}>Browse all templates<ArrowRight size={17} aria-hidden="true" /></Link>
                </div>
                <p className={styles.switchNote}>Layout changes presentation. Your saved profile links and content stay in place.</p>
              </motion.div>
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, scale: .975, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: .7, delay: .08, ease: [.16, 1, .3, 1] }}
              >
                <TemplateStage page={page} />
              </motion.div>
            </div>
          </div>
        </section>

        {page.highlights.length > 0 && (
          <section className={styles.highlights} aria-label="Layout characteristics">
            <div className={`${styles.container} ${styles.highlightGrid}`}>
              {page.highlights.map((highlight) => (
                <article key={highlight.title}><span /><h2>{highlight.title}</h2><p>{highlight.text}</p></article>
              ))}
            </div>
          </section>
        )}

        <section className={styles.notes} aria-labelledby="layout-notes-title">
          <div className={styles.container}>
            <header className={styles.sectionHeading}>
              <span>Layout field notes</span>
              <h2 id="layout-notes-title">Make the structure work with real content.</h2>
              <p>Image choice, copy length, and the order of your destinations decide whether a template feels intentional after publishing.</p>
            </header>
            <div className={styles.noteList}>
              {page.sections.map((section, index) => (
                <motion.article
                  key={section.heading}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: .12 }}
                  transition={{ duration: .55, delay: index * .05, ease: [.16, 1, .3, 1] }}
                >
                  <div className={styles.noteTitle}><span>{section.bullets[0] || "Profile structure"}</span><h3>{section.heading}</h3></div>
                  <div className={styles.noteBody}>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
                  <ul>{section.bullets.map((bullet) => <li key={bullet}><Check size={14} aria-hidden="true" />{bullet}</li>)}</ul>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.faq}>
          <div className={`${styles.container} ${styles.faqGrid}`}>
            <div><span>Before you choose</span><h2>Questions about this layout.</h2></div>
            <div className={styles.faqList}>
              {page.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
            </div>
          </div>
        </section>

        <section className={styles.related} aria-labelledby="related-templates-title">
          <div className={styles.container}>
            <div className={styles.relatedHeading}><div><span>Compare the structure</span><h2 id="related-templates-title">Try another visual hierarchy.</h2></div><Link to="/templates">All templates<ArrowRight size={17} aria-hidden="true" /></Link></div>
            <div className={styles.relatedGrid}>
              {related.map((path) => (
                <Link key={path} to={path}><span>Template guide</span><strong>{getSeoContentLabel(path)}</strong><ArrowUpRight size={19} aria-hidden="true" /></Link>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <div className={`${styles.container} ${styles.ctaCard}`}>
            <div><span>Ready when your content is</span><h2>Choose the frame. Keep making it yours.</h2></div>
            <Link to={user ? "/dashboard/profile" : "/register"}>{user ? "Open profile editor" : "Create a free profile"}<ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <Footer variant="landing" />
    </div>
  );
}
