import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Quote } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { getLandingTestimonials, type LandingTestimonial } from "@/data/landingTestimonials";
import styles from "./LandingTestimonials.module.css";

function TestimonialCard({ item, index, total }: { item: LandingTestimonial; index: number; total: number }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const reduceMotion = useReducedMotion();
  const initials = item.author.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <motion.div
      className={styles.cardSlot}
      data-testimonial-item
      initial={reduceMotion ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : Math.min(index, 3) * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
    <article className={styles.card} aria-roledescription="slide" aria-label={`${index + 1} of ${total}`}>
      <Quote className={styles.quoteMark} size={28} strokeWidth={1.6} aria-hidden="true" />
      <blockquote><p>{item.quote}</p></blockquote>
      <footer className={styles.attribution}>
        <span className={styles.avatar} aria-hidden="true">
          {item.avatarUrl && !avatarFailed
            ? <img src={item.avatarUrl} alt="" width="44" height="44" loading="lazy" decoding="async" onError={() => setAvatarFailed(true)} />
            : initials}
        </span>
        <div>
          {item.sourceUrl
            ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.author}>{item.author}<ArrowUpRight size={13} aria-hidden="true" /></a>
            : <span className={styles.author}>{item.author}</span>}
          <span className={styles.role}>{item.role}</span>
        </div>
      </footer>
    </article>
    </motion.div>
  );
}

export function TestimonialSection({ items, isPreview = false }: { items: readonly LandingTestimonial[]; isPreview?: boolean }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [view, setView] = useState({ index: 0, canPrevious: false, canNext: false, overflow: false });
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const measure = () => {
      const cards = Array.from(viewport.querySelectorAll<HTMLElement>("[data-testimonial-item]"));
      const first = cards[0];
      if (!first) return;
      const origin = first.offsetLeft;
      const index = cards.reduce((nearest, card, i) => (
        Math.abs(card.offsetLeft - origin - viewport.scrollLeft) < Math.abs(cards[nearest].offsetLeft - origin - viewport.scrollLeft) ? i : nearest
      ), 0);
      const remaining = viewport.scrollWidth - viewport.clientWidth - viewport.scrollLeft;
      // Rotated card edges can add a few fractional pixels to the scroll area.
      const edgeTolerance = 4;
      const nextView = { index, canPrevious: viewport.scrollLeft > edgeTolerance, canNext: remaining > edgeTolerance, overflow: viewport.scrollWidth - viewport.clientWidth > edgeTolerance };
      setView((current) => current.index === nextView.index
        && current.canPrevious === nextView.canPrevious
        && current.canNext === nextView.canNext
        && current.overflow === nextView.overflow ? current : nextView);
    };

    measure();
    viewport.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    observer?.observe(viewport);
    return () => {
      viewport.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [items]);

  const move = (direction: -1 | 1) => {
    if (direction === -1 ? !view.canPrevious : !view.canNext) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const cards = Array.from(viewport.querySelectorAll<HTMLElement>("[data-testimonial-item]"));
    const next = Math.max(0, Math.min(cards.length - 1, view.index + direction));
    const target = cards[next];
    if (!target) return;
    viewport.scrollTo({ left: target.offsetLeft - cards[0].offsetLeft, behavior: reduceMotion ? "auto" : "smooth" });
    setAnnouncement(`Showing testimonial ${next + 1} of ${items.length}: ${items[next].author}.`);
  };

  return (
    <section id="testimonials" className={styles.section} aria-labelledby="linktery-testimonials-title" data-landing-testimonials data-preview={isPreview || undefined}>
      <div className={styles.inner}>
        <motion.header
          className={styles.header}
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <h2 id="linktery-testimonials-title" className={styles.title}>In their own words.</h2>
            {isPreview && <p className={styles.previewNote}>Design preview — sample copy, not customer reviews.</p>}
          </div>
        </motion.header>

        <div
          className={styles.viewport}
          ref={viewportRef}
          role="region"
          aria-roledescription="carousel"
          aria-label={isPreview ? "Testimonial design examples" : "Customer testimonials"}
          tabIndex={view.overflow ? 0 : undefined}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget || !view.overflow) return;
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              move(event.key === "ArrowLeft" ? -1 : 1);
            }
          }}
        >
          <div className={`${styles.track} ${items.length === 1 ? styles.single : ""}`}>
            {items.map((item, index) => <TestimonialCard key={item.id} item={item} index={index} total={items.length} />)}
          </div>
        </div>

        {view.overflow && <div className={styles.controls}>
          <span className={styles.position} aria-hidden="true">{String(view.index + 1).padStart(2, "0")} <span>/ {String(items.length).padStart(2, "0")}</span></span>
          <div>
            <button type="button" aria-label="Previous testimonial" disabled={!view.canPrevious} onClick={() => move(-1)}><ArrowLeft size={20} aria-hidden="true" /></button>
            <button type="button" aria-label="Next testimonial" disabled={!view.canNext} onClick={() => move(1)}><ArrowRight size={20} aria-hidden="true" /></button>
          </div>
        </div>}
        <p className={styles.visuallyHidden} role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
      </div>
    </section>
  );
}

export default function LandingTestimonials() {
  const { items, isPreview } = getLandingTestimonials();
  if (items.length === 0) return null;
  return <TestimonialSection items={items} isPreview={isPreview} />;
}
