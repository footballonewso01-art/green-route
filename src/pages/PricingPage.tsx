import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import MarketingHeader from "@/components/MarketingHeader";
import Footer from "@/components/Footer";
import LandingPricing from "@/components/landing/LandingPricing";
import { PLANS, type PlanType } from "@/lib/plans";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";
import { createPageBreadcrumbSchema } from "@/lib/breadcrumbSchema";
import { trackGrowthEvent } from "@/lib/telemetry";
import "@/styles/landing-rebrand.css";
import styles from "./PricingPage.module.css";

export default function PricingPage() {
  const { user } = useAuth();
  const storedPlan = (user as { plan?: string } | null)?.plan;
  const currentPlan: PlanType = storedPlan && Object.prototype.hasOwnProperty.call(PLANS, storedPlan) ? storedPlan as PlanType : "creator";

  useSeo({
    ...SEO_PAGES.pricing,
    structuredData: createPageBreadcrumbSchema("Pricing", SEO_PAGES.pricing.canonical),
  });

  useEffect(() => {
    try {
      if (sessionStorage.getItem("pricing_viewed")) return;
      sessionStorage.setItem("pricing_viewed", "true");
      trackGrowthEvent("pricing_viewed", { surface: "pricing" });
    } catch {
      trackGrowthEvent("pricing_viewed", { surface: "pricing" });
    }
  }, []);

  return (
    <div className={styles.page} data-pricing-page>
      <a href="#pricing-main" className={styles.skipLink}>Skip to pricing</a>
      <MarketingHeader current="pricing" />
      <main id="pricing-main">
        <LandingPricing authenticated={Boolean(user)} currentPlan={currentPlan} variant="page" />
      </main>
      <Footer variant="landing" />
    </div>
  );
}
