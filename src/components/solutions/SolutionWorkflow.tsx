import { ArrowDown, ArrowRight, ArrowUpRight, Globe, Link2, ShoppingBag } from "lucide-react";
import creatorPortrait from "@/assets/hero-creator-portrait.webp";
import type { SolutionVisual } from "./solutionPresentation";
import styles from "./Solutions.module.css";

// Editorial examples: no fake controls, live counters, or customer results.
export default function SolutionWorkflow({ kind }: { kind: SolutionVisual }) {
  return (
    <div className={`${styles.workflow} ${styles[kind]}`} aria-hidden="true">
      <span className={styles.exampleLabel}>Example workflow</span>
      {kind === "profile" && (
        <div className={styles.profileScene}>
          <div className={styles.sourceLabel}><Link2 size={13} />Your social bio<ArrowDown size={13} /></div>
          <div className={styles.miniProfile}>
            <div className={styles.profileIdentity}><img src={creatorPortrait} alt="" width="40" height="40" /><div><strong>The Sunday Edit</strong><span>A little of everything I create.</span></div></div>
            <div className={styles.profileDestinations}><span>Latest work<ArrowUpRight size={12} /></span><span>Work with me<ArrowUpRight size={12} /></span></div>
          </div>
        </div>
      )}
      {kind === "store" && (
        <div className={styles.storeScene}>
          <div className={styles.productCover}><span>THE EVERYDAY</span><strong>Field<br />notes.</strong><span>A CREATIVE WORKBOOK</span></div>
          <div className={styles.storeJourney}><span className={styles.sourceLabel}><Link2 size={13} />Launch post</span><ArrowDown size={18} /><span className={styles.checkoutLabel}><ShoppingBag size={17} /><span>Your store<small>Product & checkout</small></span><ArrowUpRight size={14} /></span></div>
        </div>
      )}
      {kind === "routing" && (
        <div className={styles.routingScene}>
          <div className={styles.campaignAddress}><Link2 size={14} /><span>Summer campaign</span><span>Country</span></div>
          <div className={styles.routeBranches}>
            <div><span className={styles.countryCode}>US</span><span>United States</span><ArrowRight size={13} /><strong>US store</strong></div>
            <div><Globe size={17} /><span>Everyone else</span><ArrowRight size={13} /><strong>Global store</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}
