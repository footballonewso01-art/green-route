import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowUpRight,
  BadgePercent,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Copy,
  Gift,
  Infinity as InfinityIcon,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import { format, isValid } from "date-fns";
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getPromocodeCommissionRate,
  getPromocodeRemainingUses,
  getPromocodeRewardLabel,
  getPromocodeState,
  type PromocodeOperationalState,
  type PromocodeRecord,
} from "@/lib/adminPromocodes";
import { pb } from "@/lib/pocketbase";
import { maskError } from "@/lib/utils";

type StatusFilter = "all" | PromocodeOperationalState;
type SortMode = "newest" | "most-used" | "highest-rate" | "code";

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

function MetricCell({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Ticket;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-3.5 sm:px-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background/45 text-accent">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="font-mono text-xl font-semibold tabular-nums text-foreground">{value}</span>
          <span className="hidden truncate text-[11px] text-muted-foreground xl:inline">{detail}</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminPromocodes() {
  const navigate = useNavigate();
  const [promocodes, setPromocodes] = useState<PromocodeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newInternalName, setNewInternalName] = useState("");
  const [newPartnerIdentifier, setNewPartnerIdentifier] = useState("");
  const [newMaxUses, setNewMaxUses] = useState<number | "">("");
  const [newRewardPlan, setNewRewardPlan] = useState<"none" | "pro" | "agency">("pro");
  const [newRewardDays, setNewRewardDays] = useState<number | "">(30);
  const [newCommissionRate, setNewCommissionRate] = useState<number | "">(20);
  const [formError, setFormError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<PromocodeRecord | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchPromocodes = useCallback(async (quiet = false) => {
    if (quiet) setIsRefreshing(true);
    try {
      const records = await pb.collection("promocodes").getFullList({
        sort: "-created",
        expand: "partner_id",
        requestKey: null,
      });
      setPromocodes(records as unknown as PromocodeRecord[]);
    } catch (err: unknown) {
      if ((err as { isAbort?: boolean })?.isAbort) return;
      console.error("fetchPromocodes error:", err);
      toast.error("Promocodes could not be loaded. Try refreshing the page.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchPromocodes();
  }, [fetchPromocodes]);

  const resetCreateForm = () => {
    setNewCode("");
    setNewInternalName("");
    setNewPartnerIdentifier("");
    setNewMaxUses("");
    setNewRewardPlan("pro");
    setNewRewardDays(30);
    setNewCommissionRate(20);
    setFormError("");
  };

  const handleCreateModalChange = (open: boolean) => {
    setIsCreateModalOpen(open);
    if (!open && !isCreating) resetCreateForm();
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");

    const commissionRate = Number(newCommissionRate);
    const maxUses = newMaxUses === "" ? 0 : Number(newMaxUses);
    const rewardDays = newRewardDays === "" ? 0 : Number(newRewardDays);

    if (!newCode.trim() || !newPartnerIdentifier.trim()) {
      setFormError("Add a code and the partner account that owns it.");
      return;
    }
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      setFormError("Recurring commission must be between 0% and 100%.");
      return;
    }
    if (!Number.isInteger(maxUses) || maxUses < 0 || maxUses > 1_000_000) {
      setFormError("Redemption limit must be 0–1,000,000.");
      return;
    }
    if (
      newRewardPlan !== "none" &&
      (!Number.isInteger(rewardDays) || rewardDays < 1 || rewardDays > 1095)
    ) {
      setFormError("Reward duration must be between 1 and 1095 days.");
      return;
    }

    setIsCreating(true);
    try {
      await pb.send("/api/admin/promocodes", {
        method: "POST",
        body: {
          code: newCode.trim().toUpperCase(),
          internal_name: newInternalName.trim(),
          partner_identifier: newPartnerIdentifier.trim(),
          max_uses: maxUses,
          reward_enabled: newRewardPlan !== "none",
          reward_plan: newRewardPlan === "none" ? "" : newRewardPlan,
          reward_days: newRewardPlan === "none" ? 0 : rewardDays,
          commission_rate_bps: Math.round(commissionRate * 100),
        },
        requestKey: null,
      });
      toast.success("Affiliate offer created");
      setIsCreateModalOpen(false);
      resetCreateForm();
      await fetchPromocodes(true);
    } catch (err: unknown) {
      setFormError(maskError(err, "The offer could not be created. Check the values and try again."));
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    const nextIsActive = !statusTarget.is_active;
    setIsUpdatingStatus(true);
    try {
      await pb.collection("promocodes").update(statusTarget.id, { is_active: nextIsActive });
      setPromocodes((current) =>
        current.map((promo) =>
          promo.id === statusTarget.id ? { ...promo, is_active: nextIsActive } : promo,
        ),
      );
      toast.success(nextIsActive ? "Promocode reactivated" : "Promocode archived");
      setStatusTarget(null);
    } catch (err) {
      console.error("Promocode status update failed:", err);
      toast.error("Promocode status could not be changed. Try again.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const copyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      toast.success("Promocode copied");
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("The code could not be copied. Select it manually.");
    }
  };

  const filteredPromocodes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const result = promocodes.filter((promo) => {
      const partner = promo.expand?.partner_id;
      const haystack = [
        promo.code,
        promo.internal_name,
        partner?.email,
        partner?.username,
        promo.partner_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const state = getPromocodeState(promo);
      const matchesStatus = statusFilter === "all" || state === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return result.sort((a, b) => {
      if (sortMode === "most-used") return b.current_uses - a.current_uses;
      if (sortMode === "highest-rate") {
        return (b.commission_rate_bps || 0) - (a.commission_rate_bps || 0);
      }
      if (sortMode === "code") return a.code.localeCompare(b.code);
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });
  }, [promocodes, searchQuery, sortMode, statusFilter]);

  const stats = useMemo(() => {
    const active = promocodes.filter((promo) => getPromocodeState(promo) === "active").length;
    const depleted = promocodes.filter((promo) => getPromocodeState(promo) === "depleted").length;
    const totalUses = promocodes.reduce((sum, promo) => sum + promo.current_uses, 0);
    const averageRate = promocodes.length
      ? promocodes.reduce((sum, promo) => sum + getPromocodeCommissionRate(promo), 0) /
        promocodes.length
      : 0;
    const rewardOffers = promocodes.filter(
      (promo) => promo.reward_enabled !== false && promo.reward_days > 0,
    ).length;
    return { active, depleted, totalUses, averageRate, rewardOffers };
  }, [promocodes]);

  const statusCounts = useMemo(
    () => ({
      all: promocodes.length,
      active: stats.active,
      depleted: stats.depleted,
      archived: promocodes.filter((promo) => getPromocodeState(promo) === "archived").length,
    }),
    [promocodes, stats.active, stats.depleted],
  );

  const rewardSummary =
    newRewardPlan === "none"
      ? "No signup reward"
      : `${String(newRewardPlan).toUpperCase()} for ${newRewardDays || 0} ${
          Number(newRewardDays) === 1 ? "day" : "days"
        }`;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 pb-10 pt-4 font-geist sm:space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="-ml-2 mt-0.5 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Promocodes
              </h1>
              <span className="rounded-md border border-accent/20 bg-accent/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
                Affiliate ops
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Manage attribution contracts, signup rewards, limits, and recurring commissions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchPromocodes(true)}
            disabled={isRefreshing}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-accent/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary-glow inline-flex h-10 items-center gap-2 px-4 py-0 text-sm"
          >
            <Plus className="h-4 w-4" />
            New promocode
          </button>
        </div>
      </header>

      <section
        aria-label="Promocode overview"
        className="grid overflow-hidden rounded-2xl border border-border bg-surface/70 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border"
      >
        <MetricCell
          label="Campaigns"
          value={promocodes.length}
          detail={`${stats.active} available`}
          icon={Ticket}
        />
        <MetricCell
          label="Redemptions"
          value={stats.totalUses.toLocaleString()}
          detail="all-time activations"
          icon={Users}
        />
        <MetricCell
          label="Avg. commission"
          value={`${stats.averageRate.toFixed(stats.averageRate % 1 === 0 ? 0 : 1)}%`}
          detail="paid on renewals"
          icon={BadgePercent}
        />
        <MetricCell
          label="Signup rewards"
          value={stats.rewardOffers}
          detail={`${stats.depleted} depleted`}
          icon={Gift}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface/60">
        <div className="border-b border-border bg-background/20 p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative min-w-0 flex-1 xl:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search code, campaign, partner, email, or ID"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background/55 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent/45 focus:ring-2 focus:ring-accent/10"
              />
            </div>

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <div
                className="grid grid-cols-4 rounded-xl border border-border bg-background/45 p-1"
                aria-label="Filter promocodes by status"
              >
                {(["all", "active", "depleted", "archived"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      statusFilter === status
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {status}
                    <span className="ml-1 hidden opacity-65 min-[440px]:inline">
                      {statusCounts[status]}
                    </span>
                  </button>
                ))}
              </div>
              <div className="relative">
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  aria-label="Sort promocodes"
                  className="h-10 w-full appearance-none rounded-xl border border-border bg-background/45 pl-3 pr-9 text-xs font-semibold text-foreground outline-none transition-colors focus:border-accent/45 focus:ring-2 focus:ring-accent/10 sm:w-auto"
                >
                  <option value="newest">Newest first</option>
                  <option value="most-used">Most redeemed</option>
                  <option value="highest-rate">Highest commission</option>
                  <option value="code">Code A–Z</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>
          <p className="mt-2 px-1 text-[11px] text-muted-foreground">
            Showing {filteredPromocodes.length} of {promocodes.length} campaigns
          </p>
        </div>

        {loading ? (
          <div className="flex h-52 flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Loading affiliate offers…</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-[1040px] w-full table-fixed text-left text-sm">
                <thead className="border-b border-border bg-background/30 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="w-[22%] px-4 py-3">Campaign</th>
                    <th className="w-[21%] px-4 py-3">Partner</th>
                    <th className="w-[20%] px-4 py-3">Commercial terms</th>
                    <th className="w-[16%] px-4 py-3">Redemptions</th>
                    <th className="w-[12%] px-4 py-3">Created</th>
                    <th className="w-[9%] px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filteredPromocodes.map((promo) => {
                    const state = getPromocodeState(promo);
                    const remaining = getPromocodeRemainingUses(promo);
                    const usagePercent =
                      promo.max_uses > 0
                        ? Math.min(100, (promo.current_uses / promo.max_uses) * 100)
                        : 0;
                    const partner = promo.expand?.partner_id;

                    return (
                      <tr key={promo.id} className="group transition-colors hover:bg-background/30">
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span
                              className={`mt-1 h-8 w-0.5 shrink-0 rounded-full ${
                                state === "active"
                                  ? "bg-emerald-400"
                                  : state === "depleted"
                                    ? "bg-amber-400"
                                    : "bg-muted-foreground/35"
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => void copyCode(promo.code, promo.id)}
                                  className="group/copy flex min-w-0 items-center gap-1.5 rounded-md font-mono text-sm font-bold tracking-[0.08em] text-foreground outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
                                  title="Copy promocode"
                                >
                                  <span className="truncate">{promo.code}</span>
                                  {copiedId === promo.id ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/copy:opacity-100 group-focus-visible/copy:opacity-100" />
                                  )}
                                </button>
                                <StatusBadge state={state} />
                              </div>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {promo.internal_name || "No internal campaign name"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {partner?.username ? `@${partner.username}` : "Legacy / unassigned"}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {partner?.email || "No partner email"}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/65">
                              ID {promo.partner_id || "—"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-sm font-semibold tabular-nums text-accent">
                            {getPromocodeCommissionRate(promo)}% recurring
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Gift className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{getPromocodeRewardLabel(promo)}</span>
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-baseline gap-1 font-mono tabular-nums">
                            <span className="text-base font-semibold text-foreground">
                              {promo.current_uses.toLocaleString()}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              / {promo.max_uses === 0 ? "unlimited" : promo.max_uses.toLocaleString()}
                            </span>
                          </div>
                          {promo.max_uses === 0 ? (
                            <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                              <InfinityIcon className="h-3 w-3" /> No cap
                            </p>
                          ) : (
                            <>
                              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-background">
                                <div
                                  className={`h-full rounded-full ${
                                    state === "depleted" ? "bg-amber-400" : "bg-accent"
                                  }`}
                                  style={{ width: `${usagePercent}%` }}
                                />
                              </div>
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {remaining?.toLocaleString()} remaining
                              </p>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-foreground">
                            {safeFormat(promo.created, "MMM d, yyyy")}
                          </p>
                          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                            {safeFormat(promo.created, "HH:mm")}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/admin/promocodes/${promo.id}`}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background/35 px-2.5 text-xs font-semibold text-foreground transition-colors hover:border-accent/30 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            >
                              Open
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setStatusTarget(promo)}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                                promo.is_active
                                  ? "hover:bg-red-500/10 hover:text-red-400"
                                  : "hover:bg-emerald-500/10 hover:text-emerald-400"
                              }`}
                              aria-label={promo.is_active ? `Archive ${promo.code}` : `Reactivate ${promo.code}`}
                              title={promo.is_active ? "Archive" : "Reactivate"}
                            >
                              {promo.is_active ? (
                                <Archive className="h-4 w-4" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border lg:hidden">
              {filteredPromocodes.map((promo) => {
                const state = getPromocodeState(promo);
                const partner = promo.expand?.partner_id;
                const remaining = getPromocodeRemainingUses(promo);
                return (
                  <article key={promo.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => void copyCode(promo.code, promo.id)}
                          className="flex max-w-full items-center gap-2 font-mono text-base font-bold tracking-[0.08em] text-foreground"
                        >
                          <span className="truncate">{promo.code}</span>
                          {copiedId === promo.id ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                        </button>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {promo.internal_name || "No internal campaign name"}
                        </p>
                      </div>
                      <StatusBadge state={state} />
                    </div>

                    <div className="mt-3 rounded-xl border border-border bg-background/30 p-3">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {partner?.username ? `@${partner.username}` : "Legacy / unassigned"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {partner?.email || promo.partner_id || "No partner attached"}
                      </p>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Commission
                        </dt>
                        <dd className="mt-1 font-mono text-sm font-semibold text-accent">
                          {getPromocodeCommissionRate(promo)}% recurring
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Redemptions
                        </dt>
                        <dd className="mt-1 font-mono text-sm font-semibold text-foreground">
                          {promo.current_uses.toLocaleString()} /{" "}
                          {promo.max_uses === 0 ? "unlimited" : promo.max_uses.toLocaleString()}
                        </dd>
                        {remaining !== null && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {remaining.toLocaleString()} remaining
                          </p>
                        )}
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          New-user reward
                        </dt>
                        <dd className="mt-1 text-xs font-medium text-foreground">
                          {getPromocodeRewardLabel(promo)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Created
                        </dt>
                        <dd className="mt-1 text-xs font-medium text-foreground">
                          {safeFormat(promo.created, "MMM d, yyyy")}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <span className="truncate pr-3 font-mono text-[10px] text-muted-foreground">
                        Partner ID · {promo.partner_id || "—"}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setStatusTarget(promo)}
                          className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground transition-colors ${
                            promo.is_active
                              ? "hover:bg-red-500/10 hover:text-red-400"
                              : "hover:bg-emerald-500/10 hover:text-emerald-400"
                          }`}
                        >
                          {promo.is_active ? (
                            <Archive className="h-3.5 w-3.5" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          {promo.is_active ? "Archive" : "Reactivate"}
                        </button>
                        <Link
                          to={`/admin/promocodes/${promo.id}`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-bold text-accent-foreground"
                        >
                          Activity
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {filteredPromocodes.length === 0 && (
              <div className="flex min-h-52 flex-col items-center justify-center px-5 py-10 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background/40 text-muted-foreground">
                  <Ticket className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">No matching campaigns</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  Change the search or status filter, or create a new partner promocode.
                </p>
              </div>
            )}
          </>
        )}
      </section>

      <Dialog open={isCreateModalOpen} onOpenChange={handleCreateModalChange}>
        <DialogContent className="max-h-[94vh] w-[calc(100%-1.5rem)] max-w-3xl gap-0 overflow-y-auto rounded-2xl border-border bg-card p-0 font-geist shadow-2xl">
          <DialogHeader className="border-b border-border px-5 pb-4 pt-5 text-left sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
                  Affiliate contract
                </p>
                <DialogTitle className="mt-0.5 text-xl">Create promocode</DialogTitle>
              </div>
            </div>
            <DialogDescription className="pt-1.5 text-xs leading-relaxed">
              Bind one code to a partner, then define the recurring commission and optional signup reward.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate}>
            <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_250px]">
              <div className="space-y-5">
                <fieldset className="space-y-3">
                  <legend className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Campaign identity
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-foreground">Code</span>
                      <div className="relative">
                        <Ticket className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          required
                          minLength={3}
                          maxLength={32}
                          autoFocus
                          placeholder="CREATOR20"
                          value={newCode}
                          onChange={(event) =>
                            setNewCode(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))
                          }
                          className="h-10 w-full rounded-xl border border-border bg-background/45 pl-9 pr-3 font-mono text-sm font-semibold uppercase tracking-wider text-foreground outline-none transition-colors placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground focus:border-accent/45 focus:ring-2 focus:ring-accent/10"
                        />
                      </div>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-foreground">
                        Internal name{" "}
                        <span className="font-normal text-muted-foreground">· optional</span>
                      </span>
                      <input
                        type="text"
                        maxLength={120}
                        placeholder="July creator campaign"
                        value={newInternalName}
                        onChange={(event) => setNewInternalName(event.target.value)}
                        className="h-10 w-full rounded-xl border border-border bg-background/45 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent/45 focus:ring-2 focus:ring-accent/10"
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="space-y-3 border-t border-border pt-4">
                  <legend className="pr-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Partner ownership
                  </legend>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-foreground">
                      Partner account
                    </span>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        placeholder="User ID or partner@email.com"
                        value={newPartnerIdentifier}
                        onChange={(event) => setNewPartnerIdentifier(event.target.value)}
                        className="h-10 w-full rounded-xl border border-border bg-background/45 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent/45 focus:ring-2 focus:ring-accent/10"
                      />
                    </div>
                    <span className="mt-1.5 block text-[11px] text-muted-foreground">
                      The server resolves the exact account and rejects unknown or ambiguous values.
                    </span>
                  </label>
                </fieldset>

                <fieldset className="space-y-3 border-t border-border pt-4">
                  <legend className="pr-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Commercial terms
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-foreground">
                        Recurring commission
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          required
                          value={newCommissionRate}
                          onChange={(event) =>
                            setNewCommissionRate(event.target.value === "" ? "" : Number(event.target.value))
                          }
                          className="h-10 w-full rounded-xl border border-border bg-background/45 px-3 pr-9 font-mono text-sm font-semibold text-foreground outline-none transition-colors focus:border-accent/45 focus:ring-2 focus:ring-accent/10"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
                          %
                        </span>
                      </div>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-foreground">
                        Redemption limit
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={1_000_000}
                        placeholder="0 = unlimited"
                        value={newMaxUses}
                        onChange={(event) =>
                          setNewMaxUses(event.target.value === "" ? "" : Number(event.target.value))
                        }
                        className="h-10 w-full rounded-xl border border-border bg-background/45 px-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground focus:border-accent/45 focus:ring-2 focus:ring-accent/10"
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-foreground">
                        New-user benefit
                      </span>
                      <div className="relative">
                        <select
                          value={newRewardPlan}
                          onChange={(event) =>
                            setNewRewardPlan(event.target.value as "none" | "pro" | "agency")
                          }
                          className="h-10 w-full appearance-none rounded-xl border border-border bg-background/45 px-3 pr-9 text-sm font-medium text-foreground outline-none transition-colors focus:border-accent/45 focus:ring-2 focus:ring-accent/10"
                        >
                          <option value="none">No reward</option>
                          <option value="pro">Pro plan</option>
                          <option value="agency">Agency plan</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-foreground">
                        Duration in days
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={1095}
                        required={newRewardPlan !== "none"}
                        disabled={newRewardPlan === "none"}
                        value={newRewardPlan === "none" ? "" : newRewardDays}
                        onChange={(event) =>
                          setNewRewardDays(event.target.value === "" ? "" : Number(event.target.value))
                        }
                        placeholder={newRewardPlan === "none" ? "Not applicable" : "30"}
                        className="h-10 w-full rounded-xl border border-border bg-background/45 px-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground focus:border-accent/45 focus:ring-2 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-45"
                      />
                    </label>
                  </div>
                </fieldset>
              </div>

              <aside className="rounded-2xl border border-accent/20 bg-accent/[0.045] p-4 lg:self-start">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
                  Offer summary
                </p>
                <div className="mt-4 border-l border-accent/30 pl-3.5">
                  <p className="break-all font-mono text-lg font-bold tracking-[0.08em] text-foreground">
                    {newCode || "NEWCODE"}
                  </p>
                  <p className="mt-1 break-all text-xs leading-relaxed text-muted-foreground">
                    {newInternalName || "Unnamed internal campaign"}
                  </p>
                </div>
                <dl className="mt-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3">
                    <dt className="text-xs text-muted-foreground">Partner</dt>
                    <dd className="max-w-[145px] break-all text-right text-xs font-semibold text-foreground">
                      {newPartnerIdentifier || "Not assigned"}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3">
                    <dt className="text-xs text-muted-foreground">Commission</dt>
                    <dd className="font-mono text-xs font-bold text-accent">
                      {newCommissionRate || 0}% recurring
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3">
                    <dt className="text-xs text-muted-foreground">Reward</dt>
                    <dd className="max-w-[145px] text-right text-xs font-semibold text-foreground">
                      {rewardSummary}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-xs text-muted-foreground">Limit</dt>
                    <dd className="font-mono text-xs font-semibold text-foreground">
                      {newMaxUses === "" || Number(newMaxUses) === 0
                        ? "Unlimited"
                        : Number(newMaxUses).toLocaleString()}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2 rounded-xl border border-border bg-background/35 p-3">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {"Partner receives "}
                    <strong className="text-foreground">{newCommissionRate || 0}%</strong>
                    {" of every successful subscription payment, including renewals."}
                  </p>
                </div>
              </aside>
            </div>

            {formError && (
              <div
                role="alert"
                className="mx-5 mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-300 sm:mx-6"
              >
                {formError}
              </div>
            )}

            <DialogFooter className="border-t border-border bg-background/20 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => handleCreateModalChange(false)}
                disabled={isCreating}
                className="h-10 rounded-xl px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="btn-primary-glow inline-flex h-10 items-center justify-center gap-2 px-5 py-0 text-sm disabled:pointer-events-none disabled:opacity-60"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create offer
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open && !isUpdatingStatus) setStatusTarget(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl border-border bg-card font-geist">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusTarget?.is_active ? "Archive promocode?" : "Reactivate promocode?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget?.is_active
                ? `${statusTarget.code} will stop accepting new redemptions. Existing affiliate attributions and commissions remain intact.`
                : `${statusTarget?.code || "This code"} will become available for new redemptions again, subject to its usage limit.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isUpdatingStatus}
              className="border-border bg-background text-foreground hover:bg-surface"
            >
              Keep current status
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isUpdatingStatus}
              onClick={(event) => {
                event.preventDefault();
                void handleToggleStatus();
              }}
              className={
                statusTarget?.is_active
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-accent text-accent-foreground hover:bg-accent/90"
              }
            >
              {isUpdatingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {statusTarget?.is_active ? "Archive code" : "Reactivate code"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
