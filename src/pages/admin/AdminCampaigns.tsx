import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  Archive,
  ArrowRight,
  ChevronLeft,
  CircleDollarSign,
  Copy,
  Gift,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  Route,
  Ticket,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  campaignCostPerSignup,
  campaignRate,
  campaignStatusLabel,
  formatCampaignMoney,
  type MarketingCampaign,
} from "@/lib/marketingCampaigns";
import { pb } from "@/lib/pocketbase";
import { maskError } from "@/lib/utils";

const fieldClass = "h-10 w-full rounded-xl border border-border bg-background/45 px-3 text-sm text-foreground outline-none transition focus:border-accent/45 focus:ring-2 focus:ring-accent/10";
const labelClass = "mb-1.5 block text-xs font-semibold text-foreground";

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Activity }) {
  return (
    <div className="flex items-center gap-3 p-4 sm:p-5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-background/45 text-accent">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-foreground">{value}</p>
        <p className="truncate text-[11px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

const statusTone: Record<string, string> = {
  Live: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  Scheduled: "border-sky-500/25 bg-sky-500/10 text-sky-300",
  Draft: "border-border bg-background/50 text-muted-foreground",
  Paused: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  Ended: "border-border bg-background/50 text-muted-foreground",
  Archived: "border-border bg-background/50 text-muted-foreground",
};

export default function AdminCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("signups");
  const [status, setStatus] = useState("draft");
  const [landingPath, setLandingPath] = useState("/");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [notes, setNotes] = useState("");
  const [addOffer, setAddOffer] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [rewardPlan, setRewardPlan] = useState("pro");
  const [rewardDays, setRewardDays] = useState("14");
  const [maxUses, setMaxUses] = useState("0");

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const response = await pb.send<{ campaigns: MarketingCampaign[] }>("/api/admin/campaigns", {
        method: "GET",
        requestKey: null,
      });
      setCampaigns(response.campaigns || []);
    } catch (error) {
      toast.error(maskError(error, "Campaigns could not be loaded."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const currentCampaigns = useMemo(() => campaigns.filter((campaign) => campaign.status !== "archived"), [campaigns]);
  const archivedCount = campaigns.length - currentCampaigns.length;
  const visibleCampaigns = showArchived ? campaigns : currentCampaigns;
  const totals = useMemo(() => currentCampaigns.reduce((sum, campaign) => ({
    live: sum.live + (campaign.is_live ? 1 : 0),
    visits: sum.visits + campaign.metrics.unique_visitors,
    signups: sum.signups + campaign.metrics.signups,
    paid: sum.paid + campaign.metrics.paid,
    spend: sum.spend + campaign.spent_cents,
  }), { live: 0, visits: 0, signups: 0, paid: 0, spend: 0 }), [currentCampaigns]);
  const campaignCurrencies = useMemo(() => new Set(currentCampaigns.map((campaign) => campaign.currency)), [currentCampaigns]);
  const spendSummary = campaignCurrencies.size <= 1
    ? `${formatCampaignMoney(totals.spend, currentCampaigns[0]?.currency || "USD")} recorded spend`
    : `${campaignCurrencies.size} currencies · spend tracked per campaign`;

  const resetForm = () => {
    setName(""); setObjective("signups"); setStatus("draft"); setLandingPath("/");
    setBudget(""); setCurrency("USD"); setStartsAt(""); setEndsAt(""); setNotes("");
    setAddOffer(false); setPromoCode(""); setRewardPlan("pro"); setRewardDays("14"); setMaxUses("0");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const campaign = await pb.send<MarketingCampaign>("/api/admin/campaigns", {
        method: "POST",
        body: {
          name,
          objective,
          status,
          landing_path: landingPath,
          budget_cents: Math.round(Math.max(0, Number(budget || 0)) * 100),
          currency,
          starts_at: startsAt ? new Date(startsAt).toISOString() : "",
          ends_at: endsAt ? new Date(endsAt).toISOString() : "",
          notes,
          promocode_code: addOffer ? promoCode : "",
          reward_enabled: addOffer,
          reward_plan: rewardPlan,
          reward_days: addOffer ? Number(rewardDays) : 0,
          max_uses: addOffer ? Number(maxUses) : 0,
        },
        requestKey: null,
      });
      toast.success("Campaign created.", { description: "Add at least one placement to get a tracked URL." });
      setDialogOpen(false);
      resetForm();
      setCampaigns((current) => [campaign, ...current]);
      navigate(`/admin/campaigns/${campaign.id}`);
    } catch (error) {
      toast.error(maskError(error, "Campaign could not be created."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <button type="button" onClick={() => navigate("/dashboard")} className="-ml-2 rounded-lg p-2 text-muted-foreground hover:bg-surface hover:text-foreground" aria-label="Back to dashboard">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Campaigns</h1>
              <span className="rounded-md border border-accent/20 bg-accent/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-accent">Growth ops</span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Run project-owned acquisition campaigns without creating a partner account.</p>
            <Link to="/admin/promocodes" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">Open partner promocodes <ArrowRight className="h-3 w-3" /></Link>
          </div>
        </div>
        <div className="flex gap-2">
          {archivedCount > 0 && <button type="button" onClick={() => setShowArchived((shown) => !shown)} className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold ${showArchived ? "border-accent/30 bg-accent/10 text-accent" : "border-border bg-surface text-muted-foreground hover:text-foreground"}`}><Archive className="h-4 w-4" /> {showArchived ? "Hide archived" : `Archived (${archivedCount})`}</button>}
          <button type="button" onClick={() => void load(true)} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button type="button" onClick={() => setDialogOpen(true)} className="btn-primary-glow inline-flex h-10 items-center gap-2 px-4 py-0 text-sm"><Plus className="h-4 w-4" /> New campaign</button>
        </div>
      </header>

      <section className="grid overflow-hidden rounded-2xl border border-border bg-surface/70 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border">
        <Metric label="Live campaigns" value={String(totals.live)} detail={`${currentCampaigns.length} current`} icon={Megaphone} />
        <Metric label="Unique visits" value={totals.visits.toLocaleString()} detail="human campaign traffic" icon={Route} />
        <Metric label="Registrations" value={totals.signups.toLocaleString()} detail={`${campaignRate(totals.signups, totals.visits).toFixed(1)}% of unique visits`} icon={UserPlus} />
        <Metric label="Paid users" value={totals.paid.toLocaleString()} detail={spendSummary} icon={CircleDollarSign} />
      </section>

      {loading ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-border bg-surface/50"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : visibleCampaigns.length === 0 ? (
        <section className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-border bg-surface/35 p-8 text-center">
          <div><Megaphone className="mx-auto h-8 w-8 text-accent" /><h2 className="mt-4 text-lg font-semibold text-foreground">{campaigns.length > 0 ? "No current campaigns" : "Create the first project campaign"}</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">{campaigns.length > 0 ? "Archived campaigns remain available from the filter above." : "Campaigns group placements, tracked URLs, an optional offer, spend, and conversion reporting."}</p><button type="button" onClick={() => setDialogOpen(true)} className="btn-primary-glow mt-5 inline-flex h-10 items-center gap-2 px-4 py-0 text-sm"><Plus className="h-4 w-4" /> New campaign</button></div>
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {visibleCampaigns.map((campaign) => {
            const statusLabel = campaignStatusLabel(campaign);
            const cps = campaignCostPerSignup(campaign);
            return (
              <Link key={campaign.id} to={`/admin/campaigns/${campaign.id}`} className="group rounded-2xl border border-border bg-surface/60 p-5 transition hover:border-accent/30 hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0"><p className="truncate text-lg font-semibold text-foreground">{campaign.name}</p><p className="mt-1 font-mono text-[11px] text-muted-foreground">{campaign.tracking_key}</p></div>
                  <span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${statusTone[statusLabel] || statusTone.Draft}`}>{statusLabel}</span>
                </div>
                <div className="mt-5 grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-border bg-border">
                  {[
                    ["Visits", campaign.metrics.unique_visitors],
                    ["Signups", campaign.metrics.signups],
                    ["Activated", campaign.metrics.activated],
                    ["Paid", campaign.metrics.paid],
                  ].map(([label, value]) => <div key={String(label)} className="bg-background/70 px-3 py-3"><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">{value}</p></div>)}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  <span>{campaign.placements.length} placement{campaign.placements.length === 1 ? "" : "s"}</span>
                  <span>{formatCampaignMoney(campaign.spent_cents, campaign.currency)} spent</span>
                  <span>{cps === null ? "—" : formatCampaignMoney(cps, campaign.currency)} / signup</span>
                  {campaign.promocode && <span className="inline-flex items-center gap-1 text-accent"><Ticket className="h-3 w-3" /> {campaign.promocode.code}</span>}
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!saving) setDialogOpen(open); }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border bg-surface p-0">
          <DialogHeader className="border-b border-border px-6 py-5 text-left">
            <DialogTitle className="flex items-center gap-2 text-xl"><Megaphone className="h-5 w-5 text-accent" /> New project campaign</DialogTitle>
            <DialogDescription>Define the campaign once. Each placement gets its own source, cost, and tracked URL.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit}>
            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className={labelClass}>Campaign name</span><input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} placeholder="September creator acquisition" autoFocus /></label>
              <label><span className={labelClass}>Objective</span><select value={objective} onChange={(e) => setObjective(e.target.value)} className={fieldClass}><option value="signups">Registrations</option><option value="activation">Activation</option><option value="revenue">Revenue</option></select></label>
              <label><span className={labelClass}>Initial status</span><select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass}><option value="draft">Draft</option><option value="active">Active</option></select></label>
              <label><span className={labelClass}>Landing path</span><input required value={landingPath} onChange={(e) => setLandingPath(e.target.value)} className={fieldClass} placeholder="/pricing" /></label>
              <div className="grid grid-cols-[1fr_90px] gap-2"><label><span className={labelClass}>Budget</span><input type="number" min={0} step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} className={fieldClass} placeholder="0.00" /></label><label><span className={labelClass}>Currency</span><input required minLength={3} maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className={`${fieldClass} font-mono uppercase`} /></label></div>
              <label><span className={labelClass}>Starts at <span className="font-normal text-muted-foreground">· optional</span></span><input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={fieldClass} /></label>
              <label><span className={labelClass}>Ends at <span className="font-normal text-muted-foreground">· optional</span></span><input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={fieldClass} /></label>
              <label className="sm:col-span-2"><span className={labelClass}>Internal notes <span className="font-normal text-muted-foreground">· optional</span></span><textarea maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20 w-full resize-y rounded-xl border border-border bg-background/45 px-3 py-2 text-sm text-foreground outline-none focus:border-accent/45 focus:ring-2 focus:ring-accent/10" /></label>

              <div className="sm:col-span-2 rounded-xl border border-border bg-background/30 p-4">
                <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={addOffer} onChange={(e) => setAddOffer(e.target.checked)} className="mt-1 h-4 w-4 accent-[hsl(var(--accent))]" /><span><span className="flex items-center gap-2 text-sm font-semibold text-foreground"><Gift className="h-4 w-4 text-accent" /> Add a signup offer</span><span className="mt-1 block text-xs text-muted-foreground">Creates a project-owned promocode with zero commission. Partner attribution remains untouched.</span></span></label>
                {addOffer && <div className="mt-4 grid gap-3 sm:grid-cols-4"><label className="sm:col-span-2"><span className={labelClass}>Promocode</span><div className="relative"><input required minLength={3} maxLength={32} value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} className={`${fieldClass} pr-9 font-mono uppercase`} placeholder="SEPTEMBER14" /><button type="button" onClick={() => { void navigator.clipboard.writeText(promoCode); toast.success("Promocode copied."); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground" aria-label="Copy promocode"><Copy className="h-3.5 w-3.5" /></button></div></label><label><span className={labelClass}>Plan</span><select value={rewardPlan} onChange={(e) => setRewardPlan(e.target.value)} className={fieldClass}><option value="pro">Pro</option><option value="agency">Agency</option></select></label><label><span className={labelClass}>Reward days</span><input required type="number" min={1} max={1095} value={rewardDays} onChange={(e) => setRewardDays(e.target.value)} className={fieldClass} /></label><label className="sm:col-span-2"><span className={labelClass}>Usage limit <span className="font-normal text-muted-foreground">· 0 is unlimited</span></span><input type="number" min={0} max={1000000} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className={fieldClass} /></label></div>}
              </div>
            </div>
            <DialogFooter className="border-t border-border px-6 py-4"><button type="button" onClick={() => setDialogOpen(false)} disabled={saving} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground hover:text-foreground">Cancel</button><button type="submit" disabled={saving} className="btn-primary-glow inline-flex h-10 items-center gap-2 px-5 py-0 text-sm disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create campaign</button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
