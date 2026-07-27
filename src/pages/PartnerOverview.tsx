import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BadgeDollarSign,
  Check,
  Copy,
  Gift,
  Link2,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { useSeo } from "@/hooks/useSeo";

type PartnerCode = {
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
};

type RecentReferral = {
  id: string;
  plan: "creator" | "pro" | "agency";
  source: "promocode" | "referral_link";
  status: string;
  created: string;
};

type PartnerOverviewData = {
  eligible: boolean;
  referral_code: string;
  referral_url: string;
  default_commission_rate_bps: number;
  stats: {
    total_activated: number;
    creator: number;
    pro: number;
    agency: number;
    pending_cents: number;
    available_cents: number;
    paid_cents: number;
    commission_payments: number;
    renewal_payments: number;
    currency: string;
  };
  codes: PartnerCode[];
  recent_referrals: RecentReferral[];
};

const planStyles: Record<string, string> = {
  creator: "border-border bg-surface text-muted-foreground",
  pro: "border-blue-400/20 bg-blue-400/10 text-blue-300",
  agency: "border-violet-400/20 bg-violet-400/10 text-violet-300",
};

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatRate(bps: number) {
  const percent = bps / 100;
  return `${Number.isInteger(percent) ? percent.toFixed(0) : percent.toFixed(2)}%`;
}

export default function PartnerOverview() {
  const [copied, setCopied] = useState("");

  useSeo({
    title: "Partner Overview | Linktery",
    description: "Track your Linktery referrals, commissions, and partner offers.",
    noIndex: true,
  });

  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<PartnerOverviewData>({
    queryKey: ["affiliate-overview", pb.authStore.model?.id || "anonymous"],
    queryFn: async () => {
      try {
        return await pb.send("/api/affiliate/overview", {
          method: "GET",
          requestKey: "affiliate-overview",
        }) as PartnerOverviewData;
      } catch (requestError) {
        console.error("Partner overview fetch failed:", requestError);
        throw requestError;
      }
    },
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });

  const retryOverview = async () => {
    const result = await refetch();
    if (result.error) {
      toast.error("Partner analytics are temporarily unavailable.");
    }
  };

  const planMix = useMemo(() => {
    const stats = data?.stats;
    if (!stats || stats.total_activated === 0) return [];
    return [
      { label: "Creator", value: stats.creator, color: "bg-slate-400" },
      { label: "Pro", value: stats.pro, color: "bg-blue-400" },
      { label: "Agency", value: stats.agency, color: "bg-violet-400" },
    ].map((item) => ({
      ...item,
      percentage: (item.value / stats.total_activated) * 100,
    }));
  }, [data]);

  const copyValue = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      toast.error("Couldn't copy this value.");
    }
  };

  if (isLoading && !data) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          Loading partner workspace…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">Partner analytics are unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try loading the workspace again in a moment.</p>
        <button
          onClick={retryOverview}
          disabled={isFetching}
          className="btn-primary-glow mt-6 inline-flex items-center gap-2 px-5 py-2.5 disabled:cursor-wait disabled:opacity-70"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Try again
        </button>
      </div>
    );
  }

  const activeCodes = data.codes.filter((code) => code.active);
  const stats = data.stats;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-10 pt-3 sm:space-y-6 sm:pt-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Linktery Partner Network
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Partner Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Initial and renewal commissions from your referrals in one place.
          </p>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
          data.eligible
            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
            : "border-border bg-surface text-muted-foreground"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${data.eligible ? "bg-emerald-300" : "bg-muted-foreground"}`} />
          {data.eligible ? "Partner account active" : "No active offers"}
        </span>
      </header>

      <section className="relative overflow-hidden rounded-[24px] border border-accent/20 bg-[#08130e] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-end">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/60">Available balance</p>
            <div className="mt-2 flex items-end gap-3">
              <strong className="text-4xl font-bold tracking-[-0.05em] text-white sm:text-5xl">
                {formatMoney(stats.available_cents, stats.currency)}
              </strong>
              <span className="mb-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/55">
                ready
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-6 text-emerald-50/55">
              Commissions unlock after the refund-protection hold. {formatMoney(stats.pending_cents, stats.currency)} is earned and not yet paid.
            </p>
            <p className="mt-1.5 text-xs text-emerald-50/40">
              {stats.commission_payments.toLocaleString()} commission payment{stats.commission_payments === 1 ? "" : "s"}
              {" · "}
              {stats.renewal_payments.toLocaleString()} from renewals
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3.5 backdrop-blur-sm sm:p-4">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">Your referral link</p>
                <p className="mt-1 truncate font-mono text-sm font-semibold text-white">{data.referral_url}</p>
              </div>
              <button
                type="button"
                onClick={() => copyValue(data.referral_url, "referral")}
                aria-label="Copy referral link"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {copied === "referral" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
              <span className="text-white/45">Recurring commission rate</span>
              <span className="font-mono font-bold text-emerald-300">{formatRate(data.default_commission_rate_bps)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Activated", value: stats.total_activated.toLocaleString(), icon: Users, tone: "text-accent bg-accent/10 border-accent/20" },
          { label: "Pro referrals", value: stats.pro.toLocaleString(), icon: ArrowUpRight, tone: "text-blue-300 bg-blue-400/10 border-blue-400/20" },
          { label: "Agency referrals", value: stats.agency.toLocaleString(), icon: BadgeDollarSign, tone: "text-violet-300 bg-violet-400/10 border-violet-400/20" },
          { label: "Already paid", value: formatMoney(stats.paid_cents, stats.currency), icon: WalletCards, tone: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
        ].map((item) => (
          <article key={item.label} className="glass-card min-w-0 p-4 sm:p-5">
            <div className={`mb-4 grid h-9 w-9 place-items-center rounded-xl border ${item.tone}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <p className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">{item.value}</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">{item.label}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold text-foreground">Affiliate offers</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{activeCodes.length} active of {data.codes.length}</p>
            </div>
            <Gift className="h-5 w-5 text-accent" />
          </div>
          <div className="divide-y divide-border/50">
            {data.codes.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                No promocodes are attached to this account yet.
              </div>
            ) : data.codes.map((code) => (
              <article key={code.id} className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyValue(code.code, code.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-accent/15 bg-accent/5 px-2.5 py-1.5 font-mono text-sm font-bold tracking-[0.12em] text-foreground hover:border-accent/35"
                    >
                      {code.code}
                      {copied === code.id ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      code.active
                        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                        : "border-border bg-surface text-muted-foreground"
                    }`}>
                      {code.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm text-muted-foreground">
                    {code.name || "Affiliate campaign"}
                    <span className="mx-2 text-border">•</span>
                    {code.reward_enabled ? `${code.reward_days}d ${code.reward_plan} reward` : "No signup reward"}
                  </p>
                </div>
                <div className="flex items-center gap-5 sm:justify-end">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Uses</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                      {code.current_uses}/{code.max_uses || "∞"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Commission</p>
                    <p className="mt-1 font-mono text-sm font-bold text-accent">{formatRate(code.commission_rate_bps)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="glass-card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Referral plan mix</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Current plans of activated accounts</p>
            </div>
            <span className="font-mono text-sm font-bold text-foreground">{stats.total_activated}</span>
          </div>
          {planMix.length > 0 ? (
            <>
              <div className="mt-7 flex h-2.5 overflow-hidden rounded-full bg-surface">
                {planMix.map((item) => (
                  <div
                    key={item.label}
                    className={`${item.color} first:rounded-l-full last:rounded-r-full`}
                    style={{ width: `${item.percentage}%` }}
                    title={`${item.label}: ${item.value}`}
                  />
                ))}
              </div>
              <div className="mt-6 space-y-3">
                {planMix.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className={`h-2 w-2 rounded-full ${item.color}`} />
                      {item.label}
                    </span>
                    <span className="font-mono font-semibold text-foreground">
                      {item.value} <span className="text-xs text-muted-foreground">({Math.round(item.percentage)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
              Plan distribution will appear after your first activation.
            </div>
          )}
        </div>
      </section>

      <section className="glass-card overflow-hidden">
        <div className="border-b border-border/60 px-5 py-4 sm:px-6">
          <h2 className="font-semibold text-foreground">Recent activations</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Latest accounts attributed to your offers</p>
        </div>
        {data.recent_referrals.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            Your first attributed signup will appear here.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {data.recent_referrals.map((referral) => (
              <div key={referral.id} className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface text-xs font-bold text-foreground">
                    #
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold text-foreground">
                      Referral {referral.id.slice(-6).toUpperCase()}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {referral.source === "promocode" ? "Promocode" : "Referral link"}
                      <span className="mx-1.5 text-border">•</span>
                      {new Date(referral.created).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${planStyles[referral.plan] || planStyles.creator}`}>
                  {referral.plan}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
