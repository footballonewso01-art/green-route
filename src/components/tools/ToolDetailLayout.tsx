import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Link2, LockKeyhole, QrCode, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import MarketingHeader from "@/components/MarketingHeader";
import { useSeo } from "@/hooks/useSeo";
import { getSeoContentLabel, type SeoContentPageDefinition } from "@/lib/seoContent";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";
import "@/styles/landing-rebrand.css";
import styles from "./ToolDetails.module.css";

type ToolPage = SeoContentPageDefinition;

const toolPresentation = {
  "/tools/utm-builder": {
    Icon: Link2,
    shortTitle: "UTM Builder",
    action: "Build campaign URL",
    guidePath: "/guides/utm-parameters-guide",
    guideLabel: "Read the UTM naming guide",
    facts: [
      ["Input", "One destination + campaign labels"],
      ["Output", "A ready-to-copy tagged URL"],
      ["Processing", "Generated locally in your browser"],
    ],
  },
  "/tools/qr-code-generator": {
    Icon: QrCode,
    shortTitle: "QR Generator",
    action: "Create QR code",
    guidePath: "/guides/dynamic-vs-static-qr-codes",
    guideLabel: "Static vs. managed QR codes",
    facts: [
      ["Input", "Any valid HTTP or HTTPS URL"],
      ["Output", "A scalable SVG file"],
      ["Processing", "Created locally in your browser"],
    ],
  },
} as const;

export default function ToolDetailLayout({ page, children }: { page: ToolPage; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const presentation = toolPresentation[page.path as keyof typeof toolPresentation];
  const Icon = presentation?.Icon || Sparkles;
  const related = page.related.filter((path) => path !== "/register").slice(0, 3);

  useSeo({
    title: page.seoTitle,
    description: page.seoDescription,
    canonical: page.path,
    faq: page.faqs,
    structuredData: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebApplication",
          "@id": `${PRIMARY_ORIGIN}${page.path}#tool`,
          url: `${PRIMARY_ORIGIN}${page.path}`,
          name: page.title,
          description: page.seoDescription,
          applicationCategory: "UtilitiesApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          isPartOf: { "@id": `${PRIMARY_ORIGIN}/#website` },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: PRIMARY_ORIGIN },
            { "@type": "ListItem", position: 2, name: "Tools", item: `${PRIMARY_ORIGIN}/tools` },
            { "@type": "ListItem", position: 3, name: page.title, item: `${PRIMARY_ORIGIN}${page.path}` },
          ],
        },
      ],
    },
  });

  return (
    <div className={styles.page} data-tool-detail={page.path}>
      <a href="#tool-workbench" className={styles.skipLink}>Skip to tool</a>
      <MarketingHeader current="tools" />
      <main>
        <section className={styles.hero}>
          <div className={styles.container}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link to="/">Home</Link><ChevronRight size={14} aria-hidden="true" />
              <Link to="/tools">Tools</Link><ChevronRight size={14} aria-hidden="true" />
              <span aria-current="page">{presentation?.shortTitle || page.title}</span>
            </nav>
            <div className={styles.heroGrid}>
              <motion.div
                className={styles.heroCopy}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: .65, ease: [.16, 1, .3, 1] }}
              >
                <span className={styles.eyebrow}><Icon size={14} aria-hidden="true" />{page.eyebrow}</span>
                <h1>{page.title}</h1>
                <p>{page.lead}</p>
                <div className={styles.actions}>
                  <a href="#tool-workbench" className={styles.primaryAction}>{presentation?.action || "Open tool"}<ArrowRight size={17} aria-hidden="true" /></a>
                  {presentation && <Link to={presentation.guidePath} className={styles.secondaryAction}>{presentation.guideLabel}<ArrowUpRight size={16} aria-hidden="true" /></Link>}
                </div>
              </motion.div>
              <motion.div
                className={styles.toolContract}
                role="complementary"
                aria-label="Tool summary"
                initial={reduceMotion ? false : { opacity: 0, y: 14, scale: .98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: .7, delay: .08, ease: [.16, 1, .3, 1] }}
              >
                <div className={styles.contractHeader}><span>Utility / 0{page.path.includes("utm") ? "1" : "2"}</span><span><i /> Ready</span></div>
                <Icon size={44} strokeWidth={1.25} aria-hidden="true" />
                <div className={styles.contractTitle}><span>What happens here</span><strong>{presentation?.shortTitle || "Linktery tool"}</strong></div>
                <dl>{presentation?.facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                <p><LockKeyhole size={13} aria-hidden="true" />No signup required to generate the result.</p>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="tool-workbench" className={styles.workbenchSection} aria-label={`${page.title} workspace`}>
          <div className={styles.container}>{children}</div>
        </section>

        <section className={styles.method} aria-labelledby="tool-method-title">
          <div className={styles.container}>
            <header className={styles.methodHeader}>
              <span>Use the output well</span>
              <h2 id="tool-method-title">A useful file or URL is only the first step.</h2>
              <p>Keep the campaign naming, destination behavior, and testing process clear enough for the next person to understand.</p>
            </header>
            <div className={styles.methodGrid}>
              {page.sections.map((section, index) => (
                <motion.article
                  key={section.heading}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: .15 }}
                  transition={{ duration: .55, delay: index * .06, ease: [.16, 1, .3, 1] }}
                >
                  <div><span>Practical note</span><h3>{section.heading}</h3></div>
                  <div>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
                  <ul>{section.bullets.map((bullet) => <li key={bullet}><Check size={14} aria-hidden="true" />{bullet}</li>)}</ul>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.faq}>
          <div className={`${styles.container} ${styles.faqGrid}`}>
            <div><span>Tool FAQ</span><h2>Know what the output can — and cannot — do.</h2></div>
            <div className={styles.faqList}>{page.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div>
          </div>
        </section>

        <section className={styles.next}>
          <div className={`${styles.container} ${styles.nextGrid}`}>
            <div className={styles.nextIntro}><span>Continue the workflow</span><h2>Move from a generated asset to a managed campaign.</h2></div>
            <div className={styles.relatedLinks}>
              {related.map((path) => <Link key={path} to={path}><span>{getSeoContentLabel(path)}</span><ArrowUpRight size={18} aria-hidden="true" /></Link>)}
            </div>
            <div className={styles.managedCard}>
              <div><span>Managed in Linktery</span><strong>Change destinations and measure visits without rebuilding the public entry point.</strong></div>
              <Link to="/register">Start free<ArrowUpRight size={18} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>
      </main>
      <Footer variant="landing" />
    </div>
  );
}
