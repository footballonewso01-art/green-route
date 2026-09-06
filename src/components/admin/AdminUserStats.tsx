import { useCallback, useEffect, useState } from "react";
import { Eye, History, Loader2, SlidersHorizontal, Undo2 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { pb } from "@/lib/pocketbase";
import AnalyticsPage from "@/pages/AnalyticsPage";
import { DashboardMetric, DashboardMetricRail, DashboardPanel } from "@/components/dashboard/DashboardPrimitives";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Summary {
  before: number; after: number; unique: number; resources: number;
  trend: { date: string; clicks: number }[];
  countries: { name: string; clicks: number }[];
  estimated: boolean; geographyEstimated: boolean;
}
interface Adjustment {
  id: string; state: "applied" | "reverted"; mode: string; resource_id: string;
  actor_id: string; start_at: string; end_at: string; reason: string;
  created: string; reverted_by: string; summary: Summary;
}
interface Options {
  links: { id: string; name: string; slug: string }[];
  profiles: { id: string; name: string; slug: string }[];
  history: Adjustment[];
}
interface Preview { id: string; summary: Summary; expiresAt: string }
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const field = "w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60";
const button = "inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed";
const errorMessage = (error: unknown) => {
  const detail = error as { response?: { message?: string }; message?: string };
  return detail.response?.message || "The request could not be completed. Refresh the history before retrying.";
};

export function AdminUserStats({ userId, onChanged }: { userId: string; onChanged?: () => void }) {
  const [options, setOptions] = useState<Options | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ mode: "links", resourceId: "all", start: day(-7), end: day(-1), total: "", uniquePercent: "80", countries: "", reason: "" });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [generation, setGeneration] = useState(0);
  const [confirmation, setConfirmation] = useState<{ id: string; undo: boolean } | null>(null);
  const base = `/api/admin/users/${encodeURIComponent(userId)}/stats`;
  const load = useCallback(async () => {
    const data = await pb.send<Options>(base, { method: "GET", requestKey: null, cache: "no-store" });
    setOptions(data);
  }, [base]);
  useEffect(() => {
    let active = true;
    pb.send<Options>(base, { method: "GET", requestKey: null, cache: "no-store" })
      .then(data => { if (active) setOptions(data); })
      .catch(e => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [base]);
  const update = (name: keyof typeof form, value: string) => {
    setForm(current => ({ ...current, [name]: value, ...(name === "mode" ? { resourceId: "all" } : {}) }));
    setPreview(null); setNotice("");
  };
  const createPreview = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setPreview(null); setNotice("");
    try {
      setPreview(await pb.send<Preview>(`${base}/preview`, { method: "POST", body: { ...form, total: Number(form.total), uniquePercent: Number(form.uniquePercent) }, requestKey: null }));
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  const commit = async () => {
    if (!confirmation) return;
    const operation = confirmation; setConfirmation(null); setBusy(true); setError(""); setNotice("");
    try {
      await pb.send(`${base}/${operation.id}/${operation.undo ? "undo" : "apply"}`, { method: "POST", requestKey: null });
      setPreview(null); setGeneration(n => n + 1);
      setNotice(operation.undo ? "Adjustment undone. Real traffic recorded since the change is preserved." : "Adjustment applied. User-facing aggregates and counters have been updated.");
      onChanged?.();
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  const resources = form.mode === "links" ? options?.links : options?.profiles;

  return <div className="min-w-0 space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">Same analytics and date filters as the user's dashboard. Admin access does not change their plan.</p>
      <button type="button" aria-expanded={editing} aria-controls="stats-adjustment-editor" disabled={busy || !options} className={`${button} shrink-0 border border-border bg-surface text-foreground`} onClick={() => setEditing(!editing)}>
        <SlidersHorizontal size={16} />{editing ? "Close editor" : "Adjust statistics"}
      </button>
    </div>
    {error && <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">{error}<button type="button" disabled={busy} className="ml-3 underline" onClick={() => { setError(""); void load().catch(e => setError(errorMessage(e))); }}>Refresh history</button></div>}
    {notice && <p role="status" className="rounded-xl border border-accent/25 bg-accent/10 p-4 text-sm text-foreground">{notice}</p>}
    {editing && <DashboardPanel id="stats-adjustment-editor" className="space-y-6 p-4 sm:p-6">
      <div><h2 className="text-xl font-semibold text-foreground">Adjust a date range</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Set the final total for completed UTC days, not an amount to add. The total is distributed across the range, informed by existing daily activity. No raw visit records are created or deleted.</p></div>
      <form onSubmit={createPreview} className="space-y-5">
        <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-2 text-sm text-foreground"><span>Metric</span><select aria-label="Metric" className={field} value={form.mode} onChange={e => update("mode", e.target.value)}><option value="links">Link clicks</option><option value="profile_views">Public Profile views</option></select></label>
          <label className="space-y-2 text-sm text-foreground"><span>Resource</span><select aria-label="Resource" className={field} value={form.resourceId} onChange={e => update("resourceId", e.target.value)}><option value="all">All {form.mode === "links" ? "links" : "profiles"}</option>{resources?.map(r => <option key={r.id} value={r.id}>{r.name} /{r.slug}</option>)}</select></label>
          <label className="space-y-2 text-sm text-foreground"><span>Final total in this range</span><input className={field} type="number" min="0" max="10000000" step="1" required value={form.total} onChange={e => update("total", e.target.value)} placeholder="12,500" /></label>
          <label className="space-y-2 text-sm text-foreground"><span>From · UTC</span><input className={field} type="date" required max={form.end} value={form.start} onChange={e => update("start", e.target.value)} /></label>
          <label className="space-y-2 text-sm text-foreground"><span>Through · UTC, inclusive</span><input className={field} type="date" required min={form.start} max={day(-1)} value={form.end} onChange={e => update("end", e.target.value)} /></label>
          <label className="space-y-2 text-sm text-foreground"><span>Unique share · %</span><input className={field} type="number" required min="75" max="85" step="0.1" value={form.uniquePercent} onChange={e => update("uniquePercent", e.target.value)} /></label>
          <label className="space-y-2 text-sm text-foreground sm:col-span-2 lg:col-span-3"><span>Geography · optional ISO country codes, strongest first</span><input className={field} value={form.countries} maxLength={50} onChange={e => update("countries", e.target.value)} placeholder="Keep existing distribution, or estimate if there is no history. Example: US, GB, DE" /></label>
          <label className="space-y-2 text-sm text-foreground sm:col-span-2 lg:col-span-3"><span>Internal reason · admin history only</span><textarea className={field} rows={2} required minLength={8} maxLength={500} value={form.reason} onChange={e => update("reason", e.target.value)} placeholder="What is being corrected, and why?" /></label>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={busy} className={`${button} bg-accent text-accent-foreground`}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}Preview adjustment</button><span className="text-xs text-muted-foreground">Nothing changes until you confirm the preview.</span></div>
      </form>
      {preview && <div className="space-y-5 border-t border-border pt-6" aria-label="Adjustment preview">
        <h3 className="text-lg font-semibold text-foreground">Preview · {preview.summary.resources} resources</h3>
        <DashboardMetricRail><DashboardMetric label="Current range total" value={preview.summary.before.toLocaleString()} /><DashboardMetric label="After adjustment" value={preview.summary.after.toLocaleString()} /><DashboardMetric label="Unique" value={preview.summary.unique.toLocaleString()} /></DashboardMetricRail>
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="h-52 min-w-0" role="img" aria-label={`Daily distribution: ${preview.summary.trend.map(p => `${p.date}: ${p.clicks}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={preview.summary.trend}>
                <CartesianGrid stroke="var(--app-grid)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={v => String(v).slice(5)} fontSize={11} stroke="var(--app-muted)" />
                <YAxis fontSize={11} width={50} allowDecimals={false} stroke="var(--app-muted)" />
                <Tooltip contentStyle={{ background: "var(--app-panel-strong)", borderColor: "var(--app-rule)", borderRadius: "var(--app-radius-control)" }} />
                <Area dataKey="clicks" stroke="var(--app-accent)" fill="var(--app-accent)" fillOpacity={0.12} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div><h4 className="mb-3 text-sm font-semibold text-foreground">Geography</h4><div className="max-h-48 space-y-2 overflow-auto">{preview.summary.countries.map(c => <div key={c.name} className="flex justify-between gap-4 text-sm"><span className="text-muted-foreground">{c.name}</span><span className="text-foreground">{c.clicks.toLocaleString()}</span></div>)}</div></div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{preview.summary.estimated ? "The hourly pattern is estimated because this scope has no traffic history. " : "The estimated hourly pattern is informed by recorded daily activity, with spikes smoothed. "}{preview.summary.geographyEstimated ? "Geography is estimated. " : "Geography follows the recorded distribution. "}Unique share is an estimate. Profile views and link clicks remain separate; existing card-attribution shares are preserved. Recent activity continues to show only recorded visits. Preview expires in 15 minutes.</p>
        <button type="button" disabled={busy} onClick={() => setConfirmation({ id: preview.id, undo: false })} className={`${button} bg-accent text-accent-foreground`}>Apply adjustment</button>
      </div>}
    </DashboardPanel>}
    <AnalyticsPage key={`${userId}:${generation}`} adminUserId={userId} adminLinks={options?.links} />
    <DashboardPanel as="details" className="p-4 sm:p-6">
      <summary className="cursor-pointer text-sm font-semibold text-foreground"><History className="mr-2 inline h-4 w-4" />Adjustment history · admin only</summary>
      {!options ? <p className="mt-4 text-sm text-muted-foreground">Loading history…</p> : !options.history.length ? <p className="mt-4 text-sm text-muted-foreground">No applied adjustments.</p> : <div className="mt-5 space-y-4">{options.history.map(item => <article key={item.id} className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
        <div className="min-w-0 space-y-1"><h3 className="text-sm font-semibold text-foreground">{item.mode === "links" ? "Link clicks" : "Profile views"}: {item.summary.before.toLocaleString()} → {item.summary.after.toLocaleString()} · {item.state}</h3><p className="text-xs text-muted-foreground">{item.start_at.slice(0,10)} — {new Date(Date.parse(item.end_at)-86400000).toISOString().slice(0,10)} UTC · {item.resource_id === "all" ? "All resources" : item.resource_id}</p><p className="break-words text-sm text-muted-foreground">{item.reason}</p><p className="break-all text-xs text-muted-foreground">By {item.actor_id} · {new Date(item.created).toLocaleString()}{item.reverted_by && ` · Undone by ${item.reverted_by}`}</p></div>
        {item.state === "applied" && <button type="button" disabled={busy} onClick={() => setConfirmation({ id: item.id, undo: true })} className={`${button} self-start border border-border text-foreground`}><Undo2 size={14} />Undo</button>}
      </article>)}</div>}
    </DashboardPanel>
    <AlertDialog open={Boolean(confirmation)} onOpenChange={open => { if (!open) setConfirmation(null); }}><AlertDialogContent className="border-border bg-surface text-foreground"><AlertDialogHeader><AlertDialogTitle>{confirmation?.undo ? "Undo this adjustment?" : "Apply this adjustment?"}</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">{confirmation?.undo ? "The adjustment will be reversed. Real traffic recorded after it will remain. The action is saved in the admin history." : "This changes the user's analytics and related counters for the selected range. The original event records are preserved, and the action can be undone from admin history."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void commit()} className="bg-accent text-accent-foreground hover:bg-accent/90">{confirmation?.undo ? "Undo adjustment" : "Confirm adjustment"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
