import { useState, useEffect } from "react";
import { Plus, Search, Trash2, Zap, Users, AlertCircle, Copy, CheckCircle2, Ticket, TrendingUp, Activity, Archive } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

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
  expand?: {
    user_id?: {
      username: string;
      email: string;
    }
  };
  plan_awarded: string;
  days_awarded: number;
  created: string;
};

export default function AdminPromocodes() {
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promocode | null>(null);

  // Create Form State
  const [newCode, setNewCode] = useState("");
  const [newMaxUses, setNewMaxUses] = useState<number | "">("");
  const [newRewardPlan, setNewRewardPlan] = useState("pro");
  const [newRewardDays, setNewRewardDays] = useState<number | "">(30);
  const [isCreating, setIsCreating] = useState(false);

  // Stats State
  const [logs, setLogs] = useState<PromocodeLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // UI State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPromocodes = async () => {
    try {
      const records = await pb.collection("promocodes").getFullList({
        sort: "-created",
      });
      setPromocodes(records as unknown as Promocode[]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load promocodes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromocodes();
  }, []);

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
      setNewCode("");
      setNewMaxUses("");
      setNewRewardPlan("pro");
      setNewRewardDays(30);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.message || "Failed to create promocode");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (promo: Promocode) => {
    if (!window.confirm(`Are you sure you want to deactivate ${promo.code}? This will prevent future redemptions.`)) return;
    
    try {
      await pb.collection("promocodes").update(promo.id, { is_active: false });
      toast.success("Promocode deactivated");
      fetchPromocodes();
    } catch (err) {
      console.error(err);
      toast.error("Failed to deactivate promocode");
    }
  };

  const openStats = async (promo: Promocode) => {
    setSelectedPromo(promo);
    setIsStatsModalOpen(true);
    setLoadingLogs(true);
    try {
      const records = await pb.collection("promocode_logs").getFullList({
        filter: `promocode_id = "${promo.id}"`,
        sort: "-created",
        expand: "user_id",
      });
      setLogs(records as unknown as PromocodeLog[]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load logs");
    } finally {
      setLoadingLogs(false);
    }
  };

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPromocodes = promocodes.filter(p => 
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: promocodes.length,
    active: promocodes.filter(p => p.is_active).length,
    totalUses: promocodes.reduce((acc, curr) => acc + curr.current_uses, 0)
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Promocodes</h1>
          <p className="text-muted-foreground text-sm mt-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Manage marketing campaigns and trial rewards
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary-glow flex items-center gap-2 w-fit px-5 py-2.5 shadow-lg shadow-accent/20"
        >
          <Plus className="w-4 h-4" />
          Create Promocode
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20 shrink-0">
            <Ticket className="w-6 h-6 text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Promocodes</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">{stats.total}</h3>
          </div>
        </div>
        <div className="glass-card p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <Activity className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Active Codes</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">{stats.active}</h3>
          </div>
        </div>
        <div className="glass-card p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Redemptions</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">{stats.totalUses}</h3>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors shadow-sm"
        />
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading campaigns...</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden border border-border/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-surface/80 border-b border-border/50">
                <tr>
                  <th className="px-6 py-5 font-semibold">Code</th>
                  <th className="px-6 py-5 font-semibold">Reward Tier</th>
                  <th className="px-6 py-5 font-semibold">Redemptions</th>
                  <th className="px-6 py-5 font-semibold">Status</th>
                  <th className="px-6 py-5 font-semibold">Created On</th>
                  <th className="px-6 py-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredPromocodes.map((promo) => {
                  const isUnlimited = promo.max_uses === 0;
                  const isDepleted = !isUnlimited && promo.current_uses >= promo.max_uses;
                  
                  return (
                    <tr key={promo.id} className="hover:bg-surface/40 transition-colors group">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => copyToClipboard(promo.code, promo.id)}
                          className="flex items-center gap-2 group/copy"
                          title="Copy Code"
                        >
                          <span className="font-mono font-bold text-foreground tracking-widest text-[15px] bg-accent/5 border border-accent/10 px-3 py-1.5 rounded-lg">
                            {promo.code}
                          </span>
                          <span className="p-1.5 rounded-md text-muted-foreground hover:bg-surface hover:text-foreground opacity-0 group-hover/copy:opacity-100 transition-all">
                            {copiedId === promo.id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </span>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`w-fit px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${
                            promo.reward_plan === 'agency' 
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {promo.reward_plan}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Zap className="w-3 h-3" />
                            {promo.reward_days} Days Trial
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-end gap-1.5 font-medium">
                            <span className="text-foreground text-base">{promo.current_uses}</span>
                            <span className="text-muted-foreground text-xs mb-0.5">/ {isUnlimited ? '∞' : promo.max_uses}</span>
                          </div>
                          {!isUnlimited && (
                            <div className="w-24 h-1.5 bg-surface rounded-full overflow-hidden border border-border/50">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${isDepleted ? 'bg-red-500' : 'bg-accent'}`}
                                style={{ width: `${Math.min(100, (promo.current_uses / promo.max_uses) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                          !promo.is_active 
                            ? "bg-red-500/10 text-red-400 border-red-500/20" 
                            : isDepleted
                              ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}>
                          {!promo.is_active && <Archive className="w-3 h-3" />}
                          {!promo.is_active ? "Archived" : isDepleted ? "Depleted" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-medium">
                        {format(new Date(promo.created), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openStats(promo)}
                            className="p-2 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-colors border border-transparent hover:border-accent/20"
                            title="View Redemptions"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                          {promo.is_active && (
                            <button
                              onClick={() => handleDelete(promo)}
                              className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                              title="Deactivate Code"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredPromocodes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Ticket className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-base font-medium text-foreground">No promocodes found</p>
                        <p className="text-sm mt-1">Try adjusting your search or create a new code.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
          <div className="glass-card w-full max-w-md relative z-10 animate-scale-in border border-border/50 shadow-2xl">
            <div className="p-6 border-b border-border/50 flex items-center justify-between bg-surface/30">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Ticket className="w-5 h-5 text-accent" />
                New Promocode
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Code Identifier</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. SUMMER26"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-foreground font-mono font-medium focus:outline-none input-glow focus:border-accent/50 uppercase tracking-wider"
                  />
                  <Ticket className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">Users will enter this exact code to redeem their reward.</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Redemption Limit</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Leave empty for unlimited"
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value === "" ? "" : parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Reward Tier</label>
                  <select
                    value={newRewardPlan}
                    onChange={(e) => setNewRewardPlan(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 appearance-none font-medium"
                  >
                    <option value="pro">Pro Plan</option>
                    <option value="agency">Agency Plan</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newRewardDays}
                    onChange={(e) => setNewRewardDays(e.target.value === "" ? "" : parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 font-medium"
                  />
                </div>
              </div>

              <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 flex gap-3 mt-4">
                <AlertCircle className="w-5 h-5 text-accent shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When users redeem this code, their existing plan will be paused and they will receive <strong className="text-foreground">{newRewardDays} days</strong> of <strong className="text-foreground uppercase">{newRewardPlan}</strong>.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn-primary-glow flex items-center gap-2 px-6 py-2.5"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Generate Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {isStatsModalOpen && selectedPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsStatsModalOpen(false)} />
          <div className="glass-card w-full max-w-2xl max-h-[85vh] flex flex-col relative z-10 animate-scale-in border border-border/50 shadow-2xl">
            
            <div className="p-6 border-b border-border/50 bg-surface/30 shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-foreground font-mono tracking-wider">{selectedPromo.code}</h2>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      selectedPromo.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {selectedPromo.is_active ? "Active" : "Archived"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {selectedPromo.current_uses} {selectedPromo.current_uses === 1 ? 'Redemption' : 'Redemptions'} total
                  </p>
                </div>
                <button
                  onClick={() => setIsStatsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {loadingLogs ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  <p className="text-sm text-muted-foreground">Fetching redemption history...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Archive className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-base font-medium text-foreground">No redemptions yet</p>
                  <p className="text-sm mt-1">Share this code to start seeing activity.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/50 bg-surface/30 hover:bg-surface/50 transition-colors gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold">
                          {(log.expand?.user_id?.username?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">@{log.expand?.user_id?.username || "Unknown User"}</p>
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{log.expand?.user_id?.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 sm:gap-0.5 border-t sm:border-t-0 border-border/50 pt-3 sm:pt-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
                          {log.plan_awarded} TRIAL
                        </span>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {format(new Date(log.created), "MMM d, yyyy • HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
