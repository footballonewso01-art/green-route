import type { ReactNode } from "react";
import MarketingHeader from "@/components/MarketingHeader";
import Footer from "@/components/Footer";
import "@/styles/landing-rebrand.css";
import styles from "./FeatureMarketing.module.css";

export default function FeatureMarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page} data-feature-marketing>
      <a href="#feature-main" className={styles.skipLink}>Skip to content</a>
      <MarketingHeader current="features" />
      <main id="feature-main">{children}</main>
      <Footer variant="landing" />
    </div>
  );
}
