import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CalendarClock,
  CircleDollarSign,
  Loader2,
  ReceiptText,
  ShieldCheck,
  TicketPercent,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { dollarsToCents } from "@/lib/affiliateMoney";
import { pb } from "@/lib/pocketbase";

export interface AdminPartnerStats {
  total_activated: number;
  creator: number;
  pro: number;
  agency: number;
  earned_cents: number;
  matured_cents: number;
  on_hold_cents: number;
  unpaid_cents: number;
  available_cents: number;
  paid_cents: number;
  commission_payments: number;
  initial_payments: number;
  renewal_payments: number;
  currency: string;
}

export interface AdminPartnerCode {
  id: string;
  code: string;
  name: string;
  active: boolean;
  current_uses: number;
  max_uses: number;
  commission_rate_bps: number;
  reward_enabled: boolean;
  reward_plan: string;
  reward_days: number;
}

export interface AdminPartnerPayout {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  reference: string;
  note: string;
  paid_at: string;
  created: string;
  created_by: string;
  created_by_email: string;
}

export interface AdminPartnerReferral {
  id: string;
  email: string;
  username: string;
  name: string;
  plan: string;
  source: string;
  status: string;
  created: string;
}

export interface AdminPartnerInfoData {
  is_partner: boolean;
  partner: {
    status: string;
    referral_code: string;
    referral_url: string;
    default_commission_rate_bps: number;
  } | null;
  stats: AdminPartnerStats;
  codes: AdminPartnerCode[];
  payouts: AdminPartnerPayout[];
  recent_referrals: AdminPartnerReferral[];
}

interface AdminPartnerInfoProps {
  userId: string;
  data: AdminPartnerInfoData;
  onPayoutRecorded: () => Promise<void>;
}

const formatMoney = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
  }).format(Number(cents || 0) / 100);

const formatDateTime = (value: string) => {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const createPayoutReference = () => {
  const randomPart = typeof crypto !== "undefined" && "getRandomValues" in crypto
    ? Array.from(crypto.getRandomValues(new Uint32Array(2)))
        .map((value) => value.toString(36))
        .join("")
    : Math.random().toString(36).slice(2, 14);
  return `manual_${Date.now().toString(36)}_${randomPart}`;
};

const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof CircleDollarSign;
  accent?: boolean;
}) => (
  <div
    className={`rounded-2xl border p-5 ${
      accent
        ? "border-accent/35 bg-accent/[0.07]"
        : "border-border bg-surface"
    }`}
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      </div>
      <span className={`rounded-xl p-2.5 ${accent ? "bg-accent/15 text-accent" : "bg-background text-muted-foreground"}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    </div>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">{hint}</p>
  </div>
);

export function AdminPartnerInfo({ userId, data, onPayoutRecorded }: AdminPartnerInfoProps) {
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [comment, setComment] = useState("");
  const [recording, setRecording] = useState(false);
  const [attemptReference, setAttemptReference] = useState("");

  const amountCents = useMemo(() => dollarsToCents(amount), [amount]);
  const commentValid = comment.trim().length >= 3;
  const amountValid = amountCents !== null && amountCents <= data.stats.available_cents;
  const canSubmit = amountValid && commentValid && !recording;

  const handleRecordPayout = async () => {
    if (!amountCents || !canSubmit) return;

    const payoutReference = reference.trim() || attemptReference || createPayoutReference();
    if (!reference.trim() && !attemptReference) setAttemptReference(payoutReference);
    setRecording(true);
    try {
      await pb.send("/api/admin/affiliate/payouts", {
        method: "POST",
        requestKey: null,
        body: {
          partner_identifier: userId,
          amount_cents: amountCents,
          reference: payoutReference,
          note: comment.trim(),
        },
      });
    } catch (error) {
      console.error("Affiliate payout recording failed:", error);
      toast.error("Payout could not be recorded. Check the available balance and try again.");
      setRecording(false);
      return;
    }

    setAmount("");
    setReference("");
    setComment("");
    setAttemptReference("");
    toast.success("Payout recorded and partner balance updated");

    try {
      await onPayoutRecorded();
    } catch (error) {
      // The financial write already succeeded. Never invite a retry that could
      // create a second payout just because the follow-up UI refresh failed.
      console.error("Payout was recorded but partner data refresh failed:", error);
      toast.warning("Payout was recorded. Refresh the page to see the latest balance.");
    } finally {
      setRecording(false);
    }
  };

  const primaryCode = data.codes.find((code) => code.active) || data.codes[0];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex flex-col gap-4 border-b border-border bg-gradient-to-r from-accent/[0.08] via-transparent to-transparent p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-accent/15 p-2.5 text-accent">
              <BadgeDollarSign className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Partner account</h2>
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                  {data.partner?.status || "active"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Affiliate performance, commission balance, and payout history.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/70 px-4 py-3 sm:min-w-52">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Primary code
            </p>
            <div className="mt-1 flex items-center justify-between gap-4">
              <span className="font-mono text-sm font-bold text-foreground">
                {primaryCode?.code || data.partner?.referral_code || "—"}
              </span>
              <span className="text-xs font-semibold text-accent">
                {((primaryCode?.commission_rate_bps ?? data.partner?.default_commission_rate_bps ?? 0) / 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total earned"
          value={formatMoney(data.stats.earned_cents, data.stats.currency)}
          hint={`${data.stats.commission_payments} commission events`}
          icon={CircleDollarSign}
        />
        <StatCard
          label="Available to pay"
          value={formatMoney(data.stats.available_cents, data.stats.currency)}
          hint="Past the refund hold and not yet paid"
          icon={WalletCards}
          accent
        />
        <StatCard
          label="Already paid"
          value={formatMoney(data.stats.paid_cents, data.stats.currency)}
          hint={`${data.payouts.length} recorded payout${data.payouts.length === 1 ? "" : "s"}`}
          icon={ReceiptText}
        />
        <StatCard
          label="Activated referrals"
          value={data.stats.total_activated.toLocaleString()}
          hint={`${data.stats.pro} Pro · ${data.stats.agency} Agency`}
          icon={Users}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,1.1fr)]">
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-background p-2 text-muted-foreground">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-bold text-foreground">Commission snapshot</h3>
              <p className="text-xs text-muted-foreground">Current ledger state</p>
            </div>
          </div>

          <dl className="mt-5 divide-y divide-border rounded-xl border border-border bg-background/45 px-4">
            {[
              ["Matured commissions", formatMoney(data.stats.matured_cents)],
              ["Still on hold", formatMoney(data.stats.on_hold_cents)],
              ["Unpaid earnings", formatMoney(data.stats.unpaid_cents)],
              ["Initial payments", data.stats.initial_payments.toLocaleString()],
              ["Renewal payments", data.stats.renewal_payments.toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="text-sm font-semibold text-foreground">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              ["Creator", data.stats.creator],
              ["Pro", data.stats.pro],
              ["Agency", data.stats.agency],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-background/45 p-3 text-center">
                <p className="text-lg font-bold text-foreground">{value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-accent/25 bg-surface p-5 shadow-[0_0_40px_rgba(16,185,129,0.04)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-foreground">Record a payout</h3>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Creates a permanent log entry and immediately updates Already paid.
              </p>
            </div>
            <span className="rounded-xl bg-accent/15 p-2.5 text-accent">
              <CalendarClock className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="partner-payout-amount">Amount (USD)</Label>
                <span className="text-xs text-muted-foreground">
                  Max {formatMoney(data.stats.available_cents)}
                </span>
              </div>
              <Input
                id="partner-payout-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className="h-11 rounded-xl border-border bg-background"
              />
              {amountCents !== null && amountCents > data.stats.available_cents && (
                <p className="text-xs text-red-400">Amount exceeds the available balance.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner-payout-reference">Payment reference (optional)</Label>
              <Input
                id="partner-payout-reference"
                value={reference}
                maxLength={255}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Stripe transfer, bank reference, transaction ID"
                className="h-11 rounded-xl border-border bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner-payout-comment">Internal comment</Label>
              <Textarea
                id="partner-payout-comment"
                value={comment}
                maxLength={500}
                onChange={(event) => setComment(event.target.value)}
                placeholder="How and why this payout was made…"
                className="min-h-24 resize-none rounded-xl border-border bg-background"
              />
              <p className="text-xs text-muted-foreground">Required for the audit log. Visible to admins only.</p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  disabled={!canSubmit}
                  className="h-11 w-full rounded-xl bg-accent font-bold text-accent-foreground hover:bg-accent/90"
                >
                  {recording ? <Loader2 className="animate-spin" /> : <BadgeDollarSign />}
                  {recording ? "Recording…" : "Review payout"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-border bg-surface">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">Record this payout?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    {amountCents
                      ? `${formatMoney(amountCents)} will be added to this partner's immutable payout history. This action cannot be edited from the dashboard.`
                      : "Review the payout details before continuing."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="rounded-xl border border-border bg-background p-4 text-sm">
                  <p className="font-medium text-foreground">{comment.trim()}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Reference: {reference.trim() || "Generated automatically"}
                  </p>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-border bg-background text-foreground hover:bg-surface-hover">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={recording}
                    onClick={handleRecordPayout}
                    className="bg-accent font-bold text-accent-foreground hover:bg-accent/90"
                  >
                    Confirm payout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between gap-4 border-b border-border p-5 sm:p-6">
          <div>
            <h3 className="font-bold text-foreground">Payout history</h3>
            <p className="mt-1 text-sm text-muted-foreground">Timestamped financial log for this partner.</p>
          </div>
          <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
            {data.payouts.length} entries
          </span>
        </div>

        {data.payouts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ReceiptText className="mx-auto h-8 w-8 text-muted-foreground/45" aria-hidden="true" />
            <p className="mt-3 font-medium text-foreground">No payouts recorded</p>
            <p className="mt-1 text-sm text-muted-foreground">The first confirmed payout will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-border bg-background/35 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3">Paid</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Comment</th>
                  <th className="px-6 py-3">Reference</th>
                  <th className="px-6 py-3">Recorded by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.payouts.map((payout) => (
                  <tr key={payout.id} className="transition-colors hover:bg-surface-hover/60">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {formatDateTime(payout.paid_at || payout.created)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-emerald-400">
                      {formatMoney(payout.amount_cents, payout.currency)}
                    </td>
                    <td className="max-w-xs px-6 py-4 text-sm text-foreground">
                      <span className="line-clamp-2" title={payout.note}>{payout.note || "—"}</span>
                    </td>
                    <td className="max-w-48 px-6 py-4 font-mono text-xs text-muted-foreground">
                      <span className="block truncate" title={payout.reference}>{payout.reference || "—"}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {payout.created_by_email || "Legacy entry"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between gap-4 border-b border-border p-5 sm:p-6">
          <div>
            <h3 className="font-bold text-foreground">Recent referrals</h3>
            <p className="mt-1 text-sm text-muted-foreground">Latest accounts attributed to this partner.</p>
          </div>
          <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
            {data.stats.total_activated} total
          </span>
        </div>

        {data.recent_referrals.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No attributed users yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead>
                <tr className="border-b border-border bg-background/35 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3">Account</th>
                  <th className="px-6 py-3">Plan</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Attributed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recent_referrals.map((referral) => (
                  <tr key={referral.id} className="transition-colors hover:bg-surface-hover/60">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-foreground">
                        {referral.name || referral.username || "Unnamed account"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{referral.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium capitalize text-foreground">{referral.plan}</td>
                    <td className="px-6 py-4 text-sm capitalize text-muted-foreground">{referral.source}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        {referral.status || "active"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {formatDateTime(referral.created)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-background p-2 text-muted-foreground">
            <TicketPercent className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-bold text-foreground">Promocodes</h3>
            <p className="text-xs text-muted-foreground">Terms currently attached to this account</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.codes.map((code) => (
            <div key={code.id} className="rounded-xl border border-border bg-background/45 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-bold text-foreground">{code.code}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{code.name || "No internal description"}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  code.active ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                }`}>
                  {code.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span><strong className="text-foreground">{(code.commission_rate_bps / 100).toFixed(2)}%</strong> commission</span>
                <span><strong className="text-foreground">{code.current_uses}</strong>{code.max_uses > 0 ? ` / ${code.max_uses}` : ""} uses</span>
                <span>
                  {code.reward_enabled
                    ? `${code.reward_plan || "Plan"} · ${code.reward_days} days`
                    : "No signup reward"}
                </span>
              </div>
            </div>
          ))}
          {data.codes.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No promocodes are currently attached to this partner.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
