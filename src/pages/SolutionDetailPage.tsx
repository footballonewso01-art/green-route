import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Info, MoveRight } from "lucide-react";
import { Link, Navigate, useLocation } from "react-router-dom";
import Footer from "@/components/Footer";
import MarketingHeader from "@/components/MarketingHeader";
import SolutionDetailVisual from "@/components/solutions/SolutionDetailVisual";
import { getSolutionDetail } from "@/components/solutions/solutionDetailContent";
import { useSeo } from "@/hooks/useSeo";
import { PRIMARY_ORIGIN } from "@/lib/siteConfig";
import "@/styles/landing-rebrand.css";
import styles from "@/components/solutions/SolutionDetails.module.css";

export default function SolutionDetailPage() {
  const { pathname } = useLocation();
  const solution = getSolutionDetail(pathname);
  const reduceMotion = useReducedMotion();

  useSeo(solution ? {
    ...solution.seo,
    faq: solution.faqs,
    structuredData: {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage", "@id": `${PRIMARY_ORIGIN}${solution.path}#page`, url: `${PRIMARY_ORIGIN}${solution.path}`, name: solution.seo.title, description: solution.seo.description, inLanguage: "en", isPartOf: { "@id": `${PRIMARY_ORIGIN}/#website` } },
        { "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: PRIMARY_ORIGIN },
          { "@type": "ListItem", position: 2, name: "Solutions", item: `${PRIMARY_ORIGIN}/solutions` },
          { "@type": "ListItem", position: 3, name: solution.title, item: `${PRIMARY_ORIGIN}${solution.path}` },
        ] },
      ],
    },
  } : { title: "Solution not found | Linktery", description: "", canonical: pathname, noIndex: true });

  if (!solution) return <Navigate to="/404" replace />;
  const Icon = solution.icon;

  return (
    <div className={styles.page} data-solution-detail={solution.path}>
      <a href="#solution-main" className={styles.skipLink}>Skip to solution</a>
      <MarketingHeader current="solutions" />
      <main id="solution-main" className={styles.main}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link to="/">Home</Link><ChevronRight size={14} aria-hidden="true" /><Link to="/solutions">Solutions</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{solution.label}</span>
          </nav>

          <section className={styles.hero} aria-labelledby="solution-title">
            <motion.div className={styles.heroCopy} initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55, ease: [.16, 1, .3, 1] }}>
              <p className={styles.eyebrow}><Icon size={16} strokeWidth={1.8} aria-hidden="true" />Solution guide · {solution.label}</p>
              <h1 id="solution-title">{solution.title}</h1>
              <p className={styles.lead}>{solution.lead}</p>
              <div className={styles.heroActions}>
                <Link to="/register" className={styles.primaryAction}>Start free<ArrowUpRight size={18} aria-hidden="true" /></Link>
                <Link to={solution.featureLink.path} className={styles.secondaryAction}>{solution.featureLink.label}<ArrowRight size={17} aria-hidden="true" /></Link>
              </div>
              <div className={styles.useWhen}><span>Use this when</span><p>{solution.useWhen}</p></div>
            </motion.div>
            <motion.div initial={reduceMotion ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .6, delay: .08, ease: [.16, 1, .3, 1] }}>
              <SolutionDetailVisual solution={solution} />
            </motion.div>
          </section>

          <section className={styles.setup} aria-labelledby="setup-title">
            <div className={styles.sectionHeading}><p>Practical setup</p><h2 id="setup-title">From shared link to useful destination.</h2><span>Three steps, in order.</span></div>
            <ol className={styles.steps}>
              {solution.steps.map((step, index) => <motion.li key={step.title} initial={reduceMotion ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }} transition={{ duration: .45, delay: index * .06 }}><span>0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p>{index < 2 && <MoveRight size={18} aria-hidden="true" />}</motion.li>)}
            </ol>
          </section>
        </div>

        <section className={styles.capabilitySection} aria-labelledby="capability-title">
          <div className={styles.capabilityInner}>
            <div className={styles.capabilityIntro}><p>What Linktery handles</p><h2 id="capability-title">The link layer between a click and its destination.</h2><Link to={solution.featureLink.path}>{solution.featureLink.label}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
            <div className={styles.capabilityList}>{solution.capabilities.map((capability) => <article key={capability.title}><span><Check size={15} aria-hidden="true" /></span><div><h3>{capability.title}</h3><p>{capability.text}</p></div></article>)}</div>
            <aside className={styles.boundary}><Info size={19} aria-hidden="true" /><div><p>Important boundary</p><h3>{solution.boundary.title}</h3><span>{solution.boundary.text}</span></div></aside>
          </div>
        </section>

        <div className={styles.container}>
          <section className={styles.faqSection} aria-labelledby="faq-title">
            <div className={styles.sectionHeading}><p>Questions</p><h2 id="faq-title">Before you publish.</h2><span>What this setup can and cannot do.</span></div>
            <div className={styles.faqs}>{solution.faqs.map((item) => <details key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div>
          </section>

          <section className={styles.related} aria-labelledby="related-title">
            <div className={styles.relatedHeading}><h2 id="related-title">Continue from here.</h2><Link to="/solutions">All solutions<ArrowRight size={16} aria-hidden="true" /></Link></div>
            <div className={styles.relatedGrid}>{solution.related.map((item) => <Link key={item.path} to={item.path}><span>{item.label}</span><strong>{item.title}</strong><ArrowUpRight size={18} aria-hidden="true" /></Link>)}</div>
          </section>
        </div>
      </main>
      <Footer variant="landing" />
    </div>
  );
}
