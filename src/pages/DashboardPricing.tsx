import { useState } from "react";
import LandingPricing from "@/components/landing/LandingPricing";
import { useAuth } from "@/contexts/AuthContext";
import { PLANS, type PlanType } from "@/lib/plans";
import { pb } from "@/lib/pocketbase";
import { STRIPE_PRICES } from "@/lib/stripe";
import { maskError } from "@/lib/utils";
import { toast } from "sonner";

type BillingCycle = "monthly" | "annual";

const isPlanType = (value: unknown): value is PlanType =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(PLANS, value);

export default function DashboardPricing() {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [pendingPlan, setPendingPlan] = useState<PlanType | null>(null);
  const userPlan: PlanType = isPlanType(user?.plan) ? user.plan : "creator";

  const handleUpgrade = async (planId: PlanType) => {
    if (planId === userPlan || pendingPlan) return;
    if (planId === "creator") {
      toast.info("Manage downgrades from Billing settings.");
      return;
    }

    setPendingPlan(planId);
    try {
      try {
        await pb.collection("users").authRefresh();
      } catch (refreshError) {
        const status = (refreshError as { status?: number }).status;
        if (status === 401 || status === 403) {
          toast.error("Your session expired. Sign in again to continue.");
          pb.authStore.clear();
          localStorage.removeItem("pocketbase_auth");
          window.location.href = "/login";
          return;
        }
      }

      if (!pb.authStore.isValid || !pb.authStore.token) {
        toast.error("Your session expired. Sign in again to continue.");
        window.location.href = "/login";
        return;
      }

      const priceId = planId === "pro"
        ? STRIPE_PRICES.pro[billingCycle]
        : STRIPE_PRICES.agency[billingCycle];
      const data = await pb.send("/api/stripe/create-checkout", {
        method: "POST",
        body: { priceId, billingCycle },
      }) as { url: string };
      window.location.assign(data.url);
    } catch (error: unknown) {
      console.error("Upgrade error:", error);
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403) {
        toast.error("Your session expired. Sign in again to continue.");
        pb.authStore.clear();
        localStorage.removeItem("pocketbase_auth");
        window.location.href = "/login";
      } else {
        toast.error(maskError(error, "We couldn't start checkout. Try again."));
      }
    } finally {
      setPendingPlan(null);
    }
  };

  return (
    <LandingPricing
      authenticated
      currentPlan={userPlan}
      variant="dashboard"
      billingCycle={billingCycle}
      onBillingCycleChange={setBillingCycle}
      pendingPlan={pendingPlan}
      onChoosePlan={handleUpgrade}
    />
  );
}
