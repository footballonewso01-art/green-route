import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowUpRight,
  BadgePercent,
  CheckCircle2,
  ChevronLeft,
  Copy,
  CreditCard,
  DollarSign,
  Gift,
  Infinity as InfinityIcon,
  Loader2,
  Receipt,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import { format, isValid } from "date-fns";
import { toast } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getPromocodeCommissionRate,
  getPromocodeRemainingUses,
  getPromocodeRewardLabel,
  getPromocodeState,
  type PromocodeOperationalState,
  type PromocodeRecord,
} from "@/lib/adminPromocodes";
import { pb } from "@/lib/pocketbase";

type UserData = {
  id: string;
  username: string;
  email: string;
  plan: string;
  created: string;
  avatar: string;
  collectionId: string;
};

type PromocodeLog = {
  id: string;
  plan_awarded: string;
  days_awarded: number;
  created: string;
  user: UserData;
};

type PaymentRecord = {
  id: string;
  user: Pick<UserData, "id" | "username" | "email" | "avatar">;
  plan: string;
  amount: number;
  status: string;
  payment_method: string;
  is_first: boolean;
  created: string;
};

type PaymentsData = {
  totalSpend: number;
  totalPayments: number;
  payments: PaymentRecord[];
};

const safeFormat = (value: string, pattern: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return isValid(date) ? format(date, pattern) : "—";
};

const statusStyles: Record<PromocodeOperationalState, string> = {
  active: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  depleted: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  archived: "border-border bg-background/50 text-muted-foreground",
};

function StatusBadge({ state }: { state: PromocodeOperationalState }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${statusStyles[state]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {state}
    </span>
  );
}

function UserIdentity({
  user,
  secondary,
}: {
  user: Pick<UserData, "id" | "username" | "email" | "avatar">;
  secondary?: string;
}) {
  const avatarUrl = user.avatar
    ? `${pb.baseUrl}/api/files/users/${user.id}/${encodeURIComponent(user.avatar)}`
    : "";
  const initial = (user.username || user.email || "U").charAt(0).toUpperCase();

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background/55 text-xs font-bold text-muted-foreground">
          {initial}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {user.username ? `@${user.username}` : "Unnamed account"}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{secondary || user.email}</p>
      </div>
    </div>
  );
}

function MetricCell({
  label,
  value,
  detail,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Users;
  accent?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-3.5 sm:px-5">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
          accent
            ? "border-accent/20 bg-accent/10 text-accent"
            : "border-border bg-background/45 text-muted-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className={`font-mono text-xl font-semibold tabular-nums ${accent ? "text-accent" : "text-foreground"}`}>
            {value}
          </span>
          <span className="hidden truncate text-[11px] text-muted-foreground xl:inline">{detail}</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminPromocodeStats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [promo, setPromo] = useState<PromocodeRecord | null>(null);
  const [logs, setLogs] = useState<PromocodeLog[]>([]);
  const [paymentsData, setPaymentsData] = useState<PaymentsData>({
    totalSpend: 0,
    totalPayments: 0,
    payments: [],
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const [promoResult, logsResult, paymentsResult] = await Promise.allSettled([
        pb.collection("promocodes").getOne(id, {
          expand: "partner_id",
          requestKey: null,
        }),
        pb.send(`/api/admin/promocodes/${id}/stats`, {
          method: "GET",
          requestKey: null,
        }) as Promise<PromocodeLog[]>,
        pb.send(`/api/admin/promocodes/${id}/payments`, {
          method: "GET",
          requestKey: null,
        }) as Promise<PaymentsData>,
      ]);

      if (cancelled) return;

      if (promoResult.status === "rejected") {
        console.error("Failed to load promocode:", promoResult.reason);
        toast.error("This promocode could not be loaded.");
        setPromo(null);
        setLoading(false);
        return;
      }

      setPromo(promoResult.value as unknown as PromocodeRecord);

      if (logsResult.status === "fulfilled") {
        setLogs(logsResult.value);
      } else {
        console.error("Failed to load promocode redemptions:", logsResult.reason);
      }

      if (paymentsResult.status === "fulfilled") {
        setPaymentsData(paymentsResult.value);
      } else {
        console.error("Failed to load promocode payments:", paymentsResult.reason);
      }

      if (logsResult.status === "rejected" || paymentsResult.status === "rejected") {
        toast.error("Some campaign activity could not be loaded. Refresh to try again.");
      }
      setLoading(false);
    };

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const renewalCount = useMemo(
    () => paymentsData.payments.filter((payment) => !payment.is_first).length,
    [paymentsData.payments],
  );

  const copyCode = async () => {
    if (!promo) return;
    try {
      await navigator.clipboard.writeText(promo.code);
      setCopied(true);
      toast.success("Promocode copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("The code could not be copied. Select it manually.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 font-geist">
        <Loader2 className="h-7 w-7 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground">Loading campaign activity…</p>
      </div>
    );
  }

  if (!promo) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center px-5 text-center font-geist">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground">
          <Ticket className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-foreground">Promocode not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been removed or your session may no longer have admin access.
        </p>
        <button
          type="button"
          onClick={() => navigate("/admin/promocodes")}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-accent-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to promocodes
        </button>
      </div>
    );
  }

  const state = getPromocodeState(promo);
  const partner = promo.expand?.partner_id;
  const remaining = getPromocodeRemainingUses(promo);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 pb-10 pt-4 font-geist sm:space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/promocodes")}
            className="-ml-2 mt-0.5 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Back to promocodes"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => void copyCode()}
                className="group flex min-w-0 items-center gap-2 rounded-lg font-mono text-2xl font-bold tracking-[0.08em] text-foreground outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-accent sm:text-3xl"
              >
                <span className="truncate">{promo.code}</span>
                {copied ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4 shrink-0 text-muted-foreground opacity-70 transition-opacity group-hover:opacity-100" />
                )}
              </button>
              <StatusBadge state={state} />
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {promo.internal_name || "No internal campaign name"} · Created{" "}
              {safeFormat(promo.created, "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <Link
            to="/admin/promocodes"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-accent/30 hover:text-foreground"
          >
            All campaigns
          </Link>
          {partner?.id && (
            <Link
              to={`/admin/users/${partner.id}`}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-3.5 text-sm font-bold text-accent-foreground"
            >
              Partner account
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </header>

      <section
        aria-label="Campaign performance"
        className="grid overflow-hidden rounded-2xl border border-border bg-surface/70 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border"
      >
        <MetricCell
          label="Redemptions"
          value={`${promo.current_uses.toLocaleString()}${
            promo.max_uses === 0 ? "" : ` / ${promo.max_uses.toLocaleString()}`
          }`}
          detail={
            promo.max_uses === 0
              ? "unlimited campaign"
              : `${remaining?.toLocaleString()} remaining`
          }
          icon={Users}
          accent
        />
        <MetricCell
          label="Referred revenue"
          value={`$${paymentsData.totalSpend.toFixed(2)}`}
          detail="gross paid billing"
          icon={DollarSign}
        />
        <MetricCell
          label="Paid events"
          value={paymentsData.totalPayments.toLocaleString()}
          detail={`${renewalCount} renewals`}
          icon={CreditCard}
        />
        <MetricCell
          label="Commission"
          value={`${getPromocodeCommissionRate(promo)}%`}
          detail="initial + renewals"
          icon={BadgePercent}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface/60">
        <div className="border-b border-border bg-background/25 px-4 py-3">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-bold text-foreground">Offer configuration</h2>
          </div>
        </div>
        <dl className="grid sm:grid-cols-2 xl:grid-cols-5">
          <div className="border-b border-border px-4 py-3 sm:border-r xl:border-b-0">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Partner
            </dt>
            <dd className="mt-1 truncate text-sm font-semibold text-foreground">
              {partner?.username ? `@${partner.username}` : "Legacy / unassigned"}
            </dd>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {partner?.email || promo.partner_id || "No account attached"}
            </p>
          </div>
          <div className="border-b border-border px-4 py-3 xl:border-b-0 xl:border-r">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Recurring commission
            </dt>
            <dd className="mt-1 font-mono text-sm font-semibold text-accent">
              {getPromocodeCommissionRate(promo)}% per paid invoice
            </dd>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Initial payment and renewals</p>
          </div>
          <div className="border-b border-border px-4 py-3 sm:border-r xl:border-b-0">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Signup reward
            </dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">
              {getPromocodeRewardLabel(promo)}
            </dd>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Granted once on activation
            </p>
          </div>
          <div className="border-b border-border px-4 py-3 xl:border-b-0 xl:border-r">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Usage cap
            </dt>
            <dd className="mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold text-foreground">
              {promo.max_uses === 0 ? (
                <>
                  <InfinityIcon className="h-4 w-4 text-muted-foreground" />
                  Unlimited
                </>
              ) : (
                promo.max_uses.toLocaleString()
              )}
            </dd>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {remaining === null ? "No redemption ceiling" : `${remaining.toLocaleString()} remaining`}
            </p>
          </div>
          <div className="px-4 py-3 sm:col-span-2 xl:col-span-1">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Record
            </dt>
            <dd className="mt-1 font-mono text-[11px] font-medium text-foreground">
              {promo.id}
            </dd>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Updated {safeFormat(promo.updated || promo.created, "MMM d, yyyy · HH:mm")}
            </p>
          </div>
        </dl>
      </section>

      <Tabs defaultValue="redemptions" className="overflow-hidden rounded-2xl border border-border bg-surface/60">
        <div className="flex flex-col gap-3 border-b border-border bg-background/20 p-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-9 w-full justify-start rounded-xl border border-border bg-background/45 p-1 sm:w-auto">
            <TabsTrigger
              value="redemptions"
              className="h-7 rounded-lg px-3 text-xs data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Redemptions
              <span className="ml-1.5 opacity-65">{logs.length}</span>
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="h-7 rounded-lg px-3 text-xs data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
            >
              <Receipt className="mr-1.5 h-3.5 w-3.5" />
              Paid events
              <span className="ml-1.5 opacity-65">{paymentsData.totalPayments}</span>
            </TabsTrigger>
          </TabsList>
          <p className="px-1 text-[11px] text-muted-foreground">
            Redemptions prove activation; paid events show gross referred billing.
          </p>
        </div>

        <TabsContent value="redemptions" className="m-0">
          {logs.length === 0 ? (
            <EmptyActivity
              icon={Users}
              title="No redemptions yet"
              description="Users who activate this code will appear here with the reward they received."
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[780px] table-fixed text-left text-sm">
                  <thead className="border-b border-border bg-background/30 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    <tr>
                      <th className="w-[30%] px-4 py-3">Account</th>
                      <th className="w-[18%] px-4 py-3">Current plan</th>
                      <th className="w-[22%] px-4 py-3">Benefit granted</th>
                      <th className="w-[20%] px-4 py-3">Activated</th>
                      <th className="w-[10%] px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {logs.map((log) => (
                      <tr key={log.id} className="transition-colors hover:bg-background/30">
                        <td className="px-4 py-3">
                          <UserIdentity user={log.user} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md border border-border bg-background/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
                            {log.user.plan || "Creator"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold uppercase text-foreground">
                            {log.plan_awarded || "No reward"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {log.days_awarded > 0 ? `${log.days_awarded} days` : "Attribution only"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-foreground">
                            {safeFormat(log.created, "MMM d, yyyy")}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {safeFormat(log.created, "HH:mm")}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/admin/users/${log.user.id}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background/35 px-2.5 text-xs font-semibold text-foreground transition-colors hover:border-accent/30 hover:text-accent"
                          >
                            User
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-border md:hidden">
                {logs.map((log) => (
                  <article key={log.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <UserIdentity user={log.user} />
                      <span className="rounded-md border border-border bg-background/40 px-2 py-1 text-[10px] font-bold uppercase text-foreground">
                        {log.user.plan || "Creator"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Benefit granted
                        </p>
                        <p className="mt-1 text-xs font-semibold uppercase text-foreground">
                          {log.plan_awarded || "No reward"}{" "}
                          {log.days_awarded > 0 ? `· ${log.days_awarded}d` : ""}
                        </p>
                      </div>
                      <Link
                        to={`/admin/users/${log.user.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-2.5 text-xs font-bold text-accent-foreground"
                      >
                        User
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="payments" className="m-0">
          {paymentsData.payments.length === 0 ? (
            <EmptyActivity
              icon={Receipt}
              title="No paid events yet"
              description="Initial subscription payments and renewals from referred accounts will appear here."
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] table-fixed text-left text-sm">
                  <thead className="border-b border-border bg-background/30 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    <tr>
                      <th className="w-[27%] px-4 py-3">Account</th>
                      <th className="w-[13%] px-4 py-3">Plan</th>
                      <th className="w-[13%] px-4 py-3">Amount</th>
                      <th className="w-[13%] px-4 py-3">Payment</th>
                      <th className="w-[15%] px-4 py-3">Method</th>
                      <th className="w-[19%] px-4 py-3">Processed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {paymentsData.payments.map((payment) => (
                      <tr key={payment.id} className="transition-colors hover:bg-background/30">
                        <td className="px-4 py-3">
                          <UserIdentity user={payment.user} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold uppercase text-foreground">
                            {payment.plan || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-semibold tabular-nums text-emerald-400">
                            ${payment.amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                              payment.is_first
                                ? "border-blue-500/25 bg-blue-500/10 text-blue-300"
                                : "border-amber-500/25 bg-amber-500/10 text-amber-300"
                            }`}
                          >
                            {payment.is_first ? "Initial" : "Renewal"}
                          </span>
                          <p className="mt-1 text-[10px] capitalize text-muted-foreground">
                            {payment.status || "unknown"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">
                            {payment.payment_method || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-foreground">
                            {safeFormat(payment.created, "MMM d, yyyy")}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {safeFormat(payment.created, "HH:mm")}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-border md:hidden">
                {paymentsData.payments.map((payment) => (
                  <article key={payment.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <UserIdentity user={payment.user} />
                      <span className="font-mono text-sm font-semibold text-emerald-400">
                        ${payment.amount.toFixed(2)}
                      </span>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3">
                      <div>
                        <dt className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          Type
                        </dt>
                        <dd className="mt-1 text-xs font-semibold text-foreground">
                          {payment.is_first ? "Initial" : "Renewal"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          Plan
                        </dt>
                        <dd className="mt-1 text-xs font-semibold uppercase text-foreground">
                          {payment.plan || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          Processed
                        </dt>
                        <dd className="mt-1 text-xs font-semibold text-foreground">
                          {safeFormat(payment.created, "MMM d")}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyActivity({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-5 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background/40 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
