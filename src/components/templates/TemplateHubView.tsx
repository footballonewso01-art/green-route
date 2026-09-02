"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Expand, X } from "lucide-react";
import { Link } from "react-router-dom";
import MarketingHeader from "@/components/MarketingHeader";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { PROFILE_TEMPLATES, type ProfileTemplateDefinition } from "@/lib/profileTemplates";
import type { SeoContentPageDefinition } from "@/lib/seoContent";
import TemplateProfilePreview from "./TemplateProfilePreview";
import { templateFilters, templatePresentation, type TemplateFilter } from "./templatePresentation";
import "@/styles/landing-rebrand.css";
import styles from "./Templates.module.css";

export default function TemplateHubView({ pages, title }: { pages: SeoContentPageDefinition[]; title: string }) {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState<TemplateFilter>("all");
  const [selected, setSelected] = useState<ProfileTemplateDefinition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const previewTitleRef = useRef<HTMLHeadingElement | null>(null);
  const templates = PROFILE_TEMPLATES.filter((template) => filter === "all" || templatePresentation[template.id].category === filter);
  const detailPath = (template: ProfileTemplateDefinition) => pages.find((page) => page.templateId === template.id)?.path || "/templates/link-in-bio";
  const selectedPresentation = selected ? templatePresentation[selected.id] : null;

  return (
    <div className={styles.page} data-template-marketing>
      <a href="#templates-main" className={styles.skipLink}>Skip to templates</a>
      <MarketingHeader current="templates" />
      <main id="templates-main" className={styles.main}>
        <div className={styles.container}>
          <header className={styles.header}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link to="/">Home</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">Templates</span>
            </nav>
            <h1>{title}</h1>
            <p>Choose a layout for your content, then make it your own with images, colors, and link styles.</p>
          </header>

          <section aria-label="Template gallery" className={styles.gallery}>
            <div className={styles.toolbar}>
              <div className={styles.filters} role="group" aria-label="Filter templates">
                {templateFilters.map((option) => (
                  <button key={option.id} type="button" aria-pressed={filter === option.id} onClick={() => setFilter(option.id)}>{option.label}</button>
                ))}
              </div>
              <span className={styles.resultCount} role="status">{templates.length} layouts</span>
            </div>
            <div className={styles.grid}>
              {templates.map((template, index) => (
                <motion.article
                  key={template.id}
                  data-template-card={template.id}
                  className={styles.card}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.12 }}
                  transition={{ duration: .5, delay: (index % 3) * .06, ease: [.16, 1, .3, 1] }}
                >
                  <div className={styles.stage} data-template-tone={template.id}>
                    <TemplateProfilePreview template={template.id} />
                    <button
                      type="button"
                      className={styles.previewButton}
                      aria-label={`Preview ${template.name}`}
                      onClick={(event) => { triggerRef.current = event.currentTarget; setSelected(template); }}
                    >
                      <span><Expand size={15} aria-hidden="true" />Preview layout</span>
                    </button>
                  </div>
                  <div className={styles.cardCopy}>
                    <div className={styles.cardTitle}>
                      <h2>{template.name}</h2>
                      <Link to={detailPath(template)} aria-label={`Read about ${template.name}`}><ArrowUpRight size={21} aria-hidden="true" /></Link>
                    </div>
                    <p>{templatePresentation[template.id].summary}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>

          <aside className={styles.guide} aria-labelledby="template-guide-title">
            <div><h2 id="template-guide-title">The layout is only the starting point.</h2><p>Change your images, colors, and cards. Your links and content stay with you when you switch layouts.</p></div>
            <Link to="/templates/link-in-bio">Compare the layouts<ArrowRight size={18} aria-hidden="true" /></Link>
          </aside>
        </div>
      </main>
      <Footer variant="landing" />

      <Dialog.Root open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content
            className={styles.dialog}
            onOpenAutoFocus={(event) => { event.preventDefault(); previewTitleRef.current?.focus(); }}
            onCloseAutoFocus={(event) => { event.preventDefault(); triggerRef.current?.focus(); }}
          >
            <div className={styles.dialogBody}>
            {selected && selectedPresentation && <>
              <div className={styles.dialogScene} data-template-tone={selected.id}>
                <div className={styles.previewScroll} tabIndex={0} role="region" aria-label={`${selected.name} example profile`}>
                  <TemplateProfilePreview template={selected.id} full />
                </div>
              </div>
              <div className={styles.dialogCopy}>
                <p className={styles.previewLabel}>Layout preview</p>
                <Dialog.Title ref={previewTitleRef} tabIndex={-1}>{selected.name}</Dialog.Title>
                <Dialog.Description className={styles.dialogDescription}>{selectedPresentation.detail}</Dialog.Description>
                <ul>{selectedPresentation.traits.map((trait) => <li key={trait}><Check size={16} aria-hidden="true" />{trait}</li>)}</ul>
                <p className={styles.exampleNote}>Example content, rendered with the same layout as the profile editor.</p>
                <Link to={user ? "/dashboard/profile" : "/register"} className={styles.primaryAction}>{user ? "Open your profiles" : "Get started"}<ArrowUpRight size={18} aria-hidden="true" /></Link>
                <p className={styles.editorNote}>Choose your layout in the profile editor.</p>
                <Link className={styles.detailsLink} to={detailPath(selected)}>{selected.id === "visual" ? "About profile layouts" : "Read the layout guide"}<ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
            </>}
            </div>
            <Dialog.Close className={styles.closeButton} aria-label="Close preview"><X size={20} aria-hidden="true" /></Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
