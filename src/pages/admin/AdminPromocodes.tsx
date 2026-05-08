import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, Search, Users, AlertCircle, Copy, CheckCircle2, Ticket, TrendingUp, Activity, Archive, ChevronLeft, Gift, Zap, RefreshCw } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { format, isValid } from "date-fns";
import { Loader2 } from "lucide-react";

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
  is_active: boolean;
  created: string;
};

type PromocodeLog = {
  id: string;
  expand?: { user_id?: { username: string; email: string } };
  plan_awarded: string;
  days_awarded: number;
  created: string;
};

export default function AdminPromocodes() {
  const navigate = useNavigate();
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promocode | null>(null);
  const [newCode, setNewCode] = useState("");
  const [newMaxUses, setNewMaxUses] = useState<number | "">("");
  const [newRewardPlan, setNewRewardPlan] = useState("pro");
  const [newRewardDays, setNewRewardDays] = useState<number | "">(30);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPromocodes = async () => {
    try {
      const records = await pb.collection("promocodes").getFullList({
        sort: "-created",
        requestKey: "admin-promocodes-" + Date.now(),
      });
      setPromocodes(records as unknown as Promocode[]);
    } catch (err: any) {
      // Ignore auto-cancelled requests
      if (err?.isAbort) return;
      console.error("fetchPromocodes error:", err);
      toast.error("Failed to load promocodes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPromocodes(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newRewardDays) return;
    setIsCreating(true);
    try {
      await pb.collection("promocodes").create({
        code: newCode.trim().toUpperCase(),
        max_uses: newMaxUses === "" ? 0 : newMaxUses,
        current_uses: 0,
        reward_plan: newRewardPlan,
        reward_days: newRewardDays,
        is_active: true,
      });
      toast.success("Promocode generated successfully");
      setIsCreateModalOpen(false);
      fetchPromocodes();
      setNewCode(""); setNewMaxUses(""); setNewRewardPlan("pro"); setNewRewardDays(30);
    } catch (err: any) {
      toast.error(err?.response?.message || "Failed to create promocode");
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
    const matchesSearch = p.code.toLowerCase().includes(searchQuery.toLowerCase());
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
              Manage campaigns and trial rewards
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
                    <th className="px-6 py-4 font-semibold">Reward</th>
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
                          <div className="flex flex-col gap-1">
                            <span className={`w-fit px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${promo.reward_plan === 'agency' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{promo.reward_plan}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3" />{promo.reward_days}d Trial</span>
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
                    <tr><td colSpan={6} className="px-6 py-16 text-center">
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
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${promo.reward_plan === 'agency' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{promo.reward_plan}</span>
                      <span className="text-muted-foreground text-xs">{promo.reward_days}d</span>
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
          <div className="glass-card w-full max-w-md relative z-10 animate-scale-in border border-border/50 shadow-2xl">
            <div className="p-5 sm:p-6 border-b border-border/50 flex items-center justify-between bg-surface/30">
              <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2"><Gift className="w-5 h-5 text-accent" />New Promocode</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Code</label>
                <div className="relative">
                  <input type="text" required placeholder="e.g. SUMMER26" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-foreground font-mono font-medium focus:outline-none input-glow focus:border-accent/50 uppercase tracking-wider" />
                  <Ticket className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Redemption Limit</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Leave empty for unlimited" value={newMaxUses}
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setNewMaxUses(v === "" ? "" : parseInt(v)); }}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Reward Tier</label>
                  <select value={newRewardPlan} onChange={(e) => setNewRewardPlan(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 appearance-none font-medium">
                    <option value="pro">Pro Plan</option>
                    <option value="agency">Agency Plan</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Days</label>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" required value={newRewardDays}
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setNewRewardDays(v === "" ? "" : parseInt(v)); }}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 font-medium" />
                </div>
              </div>
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 flex gap-3">
                <AlertCircle className="w-5 h-5 text-accent shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">Users will receive <strong className="text-foreground">{newRewardDays} days</strong> of <strong className="text-foreground uppercase">{newRewardPlan}</strong>.</p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/50">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-surface transition-colors">Cancel</button>
                <button type="submit" disabled={isCreating} className="btn-primary-glow flex items-center gap-2 px-5 py-2.5">
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}Generate
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
