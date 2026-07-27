import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, Search, Users, AlertCircle, Copy, CheckCircle2, Ticket, TrendingUp, Activity, Archive, ChevronLeft, Gift, Zap, RefreshCw, BadgePercent, UserRound } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { format, isValid } from "date-fns";
import { Loader2 } from "lucide-react";
import { maskError } from "@/lib/utils";

const safeFormat = (d: string, fmt: string) => {
  if (!d) return "—";
  const date = new Date(d);
  return isValid(date) ? format(date, fmt) : "—";
};

type Promocode = {
  id: string;
  code: string;
  max_uses: number;
  current_uses: number;
  reward_plan: string;
  reward_days: number;
  reward_enabled?: boolean;
  reward_months?: number;
  partner_id?: string;
  internal_name?: string;
  commission_rate_bps?: number;
  expand?: { partner_id?: { username?: string; email?: string } };
  is_active: boolean;
  created: string;
};

export default function AdminPromocodes() {
  const navigate = useNavigate();
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newInternalName, setNewInternalName] = useState("");
  const [newPartnerIdentifier, setNewPartnerIdentifier] = useState("");
  const [newMaxUses, setNewMaxUses] = useState<number | "">("");
  const [newRewardPlan, setNewRewardPlan] = useState<"none" | "pro" | "agency">("pro");
  const [newRewardMonths, setNewRewardMonths] = useState<number | "">(1);
  const [newCommissionRate, setNewCommissionRate] = useState<number | "">(20);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPromocodes = async () => {
    try {
      const records = await pb.collection("promocodes").getFullList({
        sort: "-created",
        expand: "partner_id",
        requestKey: "admin-promocodes-" + Date.now(),
      });
      setPromocodes(records as unknown as Promocode[]);
    } catch (err: unknown) {
      // Ignore auto-cancelled requests
      if ((err as { isAbort?: boolean })?.isAbort) return;
      console.error("fetchPromocodes error:", err);
      toast.error("Failed to load promocodes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPromocodes(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newPartnerIdentifier.trim() || newCommissionRate === "") return;
    if (newRewardPlan !== "none" && !newRewardMonths) return;
    setIsCreating(true);
    try {
      await pb.send("/api/admin/promocodes", {
        method: "POST",
        body: {
        code: newCode.trim().toUpperCase(),
        internal_name: newInternalName.trim(),
        partner_identifier: newPartnerIdentifier.trim(),
        max_uses: newMaxUses === "" ? 0 : newMaxUses,
        reward_enabled: newRewardPlan !== "none",
        reward_plan: newRewardPlan === "none" ? "" : newRewardPlan,
        reward_months: newRewardPlan === "none" ? 0 : newRewardMonths,
        commission_rate_bps: Math.round(Number(newCommissionRate) * 100),
        },
        requestKey: null,
      });
      toast.success("Affiliate offer created");
      setIsCreateModalOpen(false);
      fetchPromocodes();
      setNewCode("");
      setNewInternalName("");
      setNewPartnerIdentifier("");
      setNewMaxUses("");
      setNewRewardPlan("pro");
      setNewRewardMonths(1);
      setNewCommissionRate(20);
    } catch (err: unknown) {
      toast.error(maskError(err, "Failed to create promocode"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (promo: Promocode) => {
    const action = promo.is_active ? "Archive" : "Reactivate";
    if (!window.confirm(`${action} ${promo.code}?`)) return;
    try {
      await pb.collection("promocodes").update(promo.id, { is_active: !promo.is_active });
      toast.success(`Promocode ${action.toLowerCase()}d`);
      fetchPromocodes();
    } catch (err) {
      toast.error(`Failed to ${action.toLowerCase()} promocode`);
    }
  };



  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = promocodes.filter(p => {
    const haystack = [
      p.code,
      p.internal_name,
      p.expand?.partner_id?.email,
      p.expand?.partner_id?.username,
    ].filter(Boolean).join(" ").toLowerCase();
    const matchesSearch = haystack.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : statusFilter === "active" ? p.is_active : !p.is_active;
    return matchesSearch && matchesStatus;
  });
  const stats = {
    total: promocodes.length,
    active: promocodes.filter(p => p.is_active).length,
    totalUses: promocodes.reduce((a, c) => a + c.current_uses, 0),
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-8 pt-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors group" title="Go back">
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Promocodes</h1>
            <p className="text-muted-foreground text-sm mt-0.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Manage partner attribution, rewards, and first-payment commission
            </p>
          </div>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary-glow flex items-center gap-2 w-fit px-5 py-2.5 shadow-lg shadow-accent/20">
          <Plus className="w-4 h-4" />
          Create Promocode
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Codes", value: stats.total, icon: Ticket, color: "accent" },
          { label: "Active Codes", value: stats.active, icon: Activity, color: "emerald-500" },
          { label: "Total Redemptions", value: stats.totalUses, icon: TrendingUp, color: "blue-500" },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card p-5 sm:p-6 flex items-center gap-4">
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-${kpi.color}/10 flex items-center justify-center border border-${kpi.color}/20 shrink-0`}>
              <kpi.icon className={`w-5 h-5 sm:w-6 sm:h-6 text-${kpi.color}`} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">{kpi.label}</p>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search by code..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border focus:outline-none focus:border-accent/50 text-sm transition-colors" />
        </div>
        <div className="flex bg-surface border border-border rounded-lg p-1 w-full sm:w-auto overflow-hidden">
          {(["all", "active", "archived"] as const).map(status => (
            <button key={status} onClick={() => setStatusFilter(status)}
              className={`flex-1 sm:px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${statusFilter === status ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block glass-card overflow-hidden border border-border/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-surface/80 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Code</th>
                    <th className="px-6 py-4 font-semibold">Partner</th>
                    <th className="px-6 py-4 font-semibold">Offer</th>
                    <th className="px-6 py-4 font-semibold">Redemptions</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Created</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filtered.map((promo) => {
                    const isUnlimited = promo.max_uses === 0;
                    const isDepleted = !isUnlimited && promo.current_uses >= promo.max_uses;
                    return (
                      <tr key={promo.id} className="hover:bg-surface/40 transition-colors group">
                        <td className="px-6 py-4">
                          <button onClick={() => copyCode(promo.code, promo.id)} className="flex items-center gap-2 group/copy">
                            <span className="font-mono font-bold text-foreground tracking-widest bg-accent/5 border border-accent/10 px-3 py-1.5 rounded-lg">{promo.code}</span>
                            <span className="opacity-0 group-hover/copy:opacity-100 transition-opacity">
                              {copiedId === promo.id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                            </span>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-[180px]">
                            <p className="truncate font-medium text-foreground">
                              {promo.expand?.partner_id?.username ? `@${promo.expand.partner_id.username}` : "Legacy code"}
                            </p>
                            <p className="truncate font-mono text-xs text-muted-foreground">{promo.expand?.partner_id?.email || promo.partner_id || "No partner attached"}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="w-fit rounded-md border border-accent/20 bg-accent/10 px-2.5 py-0.5 text-[11px] font-bold text-accent">
                              {(promo.commission_rate_bps || 0) / 100}% first payment
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Gift className="h-3 w-3" />
                              {promo.reward_enabled === false
                                ? "No signup reward"
                                : promo.reward_months
                                  ? `${promo.reward_months}mo ${promo.reward_plan}`
                                  : `${promo.reward_days}d ${promo.reward_plan}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-end gap-1.5">
                            <span className="text-foreground text-base font-medium">{promo.current_uses}</span>
                            <span className="text-muted-foreground text-xs mb-0.5">/ {isUnlimited ? '∞' : promo.max_uses}</span>
                          </div>
                          {!isUnlimited && (
                            <div className="w-20 h-1.5 mt-1.5 bg-surface rounded-full overflow-hidden border border-border/50">
                              <div className={`h-full rounded-full transition-all ${isDepleted ? 'bg-red-500' : 'bg-accent'}`} style={{ width: `${Math.min(100, (promo.current_uses / promo.max_uses) * 100)}%` }} />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${!promo.is_active ? "bg-red-500/10 text-red-400 border-red-500/20" : isDepleted ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                            {!promo.is_active && <Archive className="w-3 h-3" />}
                            {!promo.is_active ? "Archived" : isDepleted ? "Depleted" : "Active"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{safeFormat(promo.created, "MMM d, yyyy")}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link to={`/admin/promocodes/${promo.id}`} className="p-2 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-colors" title="Redemptions"><Users className="w-4 h-4" /></Link>
                            <button onClick={() => handleToggleStatus(promo)} className={`p-2 text-muted-foreground hover:bg-surface rounded-lg transition-colors ${promo.is_active ? 'hover:text-red-400' : 'hover:text-emerald-400'}`} title={promo.is_active ? "Archive" : "Reactivate"}>
                              {promo.is_active ? <Archive className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-16 text-center">
                      <Ticket className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-foreground font-medium">No promocodes found</p>
                      <p className="text-sm text-muted-foreground mt-1">Create a new code to get started.</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((promo) => {
              const isUnlimited = promo.max_uses === 0;
              const isDepleted = !isUnlimited && promo.current_uses >= promo.max_uses;
              return (
                <div key={promo.id} className="glass-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => copyCode(promo.code, promo.id)} className="font-mono font-bold text-foreground tracking-widest bg-accent/5 border border-accent/10 px-3 py-1.5 rounded-lg text-sm">{promo.code}</button>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${!promo.is_active ? "bg-red-500/10 text-red-400 border-red-500/20" : isDepleted ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                      {!promo.is_active ? "Archived" : isDepleted ? "Depleted" : "Active"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                        {(promo.commission_rate_bps || 0) / 100}%
                      </span>
                      <span className="max-w-[160px] truncate text-xs text-muted-foreground">
                        {promo.expand?.partner_id?.email || promo.partner_id || "Legacy code"}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-xs">{promo.current_uses} / {isUnlimited ? '∞' : promo.max_uses} used</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <span className="text-xs text-muted-foreground">{safeFormat(promo.created, "MMM d, yyyy")}</span>
                    <div className="flex gap-1">
                      <Link to={`/admin/promocodes/${promo.id}`} className="p-2 text-muted-foreground hover:text-accent rounded-lg"><Users className="w-4 h-4" /></Link>
                      <button onClick={() => handleToggleStatus(promo)} className={`p-2 text-muted-foreground hover:bg-surface rounded-lg transition-colors ${promo.is_active ? 'hover:text-red-400' : 'hover:text-emerald-400'}`} title={promo.is_active ? "Archive" : "Reactivate"}>
                        {promo.is_active ? <Archive className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Ticket className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="font-medium text-foreground">No promocodes found</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
          <div className="glass-card no-scrollbar relative z-10 max-h-[96vh] w-full max-w-2xl animate-scale-in overflow-y-auto border border-border/50 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-card/95 p-5 backdrop-blur-xl sm:p-6">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Affiliate offer</p>
                <h2 className="flex items-center gap-2 text-lg font-bold text-foreground sm:text-xl"><Gift className="h-5 w-5 text-accent" />New partner promocode</h2>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Code</label>
                <div className="relative">
                  <input type="text" required minLength={3} maxLength={32} placeholder="e.g. CREATOR20" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-foreground font-mono font-medium focus:outline-none input-glow focus:border-accent/50 uppercase tracking-wider" />
                  <Ticket className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">Internal name <span className="font-normal text-muted-foreground">(optional)</span></label>
                  <input type="text" maxLength={120} placeholder="July creator campaign" value={newInternalName} onChange={(e) => setNewInternalName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground focus:border-accent/50 focus:outline-none input-glow" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Partner account</label>
                <div className="relative">
                  <input type="text" required placeholder="User ID or partner@email.com" value={newPartnerIdentifier} onChange={(e) => setNewPartnerIdentifier(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-4 text-foreground focus:border-accent/50 focus:outline-none input-glow" />
                  <UserRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                <p className="mt-1 text-[11px] leading-tight text-muted-foreground">No user picker: the server resolves and validates this ID or email.</p>
              </div>
              <div className="grid gap-4 border-t border-border/50 pt-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Redemption Limit</label>
                <input type="number" inputMode="numeric" min={0} max={1000000} placeholder="0 = unlimited" value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">First-payment commission</label>
                <div className="relative">
                  <input type="number" min={0} max={100} step={0.01} required value={newCommissionRate}
                    onChange={(e) => setNewCommissionRate(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 pr-10 font-mono font-semibold text-foreground focus:border-accent/50 focus:outline-none input-glow" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">%</span>
                </div>
              </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-border/50 pt-4 sm:gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">New-user benefit</label>
                  <select value={newRewardPlan} onChange={(e) => setNewRewardPlan(e.target.value as "none" | "pro" | "agency")}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 appearance-none font-medium">
                    <option value="none">No reward</option>
                    <option value="pro">Pro Plan</option>
                    <option value="agency">Agency Plan</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Duration in months</label>
                  <input type="number" inputMode="numeric" min={1} max={36} required={newRewardPlan !== "none"} disabled={newRewardPlan === "none"} value={newRewardPlan === "none" ? "" : newRewardMonths}
                    onChange={(e) => setNewRewardMonths(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder={newRewardPlan === "none" ? "Not applicable" : "1"}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 font-medium disabled:cursor-not-allowed disabled:opacity-45" />
                </div>
              </div>
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 flex gap-3">
                <AlertCircle className="w-5 h-5 text-accent shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Partner receives <strong className="text-foreground">{newCommissionRate || 0}%</strong> of the first successful payment.
                  {newRewardPlan === "none"
                    ? " The new user receives no subscription bonus."
                    : <> The new user receives <strong className="text-foreground">{newRewardMonths || 0} month(s)</strong> of <strong className="text-foreground uppercase">{newRewardPlan}</strong>.</>}
                </p>
              </div>
              <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center justify-end gap-3 border-t border-border/50 bg-card/95 px-5 pb-5 pt-4 backdrop-blur-xl sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-6">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-surface transition-colors">Cancel</button>
                <button type="submit" disabled={isCreating} className="btn-primary-glow flex items-center gap-2 px-5 py-2.5">
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}Create affiliate offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals removed in favor of dedicated page */}
    </div>
  );
}
