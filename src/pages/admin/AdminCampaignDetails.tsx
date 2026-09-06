import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  Archive,
  ArrowRight,
  ChevronLeft,
  CircleDollarSign,
  Copy,
  Edit3,
  ExternalLink,
  Gift,
  Loader2,
  Pause,
  Play,
  Plus,
  Route,
  Square,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
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
  campaignRate,
  campaignStatusLabel,
  formatCampaignMoney,
  type MarketingCampaign,
  type MarketingPlacement,
} from "@/lib/marketingCampaigns";
import { pb } from "@/lib/pocketbase";
import { maskError } from "@/lib/utils";

const fieldClass = "h-10 w-full rounded-xl border border-border bg-background/45 px-3 text-sm text-foreground outline-none transition focus:border-accent/45 focus:ring-2 focus:ring-accent/10";
const labelClass = "mb-1.5 block text-xs font-semibold text-foreground";

function localDateValue(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

function Stat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Activity }) {
  return <div className="rounded-2xl border border-border bg-surface/60 p-4"><div className="flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4 text-accent" /><span className="text-[10px] font-bold uppercase tracking-[0.14em]">{label}</span></div><p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

export default function AdminCampaignDetails() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [placementOpen, setPlacementOpen] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<MarketingPlacement | null>(null);
  const [placementRemoval, setPlacementRemoval] = useState<MarketingPlacement | null>(null);
  const [campaignRemovalOpen, setCampaignRemovalOpen] = useState(false);

  const [editName, setEditName] = useState("");
  const [editObjective, setEditObjective] = useState("signups");
  const [editLanding, setEditLanding] = useState("/");
  const [editBudget, setEditBudget] = useState("");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editStarts, setEditStarts] = useState("");
  const [editEnds, setEditEnds] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [placementName, setPlacementName] = useState("");
  const [placementSource, setPlacementSource] = useState("");
  const [placementMedium, setPlacementMedium] = useState("paid_social");
  const [placementLanding, setPlacementLanding] = useState("");
  const [placementCost, setPlacementCost] = useState("");
  const [placementActive, setPlacementActive] = useState(true);
  const [placementNotes, setPlacementNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await pb.send<MarketingCampaign>(`/api/admin/campaigns/${encodeURIComponent(id)}`, { method: "GET", requestKey: null });
      setCampaign(response);
    } catch (error) {
      toast.error(maskError(error, "Campaign could not be loaded."));
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const spendCents = campaign?.spent_cents || 0;
  const cpaCents = campaign && campaign.metrics.signups > 0 ? spendCents / campaign.metrics.signups : null;
  const roas = campaign && spendCents > 0 ? (campaign.metrics.revenue * 100) / spendCents : null;
  const funnel = useMemo(() => campaign ? [
    { label: "Unique visits", value: campaign.metrics.unique_visitors, icon: Users, rate: 100 },
    { label: "Registrations", value: campaign.metrics.signups, icon: UserPlus, rate: campaignRate(campaign.metrics.signups, campaign.metrics.unique_visitors) },
    { label: "Activated", value: campaign.metrics.activated, icon: UserCheck, rate: campaignRate(campaign.metrics.activated, campaign.metrics.signups) },
    { label: "Paid", value: campaign.metrics.paid, icon: CircleDollarSign, rate: campaignRate(campaign.metrics.paid, campaign.metrics.signups) },
  ] : [], [campaign]);

  const campaignPayload = (status = campaign?.status) => ({
    name: editName || campaign?.name,
    objective: editObjective || campaign?.objective,
    status,
    landing_path: editLanding || campaign?.landing_path,
    budget_cents: Math.round(Math.max(0, Number(editBudget || 0)) * 100),
    currency: editCurrency || campaign?.currency,
    starts_at: editStarts ? new Date(editStarts).toISOString() : "",
    ends_at: editEnds ? new Date(editEnds).toISOString() : "",
    notes: editNotes,
  });

  const seedEdit = () => {
    if (!campaign) return;
    setEditName(campaign.name); setEditObjective(campaign.objective); setEditLanding(campaign.landing_path);
    setEditBudget(String(campaign.budget_cents / 100)); setEditCurrency(campaign.currency);
    setEditStarts(localDateValue(campaign.starts_at)); setEditEnds(localDateValue(campaign.ends_at)); setEditNotes(campaign.notes);
    setEditOpen(true);
  };

  const updateStatus = async (status: MarketingCampaign["status"]) => {
    if (!campaign) return;
    setSaving(true);
    try {
      const updated = await pb.send<MarketingCampaign>(`/api/admin/campaigns/${campaign.id}`, {
        method: "PUT",
        body: {
          name: campaign.name, objective: campaign.objective, status, landing_path: campaign.landing_path,
          budget_cents: campaign.budget_cents, currency: campaign.currency, starts_at: campaign.starts_at,
          ends_at: campaign.ends_at, notes: campaign.notes,
        }, requestKey: null,
      });
      setCampaign(updated);
      toast.success(status === "active" ? "Campaign activated." : status === "paused" ? "Campaign paused." : "Campaign ended.");
    } catch (error) { toast.error(maskError(error, "Campaign status could not be changed.")); }
    finally { setSaving(false); }
  };

  const saveCampaign = async (event: FormEvent) => {
    event.preventDefault(); if (!campaign) return; setSaving(true);
    try {
      const updated = await pb.send<MarketingCampaign>(`/api/admin/campaigns/${campaign.id}`, { method: "PUT", body: campaignPayload(), requestKey: null });
      setCampaign(updated); setEditOpen(false); toast.success("Campaign settings saved.");
    } catch (error) { toast.error(maskError(error, "Campaign settings could not be saved.")); }
    finally { setSaving(false); }
  };

  const openPlacement = (placement: MarketingPlacement | null = null) => {
    setEditingPlacement(placement);
    setPlacementName(placement?.name || ""); setPlacementSource(placement?.source || "");
    setPlacementMedium(placement?.medium || "paid_social"); setPlacementLanding(placement?.landing_path || "");
    setPlacementCost(String((placement?.cost_cents || 0) / 100)); setPlacementActive(placement?.is_active ?? true);
    setPlacementNotes(placement?.notes || ""); setPlacementOpen(true);
  };

  const savePlacement = async (event: FormEvent) => {
    event.preventDefault(); if (!campaign) return; setSaving(true);
    try {
      const path = editingPlacement
        ? `/api/admin/campaigns/${campaign.id}/placements/${editingPlacement.id}`
        : `/api/admin/campaigns/${campaign.id}/placements`;
      const updated = await pb.send<MarketingCampaign>(path, {
        method: editingPlacement ? "PUT" : "POST",
        body: {
          name: placementName, source: placementSource, medium: placementMedium,
          landing_path: placementLanding, cost_cents: Math.round(Math.max(0, Number(placementCost || 0)) * 100),
          is_active: placementActive, notes: placementNotes,
        }, requestKey: null,
      });
      setCampaign(updated); setPlacementOpen(false); toast.success(editingPlacement ? "Placement updated." : "Tracked placement created.");
    } catch (error) { toast.error(maskError(error, "Placement could not be saved.")); }
    finally { setSaving(false); }
  };

  const removePlacement = async () => {
    if (!campaign || !placementRemoval) return;
    setSaving(true);
    try {
      const response = await pb.send<{ action: "deleted" | "disabled"; campaign: MarketingCampaign }>(
        `/api/admin/campaigns/${campaign.id}/placements/${placementRemoval.id}`,
        { method: "DELETE", requestKey: null },
      );
      setCampaign(response.campaign);
      setPlacementRemoval(null);
      toast.success(response.action === "deleted" ? "Placement deleted." : "Placement disabled.", {
        description: response.action === "disabled" ? "Recorded attribution remains available in the campaign report." : undefined,
      });
    } catch (error) { toast.error(maskError(error, "Placement could not be removed.")); }
    finally { setSaving(false); }
  };

  const removeCampaign = async () => {
    if (!campaign) return;
    setSaving(true);
    try {
      const response = await pb.send<{ action: "deleted" | "archived"; campaign?: MarketingCampaign }>(
        `/api/admin/campaigns/${campaign.id}`,
        { method: "DELETE", requestKey: null },
      );
      setCampaignRemovalOpen(false);
      toast.success(response.action === "deleted" ? "Campaign deleted." : "Campaign archived.", {
        description: response.action === "archived" ? "Tracked URLs and the project offer were disabled; reporting history was preserved." : undefined,
      });
      navigate("/admin/campaigns");
    } catch (error) { toast.error(maskError(error, "Campaign could not be removed.")); }
    finally { setSaving(false); }
  };

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value); toast.success(`${label} copied.`);
  };

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>;
  if (!campaign) return <div className="mx-auto max-w-lg p-8 text-center"><p className="text-foreground">Campaign is unavailable.</p><Link to="/admin/campaigns" className="mt-4 inline-flex text-accent hover:underline">Back to campaigns</Link></div>;

  const statusLabel = campaignStatusLabel(campaign);
  const archived = campaign.status === "archived";
  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-2">
          <button type="button" onClick={() => navigate("/admin/campaigns")} className="-ml-2 rounded-lg p-2 text-muted-foreground hover:bg-surface hover:text-foreground" aria-label="Back to campaigns"><ChevronLeft className="h-5 w-5" /></button>
          <div><div className="flex flex-wrap items-center gap-2.5"><h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{campaign.name}</h1><span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${campaign.is_live ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" : "border-border bg-background/50 text-muted-foreground"}`}>{statusLabel}</span></div><div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span className="font-mono">{campaign.tracking_key}</span><span>{campaign.landing_path}</span><span className="capitalize">Objective: {campaign.objective}</span></div></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!archived && <button type="button" onClick={seedEdit} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><Edit3 className="h-4 w-4" /> Edit</button>}
          {!archived && campaign.status !== "active" && campaign.status !== "ended" && <button type="button" onClick={() => void updateStatus("active")} disabled={saving} className="btn-primary-glow inline-flex h-10 items-center gap-2 px-4 py-0 text-sm"><Play className="h-4 w-4" /> Launch</button>}
          {!archived && campaign.status === "active" && <button type="button" onClick={() => void updateStatus("paused")} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 text-sm font-semibold text-amber-300"><Pause className="h-4 w-4" /> Pause</button>}
          {!archived && campaign.status !== "ended" && <button type="button" onClick={() => void updateStatus("ended")} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-muted-foreground hover:text-foreground"><Square className="h-3.5 w-3.5" /> End</button>}
          {!archived && <button type="button" onClick={() => setCampaignRemovalOpen(true)} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 text-sm font-semibold text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /> Remove</button>}
        </div>
      </header>

      {archived && <section className="flex items-start gap-3 rounded-2xl border border-border bg-surface/60 p-4"><Archive className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-semibold text-foreground">Archived campaign</p><p className="mt-1 text-xs text-muted-foreground">Its tracked URLs and project offer are disabled. Historical attribution remains read-only.</p></div></section>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Human visits" value={campaign.metrics.unique_visitors.toLocaleString()} detail={`${campaign.metrics.visits.toLocaleString()} total opens`} icon={Route} />
        <Stat label="Registrations" value={campaign.metrics.signups.toLocaleString()} detail={`${campaignRate(campaign.metrics.signups, campaign.metrics.unique_visitors).toFixed(1)}% visit conversion`} icon={UserPlus} />
        <Stat label="Paid users" value={campaign.metrics.paid.toLocaleString()} detail={`${campaignRate(campaign.metrics.paid, campaign.metrics.signups).toFixed(1)}% of signups`} icon={CircleDollarSign} />
        <Stat label="Recorded spend" value={formatCampaignMoney(spendCents, campaign.currency)} detail={cpaCents === null ? "No registration CPA yet" : `${formatCampaignMoney(cpaCents, campaign.currency)} per signup`} icon={Activity} />
        <Stat label="Confirmed revenue" value={formatCampaignMoney(campaign.metrics.revenue * 100, campaign.currency)} detail={roas === null ? "ROAS appears after spend" : `${roas.toFixed(2)}× ROAS`} icon={CircleDollarSign} />
      </section>

      <section className="rounded-2xl border border-border bg-surface/60 p-5">
        <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Acquisition route</p><h2 className="mt-1 text-lg font-semibold text-foreground">From placement to customer</h2></div>
        <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-center">
          {funnel.map((step, index) => <div className="contents" key={step.label}><div className="rounded-xl border border-border bg-background/45 p-4"><div className="flex items-center justify-between gap-3"><step.icon className="h-4 w-4 text-accent" /><span className="font-mono text-[11px] text-muted-foreground">{index === 0 ? "entry" : `${step.rate.toFixed(1)}%`}</span></div><p className="mt-5 font-mono text-2xl font-semibold tabular-nums text-foreground">{step.value.toLocaleString()}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{step.label}</p></div>{index < funnel.length - 1 && <ArrowRight className="mx-auto hidden h-4 w-4 text-muted-foreground lg:block" />}</div>)}
        </div>
      </section>

      {campaign.promocode && <section className="flex flex-col gap-4 rounded-2xl border border-accent/20 bg-accent/5 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-accent"><Gift className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-foreground">Campaign offer · <span className="font-mono">{campaign.promocode.code}</span></p><p className="mt-1 text-xs text-muted-foreground">{campaign.promocode.reward_enabled ? `${campaign.promocode.reward_plan.toUpperCase()} for ${campaign.promocode.reward_days} days` : "Tracking-only code"} · {campaign.promocode.current_uses} redemption{campaign.promocode.current_uses === 1 ? "" : "s"} · zero partner commission</p></div></div><button type="button" onClick={() => void copy(campaign.promocode!.code, "Promocode")} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /> Copy code</button></section>}

      <section className="overflow-hidden rounded-2xl border border-border bg-surface/60">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold text-foreground">Placements</h2><p className="mt-1 text-xs text-muted-foreground">One tracked URL per channel, creator, ad set, or newsletter slot.</p></div>{!archived && <button type="button" onClick={() => openPlacement()} className="btn-primary-glow inline-flex h-9 items-center gap-2 px-3.5 py-0 text-xs"><Plus className="h-3.5 w-3.5" /> Add placement</button>}</div>
        {campaign.placements.length === 0 ? <div className="p-10 text-center"><Route className="mx-auto h-7 w-7 text-accent" /><p className="mt-3 text-sm font-semibold text-foreground">No tracked URLs yet</p><p className="mt-1 text-xs text-muted-foreground">{archived ? "No placements were retained." : "Add a placement before sharing this campaign."}</p></div> : <div className="divide-y divide-border">{campaign.placements.map((placement) => <article key={placement.id} className="p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-foreground">{placement.name}</p><span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${placement.is_active ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-border text-muted-foreground"}`}>{placement.is_active ? "Active" : "Paused"}</span><span className="font-mono text-[10px] text-muted-foreground">{placement.source} / {placement.medium}</span></div><div className="mt-2 flex min-w-0 items-center gap-2"><code className="truncate rounded-md bg-background/60 px-2 py-1 text-[11px] text-accent">{placement.tracking_url}</code><button type="button" onClick={() => void copy(placement.tracking_url, "Tracked URL")} className="p-1 text-muted-foreground hover:text-foreground" aria-label={`Copy ${placement.name} URL`}><Copy className="h-3.5 w-3.5" /></button><a href={placement.tracking_url} target="_blank" rel="noreferrer" className="p-1 text-muted-foreground hover:text-foreground" aria-label={`Open ${placement.name} URL`}><ExternalLink className="h-3.5 w-3.5" /></a></div></div><div className="flex flex-wrap items-center gap-5 text-xs"><div><span className="text-muted-foreground">Visits</span><span className="ml-2 font-mono font-semibold text-foreground">{placement.metrics.unique_visitors}</span></div><div><span className="text-muted-foreground">Signups</span><span className="ml-2 font-mono font-semibold text-foreground">{placement.metrics.signups}</span></div><div><span className="text-muted-foreground">Paid</span><span className="ml-2 font-mono font-semibold text-foreground">{placement.metrics.paid}</span></div><div><span className="text-muted-foreground">Cost</span><span className="ml-2 font-mono font-semibold text-foreground">{formatCampaignMoney(placement.cost_cents, campaign.currency)}</span></div>{!archived && <button type="button" onClick={() => openPlacement(placement)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 font-semibold text-muted-foreground hover:text-foreground"><Edit3 className="h-3 w-3" /> Edit</button>}</div></div></article>)}</div>}
      </section>

      <p className="text-xs leading-5 text-muted-foreground">Campaign reporting uses first-touch Growth attribution. Partner commissions continue to use the separate immutable affiliate attribution contract. Customer link and profile analytics are not used for campaign visit counts.</p>

      <Dialog open={editOpen} onOpenChange={(open) => { if (!saving) setEditOpen(open); }}><DialogContent className="max-w-2xl border-border bg-surface p-0"><DialogHeader className="border-b border-border p-5 text-left"><DialogTitle>Edit campaign</DialogTitle><DialogDescription>Dates control both tracked links and the attached project promocode.</DialogDescription></DialogHeader><form onSubmit={saveCampaign}><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="sm:col-span-2"><span className={labelClass}>Name</span><input required value={editName} onChange={(e) => setEditName(e.target.value)} className={fieldClass} /></label><label><span className={labelClass}>Objective</span><select value={editObjective} onChange={(e) => setEditObjective(e.target.value)} className={fieldClass}><option value="signups">Registrations</option><option value="activation">Activation</option><option value="revenue">Revenue</option></select></label><label><span className={labelClass}>Landing path</span><input required value={editLanding} onChange={(e) => setEditLanding(e.target.value)} className={fieldClass} /></label><label><span className={labelClass}>Budget</span><input type="number" min={0} step="0.01" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} className={fieldClass} /></label><label><span className={labelClass}>Currency</span><input required minLength={3} maxLength={3} value={editCurrency} onChange={(e) => setEditCurrency(e.target.value.toUpperCase())} className={fieldClass} /></label><label><span className={labelClass}>Starts at</span><input type="datetime-local" value={editStarts} onChange={(e) => setEditStarts(e.target.value)} className={fieldClass} /></label><label><span className={labelClass}>Ends at</span><input type="datetime-local" value={editEnds} onChange={(e) => setEditEnds(e.target.value)} className={fieldClass} /></label><label className="sm:col-span-2"><span className={labelClass}>Notes</span><textarea maxLength={1000} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="min-h-20 w-full rounded-xl border border-border bg-background/45 p-3 text-sm text-foreground outline-none" /></label></div><DialogFooter className="border-t border-border p-4"><button type="button" onClick={() => setEditOpen(false)} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground">Cancel</button><button type="submit" disabled={saving} className="btn-primary-glow inline-flex h-10 items-center gap-2 px-5 py-0 text-sm">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes</button></DialogFooter></form></DialogContent></Dialog>

      <Dialog open={placementOpen} onOpenChange={(open) => { if (!saving) setPlacementOpen(open); }}><DialogContent className="max-w-2xl border-border bg-surface p-0"><DialogHeader className="border-b border-border p-5 text-left"><DialogTitle>{editingPlacement ? "Edit placement" : "Add placement"}</DialogTitle><DialogDescription>The URL identity stays stable when placement settings change.</DialogDescription></DialogHeader><form onSubmit={savePlacement}><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="sm:col-span-2"><span className={labelClass}>Placement name</span><input required value={placementName} onChange={(e) => setPlacementName(e.target.value)} className={fieldClass} placeholder="Telegram · channel A · post 1" /></label><label><span className={labelClass}>Source</span><input required value={placementSource} onChange={(e) => setPlacementSource(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))} className={`${fieldClass} font-mono`} placeholder="telegram" /></label><label><span className={labelClass}>Medium</span><input required value={placementMedium} onChange={(e) => setPlacementMedium(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))} className={`${fieldClass} font-mono`} placeholder="paid_social" /></label><label><span className={labelClass}>Placement cost</span><input type="number" min={0} step="0.01" value={placementCost} onChange={(e) => setPlacementCost(e.target.value)} className={fieldClass} /></label><label><span className={labelClass}>Landing override <span className="font-normal text-muted-foreground">· optional</span></span><input value={placementLanding} onChange={(e) => setPlacementLanding(e.target.value)} className={fieldClass} placeholder={campaign.landing_path} /></label><label className="sm:col-span-2"><span className={labelClass}>Notes</span><textarea maxLength={500} value={placementNotes} onChange={(e) => setPlacementNotes(e.target.value)} className="min-h-20 w-full rounded-xl border border-border bg-background/45 p-3 text-sm text-foreground outline-none" /></label><label className="sm:col-span-2 flex items-center gap-2 text-sm font-semibold text-foreground"><input type="checkbox" checked={placementActive} onChange={(e) => setPlacementActive(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--accent))]" /> Placement link is active</label></div><DialogFooter className="border-t border-border p-4 sm:justify-between"><div>{editingPlacement && <button type="button" onClick={() => { setPlacementOpen(false); setPlacementRemoval(editingPlacement); }} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /> Remove</button>}</div><div className="flex gap-2"><button type="button" onClick={() => setPlacementOpen(false)} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground">Cancel</button><button type="submit" disabled={saving} className="btn-primary-glow inline-flex h-10 items-center gap-2 px-5 py-0 text-sm">{saving && <Loader2 className="h-4 w-4 animate-spin" />} {editingPlacement ? "Save placement" : "Create tracked URL"}</button></div></DialogFooter></form></DialogContent></Dialog>

      <AlertDialog open={Boolean(placementRemoval)} onOpenChange={(open) => { if (!open && !saving) setPlacementRemoval(null); }}><AlertDialogContent className="border-border bg-surface"><AlertDialogHeader><AlertDialogTitle className="text-foreground">Remove {placementRemoval?.name}?</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">Unused placements are deleted. If this URL already has recorded attribution, it will be disabled and retained in campaign reporting.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void removePlacement(); }} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Remove placement</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={campaignRemovalOpen} onOpenChange={(open) => { if (!saving) setCampaignRemovalOpen(open); }}><AlertDialogContent className="border-border bg-surface"><AlertDialogHeader><AlertDialogTitle className="text-foreground">Remove {campaign.name}?</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">A campaign without recorded activity will be deleted with its placements and unused project offer. If activity exists, the campaign will be archived and every tracked URL and project offer will be disabled while reports remain available.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void removeCampaign(); }} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Remove campaign</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
