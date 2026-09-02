import { motion, useReducedMotion } from "framer-motion";
import { MousePointerClick, PanelsTopLeft, UserRound } from "lucide-react";
import styles from "./LandingSocialProof.module.css";

const metrics = [
  {
    value: "6M+",
    label: "Clicks tracked",
    caption: "Measured across live Linktery links.",
    icon: MousePointerClick,
    featured: true,
  },
  {
    value: "3150+",
    label: "Accounts created",
    caption: "People and teams already on Linktery.",
    icon: UserRound,
  },
  {
    value: "1100+",
    label: "Public profiles",
    caption: "Audience destinations created so far.",
    icon: PanelsTopLeft,
  },
];

export default function LandingSocialProof() {
  const reduceMotion = useReducedMotion();

  const reveal = (delay: number, y = 16) => ({
    initial: reduceMotion ? undefined : { opacity: 0, y },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.24 },
    transition: reduceMotion
      ? { duration: 0 }
      : { duration: 0.68, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <section id="social-proof" className={styles.section} aria-labelledby="linktery-proof-title">
      <div className={styles.inner}>
        <motion.header className={styles.header} {...reveal(0)}>
          <h2 id="linktery-proof-title" className={styles.title}>
            Already doing real work.
          </h2>
        </motion.header>

        <div id="social-proof-metrics" className={styles.metrics} aria-label="Linktery platform metrics">
          {metrics.map(({ value, label, caption, icon: Icon, featured }, index) => (
            <motion.article
              className={`${styles.metricCard} ${featured ? styles.metricCardFeatured : ""}`}
              key={label}
              {...reveal(0.08 + index * 0.1, 12)}
            >
              <div className={styles.metricLabel}>
                <span className={styles.metricIcon} aria-hidden="true">
                  <Icon size={18} strokeWidth={1.7} />
                </span>
                <span>{label}</span>
              </div>
              <div className={styles.metricBody}>
                <strong className={styles.metricValue}>{value}</strong>
                <span className={styles.metricSignal} aria-hidden="true"><i /></span>
              </div>
              <p className={styles.metricCaption}>{caption}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
