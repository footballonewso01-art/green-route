import type { ReactNode } from "react";
import { ArrowUp, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import MarketingHeader from "@/components/MarketingHeader";
import styles from "./LegalPage.module.css";
import "@/styles/landing-rebrand.css";

export interface LegalSectionLink {
  id: string;
  label: string;
}

interface LegalPageShellProps {
  documentKey: "privacy" | "terms";
  title: string;
  effectiveDate: string;
  sections: LegalSectionLink[];
  children: ReactNode;
}

export default function LegalPageShell({ documentKey, title, effectiveDate, sections, children }: LegalPageShellProps) {
  return (
    <div className={styles.page} data-legal-page={documentKey}>
      <a href="#legal-document" className={styles.skipLink}>Skip to document</a>
      <MarketingHeader current="legal" />
      <main id="legal-document">
        <header className={styles.hero}>
          <div className={styles.container}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link to="/">Home</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{title}</span>
            </nav>
            <div className={styles.heroRow}>
              <div><p>Legal</p><h1>{title}</h1></div>
              <p className={styles.effectiveDate}>Effective Date: <time dateTime="2026-03-02">{effectiveDate}</time></p>
            </div>
          </div>
        </header>

        <div className={`${styles.container} ${styles.documentGrid}`}>
          <aside className={styles.contents} aria-labelledby={`${documentKey}-contents-title`}>
            <p id={`${documentKey}-contents-title`}>On this page</p>
            <nav aria-label={`${title} contents`}>
              {sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.label}</a>)}
            </nav>
            <Link to={documentKey === "privacy" ? "/terms" : "/privacy"}>
              {documentKey === "privacy" ? "Terms & Conditions" : "Privacy Policy"}<ChevronRight size={14} aria-hidden="true" />
            </Link>
          </aside>

          <article className={styles.document}>{children}</article>
        </div>

        <div className={`${styles.container} ${styles.backToTop}`}>
          <a href="#legal-document">Back to top<ArrowUp size={15} aria-hidden="true" /></a>
        </div>
      </main>
      <Footer variant="landing" />
    </div>
  );
}
