import { useState } from "react";
import { ArrowUpRight, Building2, Check, Link2, Zap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { PLAN_RANKS, PLANS, type PlanType } from "@/lib/plans";
import styles from "./LandingPricing.module.css";

type BillingCycle = "monthly" | "annual";

const PLAN_ORDER: readonly PlanType[] = ["creator", "pro", "agency"];
const ANNUAL_MONTHLY_PRICE: Partial<Record<PlanType, number>> = { pro: 9, agency: 24 };
const PLAN_ICONS = { creator: Link2, pro: Zap, agency: Building2 } as const;

interface LandingPricingProps {
  authenticated: boolean;
  currentPlan?: PlanType;
  variant?: "section" | "page" | "dashboard";
  onChoosePlan?: (planId: PlanType) => void;
  pendingPlan?: PlanType | null;
  billingCycle?: BillingCycle;
  onBillingCycleChange?: (cycle: BillingCycle) => void;
}

export default function LandingPricing({ authenticated, currentPlan, variant = "section", onChoosePlan, pendingPlan = null, billingCycle: controlledBillingCycle, onBillingCycleChange }: LandingPricingProps) {
  const [localBillingCycle, setLocalBillingCycle] = useState<BillingCycle>("monthly");
  const billingCycle = controlledBillingCycle ?? localBillingCycle;
  const setBillingCycle = (cycle: BillingCycle) => {
    setLocalBillingCycle(cycle);
    onBillingCycleChange?.(cycle);
  };
  const reduceMotion = useReducedMotion();
  const effectivePlan = currentPlan || "creator";
  const isDashboard = variant === "dashboard";
  const Heading = variant === "section" ? "h2" : "h1";
  const PlanHeading = variant === "section" ? "h3" : "h2";

  return (
    <section id={isDashboard ? undefined : "pricing"} className={`${styles.section} ${variant === "page" ? styles.pageSection : ""} ${isDashboard ? styles.dashboardSection : ""}`} aria-labelledby="landing-pricing-title" data-landing-pricing data-dashboard-pricing={isDashboard || undefined}>
      <div className={styles.inner}>
        <motion.header
          className={styles.header}
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Heading id="landing-pricing-title" className={styles.title}>{isDashboard ? "Plans & billing" : "Start free. Add power when you need it."}</Heading>
          <p className={styles.lede}>{isDashboard ? "Compare your account options and choose the controls you need." : "Every plan includes a polished Public Profile. Upgrade when your traffic needs more control."}</p>

          <div className={styles.billing} role="group" aria-label="Billing cycle">
            <button type="button" aria-pressed={billingCycle === "monthly"} onClick={() => setBillingCycle("monthly")}>Monthly</button>
            <button type="button" aria-pressed={billingCycle === "annual"} onClick={() => setBillingCycle("annual")}>
              Annual <span>Save 20%</span>
            </button>
          </div>
        </motion.header>

        <div className={styles.grid} data-pricing-grid>
          {PLAN_ORDER.map((planId, index) => {
            const plan = PLANS[planId];
            const PlanIcon = PLAN_ICONS[planId];
            const annualPrice = ANNUAL_MONTHLY_PRICE[planId];
            const price = billingCycle === "annual" && annualPrice !== undefined ? annualPrice : plan.price;
            const isCurrent = authenticated && effectivePlan === planId;
            const isDowngrade = authenticated && PLAN_RANKS[planId] < PLAN_RANKS[effectivePlan];
            const isDisabled = isCurrent || isDowngrade || pendingPlan !== null;
            const isPending = pendingPlan === planId;
            const cardClass = planId === "pro" ? styles.proCard : planId === "agency" ? styles.agencyCard : styles.creatorCard;
            const actionLabel = isCurrent
              ? "Your current plan"
              : isDowngrade
                ? "Included in your plan"
                : planId === "creator"
                  ? "Get started free"
                  : `Choose ${plan.name}`;

            return (
              <motion.div
                key={planId}
                className={styles.cardSlot}
                data-pricing-card
                initial={reduceMotion ? false : { opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.12 }}
                transition={{ duration: reduceMotion ? 0 : 0.62, delay: reduceMotion ? 0 : index * 0.09, ease: [0.16, 1, 0.3, 1] }}
              >
                <article className={`${styles.card} ${cardClass}`} aria-labelledby={`landing-plan-${planId}`}>
                  <div className={styles.cardTopline}>
                    <span className={styles.planIcon} aria-hidden="true"><PlanIcon size={20} strokeWidth={1.8} /></span>
                    {planId === "pro" && <span className={styles.popular}>Most popular</span>}
                    {planId === "agency" && <span className={styles.planTag}>For scale</span>}
                  </div>

                  <div className={styles.planIntro}>
                    <PlanHeading id={`landing-plan-${planId}`}>{plan.name}</PlanHeading>
                    <p>{plan.description}</p>
                  </div>

                  <div className={styles.priceRow} aria-label={`${plan.name}: ${price} US dollars per month`}>
                    <span className={styles.currency}>$</span>
                    <strong>{price}</strong>
                    <span className={styles.period}>/mo</span>
                  </div>
                  <p className={styles.billingNote}>
                    {planId === "creator"
                      ? "Free forever"
                      : billingCycle === "annual"
                        ? `$${price * 12} billed annually`
                        : "Billed monthly"}
                  </p>

                  <div className={styles.rule} aria-hidden="true" />

                  <ul className={styles.features} aria-label={`${plan.name} features`}>
                    {plan.features.map((feature) => (
                      <li key={feature.text}>
                        <span aria-hidden="true"><Check size={14} strokeWidth={2.5} /></span>
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>

                  {isDisabled ? (
                    <button type="button" className={styles.disabledAction} disabled aria-busy={isPending || undefined}>{isPending ? "Opening checkout…" : actionLabel}</button>
                  ) : isDashboard && onChoosePlan ? (
                    <button type="button" className={styles.action} onClick={() => onChoosePlan(planId)}>
                      {actionLabel} <ArrowUpRight size={17} aria-hidden="true" />
                    </button>
                  ) : (
                    <Link to={authenticated ? "/dashboard/pricing" : "/register"} className={styles.action}>
                      {actionLabel} <ArrowUpRight size={17} aria-hidden="true" />
                    </Link>
                  )}
                </article>
              </motion.div>
            );
          })}
        </div>

        <div className={styles.assurances} aria-label="Pricing assurances">
          <span><Check size={15} aria-hidden="true" /> 7-day money-back guarantee</span>
          <span><Check size={15} aria-hidden="true" /> Cancel anytime</span>
          <span><Check size={15} aria-hidden="true" /> No credit card on free plan</span>
        </div>
      </div>
    </section>
  );
}
