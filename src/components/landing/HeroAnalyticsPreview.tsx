import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import {
  getHeroAnalyticsFrame,
  HERO_ANALYTICS_DELAY_MS,
  HERO_ANALYTICS_DURATION_MS,
  HERO_ANALYTICS_FINAL,
  HERO_ANALYTICS_START,
} from "@/lib/heroAnalyticsAnimation";

const formatClicks = new Intl.NumberFormat("en-US");

export default function HeroAnalyticsPreview() {
  const ref = useRef<HTMLDListElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const finished = useRef(false);
  // Prerendering and no-JS visitors retain the final example, not a partial count.
  const [stats, setStats] = useState(HERO_ANALYTICS_FINAL);

  useEffect(() => {
    if (!inView || finished.current) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches) {
      finished.current = true;
      return;
    }

    let frameId = 0;
    let cancelled = false;
    const startAt = performance.now() + HERO_ANALYTICS_DELAY_MS;
    setStats(HERO_ANALYTICS_START);

    const finish = () => {
      cancelled = true;
      finished.current = true;
      window.cancelAnimationFrame(frameId);
      motionPreference.removeEventListener("change", onMotionChange);
      setStats(HERO_ANALYTICS_FINAL);
    };
    const onMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) finish();
    };
    const tick = (now: number) => {
      if (cancelled) return;
      const elapsed = now - startAt;
      if (elapsed >= HERO_ANALYTICS_DURATION_MS) {
        finish();
        return;
      }
      const next = getHeroAnalyticsFrame(elapsed);
      setStats((previous) => previous.clicks === next.clicks && previous.country === next.country ? previous : next);
      frameId = window.requestAnimationFrame(tick);
    };

    motionPreference.addEventListener("change", onMotionChange);
    frameId = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      motionPreference.removeEventListener("change", onMotionChange);
    };
  }, [inView]);

  return (
    <dl ref={ref} className="landing-analytics-preview" aria-label="Example analytics snapshot" aria-live="off">
      <div className="landing-analytics-stat landing-analytics-stat--clicks">
        <dt>Clicks</dt>
        <dd aria-label="143,873 tracked visits">
          <strong aria-hidden="true" data-analytics-clicks>{formatClicks.format(stats.clicks)}</strong>
          <span aria-hidden="true">tracked visits</span>
        </dd>
      </div>
      <div className="landing-analytics-stat landing-analytics-stat--country">
        <dt>Top country</dt>
        <dd aria-label="93% USA">
          <strong aria-hidden="true" data-analytics-country>{stats.country}%</strong>
          <span aria-hidden="true"><i />USA</span>
        </dd>
        <span className="landing-analytics-share" aria-hidden="true"><i style={{ width: `${stats.country}%` }} /></span>
      </div>
    </dl>
  );
}
