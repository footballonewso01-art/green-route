"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight, Globe, Link2, Monitor, Palette, Route, Smartphone } from "lucide-react";
import coachProfile from "@/assets/feature-profile-coach.webp";
import founderProfile from "@/assets/feature-profile-founder.webp";
import musicianProfile from "@/assets/feature-profile-musician.webp";
import deeplinkJourney from "@/assets/feature-deeplink-journey.webp";
import styles from "./LandingFeatures.module.css";

const routingExamples = {
  device: [
    { label: "Mobile visitors", destination: "Mobile landing page", icon: Smartphone },
    { label: "Desktop visitors", destination: "Desktop landing page", icon: Monitor },
  ],
  country: [
    { label: "United States", destination: "US landing page", icon: Globe },
    { label: "Everyone else", destination: "Main landing page", icon: Globe },
  ],
};

// Illustrative daily counts, not customer telemetry or platform-wide totals.
const analyticsExamples = {
  clicks: {
    label: "Link clicks",
    values: [514, 608, 542, 749, 681, 815, 923, 786, 968, 1042, 1114, 1028, 1368, 1348],
  },
  views: {
    label: "Profile views",
    values: [58, 81, 64, 95, 87, 103, 126, 115, 142, 167, 154, 189, 205, 226],
  },
};

export function RoutingExample({ initialMode = "country" }: { initialMode?: keyof typeof routingExamples }) {
  const [mode, setMode] = useState<keyof typeof routingExamples>(initialMode);

  return (
    <div className={styles.routingExample}>
      <div className={styles.exampleTop}>
        <span>Try a routing rule</span>
        <div className={styles.switcher} role="group" aria-label="Routing example type">
          <button type="button" aria-pressed={mode === "country"} onClick={() => setMode("country")}>Country</button>
          <button type="button" aria-pressed={mode === "device"} onClick={() => setMode("device")}>Device</button>
        </div>
      </div>
      <div className={styles.sourceLink}>
        <Link2 aria-hidden="true" size={18} />
        <span>linktery.com/launch</span>
      </div>
      <div className={styles.routeConnector} aria-hidden="true"><ArrowDown size={20} /></div>
      <ul className={styles.routeList} aria-live="polite" aria-atomic="true">
        {routingExamples[mode].map(({ label, destination, icon: Icon }) => (
          <li key={label}>
            <span className={styles.routeIcon}><Icon aria-hidden="true" size={19} /></span>
            <span className={styles.routeCondition}>{label}</span>
            <ArrowRight className={styles.routeArrow} aria-hidden="true" size={17} />
            <span className={styles.routeDestination}>{destination}</span>
          </li>
        ))}
      </ul>
      <p className={styles.exampleNote}>Example rules. One shared link stays the same.</p>
    </div>
  );
}

export function AnalyticsExample({ reduceMotion, initialMetric = "clicks" }: { reduceMotion: boolean | null; initialMetric?: keyof typeof analyticsExamples }) {
  const [metric, setMetric] = useState<keyof typeof analyticsExamples>(initialMetric);
  const example = analyticsExamples[metric];
  const total = example.values.reduce((sum, value) => sum + value, 0);
  const max = Math.max(...example.values);
  const totalLabel = new Intl.NumberFormat("en-US").format(total);

  return (
    <div className={styles.analyticsExample}>
      <div className={styles.exampleTop}>
        <div className={styles.switcher} role="group" aria-label="Analytics example metric">
          <button type="button" aria-pressed={metric === "clicks"} onClick={() => setMetric("clicks")}>Link clicks</button>
          <button type="button" aria-pressed={metric === "views"} onClick={() => setMetric("views")}>Profile views</button>
        </div>
        <span className={styles.sampleLabel}>Example data</span>
      </div>
      <div className={styles.chartSummary} aria-live="polite" aria-atomic="true">
        <strong>{totalLabel}</strong>
        <span>{example.label.toLowerCase()}<br />over 14 days</span>
      </div>
      <div className={styles.chart} role="img" aria-label={`Example: ${totalLabel} ${example.label.toLowerCase()} across 14 days.`}>
        {example.values.map((value, index) => (
          <motion.span
            key={`${metric}-${index}`}
            className={styles.chartBar}
            style={{ height: `${(value / max) * 100}%` }}
            initial={reduceMotion ? false : { scaleY: 0.15, opacity: 0 }}
            whileInView={{ scaleY: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: reduceMotion ? 0 : 0.45, delay: reduceMotion ? 0 : index * 0.025 }}
            aria-hidden="true"
          />
        ))}
      </div>
      <div className={styles.chartAxis} aria-hidden="true"><span>Day 1</span><span>Day 7</span><span>Day 14</span></div>
    </div>
  );
}

export default function LandingFeatures() {
  const reduceMotion = useReducedMotion();
  const reveal = (delay = 0) => ({
    initial: reduceMotion ? false as const : { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.16 },
    transition: { duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <section id="features" className={styles.section} aria-labelledby="linktery-features-title" data-landing-features>
      <div className={styles.inner}>
        <motion.header className={styles.header} {...reveal()}>
          <div>
            <h2 id="linktery-features-title" className={styles.title}>Your content. Your rules.</h2>
            <p className={styles.intro}>Customize the experience from the first tap to the final destination.</p>
          </div>
          <Link to="/features" className={styles.explore}>Explore features <ArrowUpRight aria-hidden="true" size={18} /></Link>
        </motion.header>

        <div className={styles.grid}>
          <motion.article className={`${styles.card} ${styles.profileCard}`} data-feature-card="profiles" {...reveal()}>
            <span className={styles.tag}><Palette aria-hidden="true" size={14} />Deep customization</span>
            <h3>Your style. Every detail.</h3>
            <p className={styles.description}>Mix layouts, colors, backgrounds, and card styles to make your profile unmistakably yours.</p>
            <figure className={styles.profileFan}>
              <img className={styles.fanFounder} src={founderProfile} alt="" width="420" height="840" loading="lazy" decoding="async" />
              <img className={styles.fanMusician} src={musicianProfile} alt="" width="420" height="840" loading="lazy" decoding="async" />
              <img className={styles.fanCoach} src={coachProfile} alt="" width="420" height="840" loading="lazy" decoding="async" />
              <figcaption className={styles.visuallyHidden}>Illustrative Linktery profiles for a founder, musician and fitness coach, each with a different visual style.</figcaption>
            </figure>
            <Link to="/templates" className={styles.textLink}>Find your style <ArrowRight aria-hidden="true" size={16} /></Link>
          </motion.article>

          <motion.article className={`${styles.card} ${styles.darkCard} ${styles.routingCard}`} data-feature-card="routing" {...reveal(0.08)}>
            <span className={styles.tag}><Route aria-hidden="true" size={14} />Smart routing</span>
            <h3>Route by country or device.</h3>
            <p className={styles.description}>Keep one shared URL. Set the destination for each audience and update your rules whenever you need.</p>
            <RoutingExample />
          </motion.article>

          <motion.article className={`${styles.card} ${styles.analyticsCard}`} data-feature-card="analytics" {...reveal()}>
            <span className={styles.tag}>Analytics</span>
            <h3>See how your traffic changes.</h3>
            <p className={styles.description}>Follow link clicks and profile views day by day, so you can spot peaks and quieter periods.</p>
            <AnalyticsExample reduceMotion={reduceMotion} />
          </motion.article>

          <div className={styles.miniStack}>
            <motion.article className={`${styles.card} ${styles.miniCard}`} data-feature-card="domains" {...reveal(0.08)}>
              <span className={styles.tag}>Custom domains</span>
              <h3>Put your own name on it.</h3>
              <p className={styles.description}>Connect your domain to a link or profile, right at the root.</p>
              <div className={styles.domainPreview} aria-label="Example domain: yourbrand.com, no extra slug">
                <Globe aria-hidden="true" size={22} /><span>yourbrand.com</span><ArrowUpRight aria-hidden="true" size={19} />
              </div>
              <span className={styles.domainCaption}>No extra /slug</span>
            </motion.article>

            <motion.article className={`${styles.card} ${styles.darkCard} ${styles.miniCard}`} data-feature-card="deeplink" {...reveal(0.12)}>
              <span className={styles.tag}>Deeplink</span>
              <h3>Beyond the in-app browser.</h3>
              <p className={styles.description}>Help visitors from supported social apps continue in Safari or Chrome.</p>
              <figure className={styles.deeplinkVisual}>
                <img src={deeplinkJourney} alt="An emerald arrow connects a social app to a full browser window." width="800" height="400" loading="lazy" decoding="async" />
                <figcaption><span>Social app</span><span>External browser</span></figcaption>
              </figure>
            </motion.article>
          </div>
        </div>
      </div>
    </section>
  );
}
