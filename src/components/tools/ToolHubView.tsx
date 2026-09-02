import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Link2, QrCode, Wrench } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import MarketingHeader from "@/components/MarketingHeader";
import type { SeoContentPageDefinition } from "@/lib/seoContent";
import { PRIMARY_DOMAIN, PRIMARY_ORIGIN } from "@/lib/siteConfig";
import "@/styles/landing-rebrand.css";
import styles from "./Tools.module.css";

const toolPresentation = {
  "/tools/utm-builder": {
    title: "UTM builder",
    description: "Add source, medium, and campaign tags to your URL. Copy a consistently named link for every channel.",
    action: "Open UTM builder",
    icon: Link2,
    kind: "utm",
    details: ["5 campaign parameters", "Ready-to-copy URL"],
  },
  "/tools/qr-code-generator": {
    title: "QR code generator",
    description: "Turn a URL into a scannable code, choose your colors, and download a scalable SVG for web or print.",
    action: "Open QR generator",
    icon: QrCode,
    kind: "qr",
    details: ["Custom colors", "SVG download"],
  },
} satisfies Record<string, { title: string; description: string; action: string; icon: typeof Link2; kind: string; details: string[] }>;

function ToolOutputPreview({ kind }: { kind: string }) {
  if (kind === "utm") {
    return (
      <div className={`${styles.preview} ${styles.utmPreview}`} aria-hidden="true">
        <span className={styles.previewLabel}>Example campaign URL</span>
        <div className={styles.urlRecipe}>
          <div className={styles.tagRow}>
            <span><small>Source</small>instagram</span>
            <span><small>Medium</small>social</span>
            <span><small>Campaign</small>summer-launch</span>
          </div>
          <div className={styles.generatedUrl}>
            <div><Link2 size={15} /><span>example.com/launch</span></div>
            <code><span>?utm_source=<b>instagram</b></span><span>&amp;utm_medium=<b>social</b></span><span>&amp;utm_campaign=<b>summer-launch</b></span></code>
          </div>
          <p><Check size={13} />A little context for every click.</p>
        </div>
      </div>
    );
  }
  if (kind === "qr") {
    return (
      <div className={`${styles.preview} ${styles.qrPreview}`} aria-hidden="true">
        <span className={styles.previewLabel}>Example QR code</span>
        <div className={styles.qrScene}>
          <div className={styles.qrSheet}>
            <span>LET'S CONNECT</span>
            <QRCodeSVG value={PRIMARY_ORIGIN} size={148} marginSize={4} level="M" fgColor="var(--landing-media)" bgColor="var(--landing-white)" />
            <strong>{PRIMARY_DOMAIN}<ArrowUpRight size={11} /></strong>
          </div>
          <div className={styles.qrMeta}>
            <span className={styles.fileLabel}>.svg</span>
            <strong>From screen<br />to print.</strong>
            <p>Scalable format.<br />Sharp details.</p>
            <span className={styles.colorSwatches}><i /><i /><i /></span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function ToolHubView({ pages, title }: { pages: SeoContentPageDefinition[]; title: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={styles.page} data-tools-marketing>
      <a href="#tools-main" className={styles.skipLink}>Skip to tools</a>
      <MarketingHeader current="tools" />
      <main id="tools-main" className={styles.main}>
        <div className={styles.container}>
          <header className={styles.header}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link to="/">Home</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">Tools</span>
            </nav>
            <div className={styles.headingRow}>
              <div><h1>{title}</h1><p>Tag a campaign URL or create a QR code. Get a ready-to-share result, right in your browser.</p></div>
              <span className={styles.freeNote}><Check size={16} aria-hidden="true" />Free. No signup needed.</span>
            </div>
          </header>

          <section className={styles.grid} aria-label="Free browser tools">
            {pages.map((page, index) => {
              const presentation = toolPresentation[page.path as keyof typeof toolPresentation] ?? {
                title: page.title, description: page.lead, action: "Open tool", icon: Wrench, kind: "", details: [],
              };
              const Icon = presentation.icon;
              return (
                <motion.article
                  key={page.path}
                  data-tool-card={page.path}
                  className={styles.card}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: .1 }}
                  transition={{ duration: .55, delay: index * .08, ease: [.16, 1, .3, 1] }}
                >
                  <ToolOutputPreview kind={presentation.kind} />
                  <div className={styles.cardContent}>
                    <div className={styles.cardTitle}><span><Icon size={21} strokeWidth={1.7} aria-hidden="true" /></span><h2>{presentation.title}</h2></div>
                    <p>{presentation.description}</p>
                    <ul className={styles.details}>{presentation.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
                    <Link to={page.path} className={styles.openTool}>{presentation.action}<ArrowUpRight size={18} aria-hidden="true" /></Link>
                  </div>
                </motion.article>
              );
            })}
          </section>

          <aside className={styles.managedNote} aria-labelledby="managed-note-title">
            <div><h2 id="managed-note-title">Need to change the destination later?</h2><p>These tools create tagged URLs and static QR images. Point a QR code to a managed short link if you want to update its destination without reprinting.</p></div>
            <Link to="/features/url-shortener">Explore managed links<ArrowRight size={17} aria-hidden="true" /></Link>
          </aside>
        </div>
      </main>
      <Footer variant="landing" />
    </div>
  );
}
