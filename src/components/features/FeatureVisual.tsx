import { ArrowDown, ArrowRight, ArrowUpRight, Globe, Link2, PanelsTopLeft, Shuffle } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import deeplinkJourney from "@/assets/feature-deeplink-journey.webp";
import { AnalyticsExample, RoutingExample } from "@/components/landing/LandingFeatures";
import demoStyles from "@/components/landing/LandingFeatures.module.css";
import { PUBLIC_API_BASE_URL } from "@/lib/siteConfig";
import { getFeaturePresentation } from "./featurePresentation";
import styles from "./FeatureMarketing.module.css";

export default function FeatureVisual({ path }: { path: string }) {
  const reduceMotion = useReducedMotion();
  const kind = getFeaturePresentation(path).visual;

  if (kind === "management") return (
    <figure className={`${styles.visual} ${styles.managementVisual}`}>
      <span className={styles.lightBadge}>Workspace example</span>
      <div className={styles.resourceRow}><Link2 size={20} aria-hidden="true" /><div><strong>Summer campaign</strong><span>Smart Link · Editable destination</span></div><span className={styles.resourceStatus}>Active</span></div>
      <div className={styles.resourceRow}><PanelsTopLeft size={20} aria-hidden="true" /><div><strong>Creator page</strong><span>Public Profile · Links & design</span></div><span className={styles.resourceStatus}>Public</span></div>
      <figcaption>Manage each resource from its own editor.</figcaption>
    </figure>
  );

  if (kind === "country" || kind === "device") return (
    <div className={`${styles.visual} ${styles.demoVisual} ${demoStyles.darkCard}`}>
      <span className={styles.lightBadge}>One link, different destinations</span>
      <RoutingExample key={kind} initialMode={kind} />
    </div>
  );

  if (kind === "analytics" || kind === "profile-analytics") return (
    <div className={`${styles.visual} ${styles.analyticsVisual}`}>
      <span className={styles.darkBadge}>{kind === "profile-analytics" ? "The profile journey" : "Your traffic, over time"}</span>
      <AnalyticsExample key={kind} reduceMotion={reduceMotion} initialMetric={kind === "profile-analytics" ? "views" : "clicks"} />
    </div>
  );

  if (kind === "deeplink") return (
    <figure className={`${styles.visual} ${styles.deeplinkVisual}`}>
      <span className={styles.lightBadge}>Browser handoff example</span>
      <img src={deeplinkJourney} alt="An emerald arrow connects a social app to an external browser." width="800" height="400" decoding="async" />
      <div className={styles.journeyLabels}><span>Social app</span><ArrowRight size={20} aria-hidden="true" /><span>Browser destination</span></div>
      <figcaption>Supported apps and devices. A web fallback when needed.</figcaption>
    </figure>
  );

  if (kind === "api") return (
    <div className={`${styles.visual} ${styles.apiVisual}`}>
      <div className={styles.visualHeading}><span className={styles.lightBadge}>Request example</span><span>Public API · v1</span></div>
      <div className={styles.requestLine}><span>GET</span><code>/v1/links</code></div>
      <pre aria-label="Example authenticated API request"><code>{`curl "${PUBLIC_API_BASE_URL}/links" \\\n  -H "Authorization: Bearer $LINKTERY_API_KEY"`}</code></pre>
      <p>Read your links. Connect your workflow.<br />Keep access scoped to your account.</p>
      <Link to="/documentation" className={styles.visualLink}>Read the API docs <ArrowUpRight size={17} aria-hidden="true" /></Link>
    </div>
  );

  if (kind === "rotation") return (
    <figure className={`${styles.visual} ${styles.rotationVisual}`}>
      <span className={styles.lightBadge}>Example traffic split</span>
      <div className={styles.address}><Shuffle aria-hidden="true" size={24} /><span>linktery.com/launch</span></div>
      <ArrowDown className={styles.downArrow} size={24} aria-hidden="true" />
      <div className={styles.splitTrack} aria-hidden="true"><span /><span /></div>
      <div className={styles.splitLabels}><div><strong>50%</strong><span>Destination A</span></div><div><strong>50%</strong><span>Destination B</span></div></div>
      <figcaption>Equal chance per visit with two destinations.<br />Expected allocation, not guaranteed click totals.</figcaption>
    </figure>
  );

  if (kind === "branded") return (
    <figure className={`${styles.visual} ${styles.brandedVisual}`}>
      <span className={styles.lightBadge}>Two address formats</span>
      <div className={styles.brandAddress}><span>Platform domain + custom slug</span><strong>linktery.com/launch</strong><small>Custom Smart Link slugs: Agency</small></div>
      <div className={styles.brandAddress}><span>Your own domain</span><strong>go.yourbrand.com</strong><small>Root address, no /slug · Pro & Agency</small></div>
      <figcaption>Illustrative addresses. Availability and verification apply.</figcaption>
    </figure>
  );

  const short = kind === "short-link";
  return (
    <figure className={`${styles.visual} ${styles.addressVisual}`}>
      <span className={styles.lightBadge}>{short ? "Short URL example" : "Custom domain example"}</span>
      <div className={styles.addressFrom}>{short ? "example.com/collections/summer?campaign=launch" : "A link or Public Profile"}</div>
      <ArrowDown className={styles.downArrow} size={24} aria-hidden="true" />
      <div className={styles.address}>
        {short ? <Link2 size={25} aria-hidden="true" /> : <Globe size={25} aria-hidden="true" />}
        <span>{short ? "linktery.com/a7b2k9" : "yourbrand.com"}</span>
        <ArrowUpRight size={22} aria-hidden="true" />
      </div>
      <div className={styles.addressMeta}>{short ? "Short address. Managed destination." : "Custom domain, right at the root."}</div>
      <figcaption>{short ? "Example short URL" : "Example domain · ownership verification required"}</figcaption>
    </figure>
  );
}
