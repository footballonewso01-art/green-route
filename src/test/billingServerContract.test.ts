import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readWorkspaceFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("billing period server contract", () => {
  it("persists Stripe subscription periods instead of estimated calendar dates", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");

    expect(hook).toContain("stripeUtils.fetchStripeSubscriptionPeriod(subscriptionId, STRIPE_SECRET_KEY)");
    expect(hook).toContain('set("period_start", checkoutPeriod.start)');
    expect(hook).toContain('set("end_date", checkoutPeriod.end)');
    expect(hook).not.toContain("now.addDate(0, 1, 2)");
    expect(utils).toContain("fetchStripeSubscriptionPeriod,");
    expect(utils).toContain("getStripePeriodFromSubscription,");
    expect(utils).toContain('toISOString().replace("T", " ")');
    expect(utils).not.toContain("new DateTime(new Date(");
  });

  it("loads Stripe helpers inside isolated PocketBase route callbacks", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");

    expect(hook.match(/require\(__hooks \+ '\/utils\.js'\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(hook).not.toMatch(/[^.]fetchStripeSubscriptionPeriod\(subscriptionId, STRIPE_SECRET_KEY\)/);
    expect(hook).not.toMatch(/[^.]getStripePeriodFromSubscription\(/);
  });

  it("keeps checkout session ids available when fallback activation fails", () => {
    for (const page of ["src/pages/Billing.tsx", "src/pages/SettingsPage.tsx"]) {
      const source = readWorkspaceFile(page);
      const finallyBlock = source.match(/finally\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";

      expect(source).toContain("Payment received, but plan activation is still pending.");
      expect(finallyBlock).not.toContain("setSearchParams");
    }
  });

  it("ships an idempotent schema update and reconciliation tool for existing records", () => {
    const repair = readWorkspaceFile("pocketbase/repair_db.py");
    const backfill = readWorkspaceFile("pocketbase/backfill_billing_periods.py");

    expect(repair).toContain('"name": "period_start"');
    expect(backfill).toContain("https://api.stripe.com/v1/subscriptions/");
    expect(backfill).toContain("WHERE id = ? AND stripe_subscription_id = ?");
    expect(backfill).toContain("UPDATE billing SET status = 'expired'");
  });

  it("restores cancellation at period end in both billing surfaces", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const sharedButton = readWorkspaceFile("src/components/billing/CancelRenewalButton.tsx");

    expect(hook).toContain("cancel_at_period_end=true");
    expect(hook).toContain("res.json.cancel_at_period_end !== true");
    expect(hook).toContain('txBilling.set("status", "canceling")');
    expect(hook).toContain('txUser.set("plan_expires_at", cancellationPeriod.end)');
    expect(sharedButton).toContain("/api/stripe/cancel-subscription");
    expect(sharedButton).toContain("result?.cancelAtPeriodEnd");

    for (const page of ["src/pages/Billing.tsx", "src/pages/SettingsPage.tsx"]) {
      expect(readWorkspaceFile(page)).toContain("<CancelRenewalButton");
    }
  });
});
