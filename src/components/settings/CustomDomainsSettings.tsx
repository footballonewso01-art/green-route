import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  CircleAlert,
  Globe2,
  Link2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DomainTargetPicker, type DomainTargetOption } from "./DomainTargetPicker";
import { CustomDomainDnsSetup } from "./CustomDomainDnsSetup";
import {
  createCustomDomain,
  customDomainError,
  deleteCustomDomain,
  listCustomDomains,
  normalizeCustomDomainInput,
  updateCustomDomainTarget,
  verifyCustomDomain,
  type CustomDomainRecord,
  type CustomDomainTargetType,
} from "@/lib/customDomains";
import { getDomainSetupState } from "@/lib/customDomainSetup";
import { pb } from "@/lib/pocketbase";
import { maskError } from "@/lib/utils";

const statusTone = {
  ready: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  pending: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  error: "border-red-400/25 bg-red-400/10 text-red-300",
} as const;

export function CustomDomainsSettings() {
  const [domains, setDomains] = useState<CustomDomainRecord[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [entitled, setEntitled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [domainLimit, setDomainLimit] = useState(0);
  const [domainTotal, setDomainTotal] = useState(0);
  const [provisioningLimit, setProvisioningLimit] = useState(0);
  const [provisioningUsed, setProvisioningUsed] = useState(0);
  const [hostname, setHostname] = useState("");
  const [targetType, setTargetType] = useState<CustomDomainTargetType>("profile");
  const [selectedTarget, setSelectedTarget] = useState<DomainTargetOption>();
  const targetId = selectedTarget?.id || "";
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [deleteId, setDeleteId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const userId = pb.authStore.model?.id || "";
      if (!userId) throw new Error("Sign in to manage custom domains");
      const domainResponse = await listCustomDomains();
      setDomains(domainResponse.domains);
      setEnabled(domainResponse.enabled);
      setAvailable(domainResponse.available);
      setEntitled(domainResponse.entitled);
      setPage(domainResponse.page || 1);
      setHasMore(domainResponse.has_more === true);
      setDomainLimit(Number.isFinite(domainResponse.limit) ? domainResponse.limit : 0);
      setDomainTotal(Number.isFinite(domainResponse.total) ? domainResponse.total : domainResponse.domains.length);
      setProvisioningLimit(typeof domainResponse.provisioning_limit === "number" ? domainResponse.provisioning_limit : 0);
      setProvisioningUsed(typeof domainResponse.provisioning_used === "number" ? domainResponse.provisioning_used : 0);
      setLoadFailed(false);
    } catch (error) {
      setLoadFailed(true);
      toast.error(maskError(error, "Unable to load custom domains"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const chooseType = (type: CustomDomainTargetType) => {
    setTargetType(type);
    setSelectedTarget(undefined);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const result = await listCustomDomains(page + 1);
      setDomains((current) => Array.from(new Map([...current, ...result.domains].map((item) => [item.id, item])).values()));
      setPage(result.page);
      setHasMore(result.has_more);
      if (Number.isFinite(result.total)) setDomainTotal(result.total);
      if (typeof result.provisioning_limit === "number") setProvisioningLimit(result.provisioning_limit);
      if (typeof result.provisioning_used === "number") setProvisioningUsed(result.provisioning_used);
    } catch (error) { toast.error(maskError(error, "Unable to load more domains")); }
    finally { setLoadingMore(false); }
  };

  const handleCreate = async () => {
    if (creating) return;
    const normalized = normalizeCustomDomainInput(hostname);
    if (!normalized || !targetId) {
      toast.error("Enter a domain and choose what it should open.");
      return;
    }
    setCreating(true);
    try {
      const created = await createCustomDomain({ hostname: normalized, target_type: targetType, target_id: targetId });
      setDomains((current) => [created, ...current]);
      setDomainTotal((current) => current + 1);
      setHostname("");
      toast.success("Domain added. Start with the ownership record below.");
    } catch (error) {
      toast.error(customDomainError(error, "Unable to connect this domain"));
    } finally {
      setCreating(false);
    }
  };

  const handleVerify = async (id: string) => {
    setBusyId(id);
    try {
      const updated = await verifyCustomDomain(id);
      setDomains((current) => current.map((domain) => domain.id === id ? updated : domain));
      const setup = getDomainSetupState(updated);
      if (updated.status === "active") toast.success("HTTPS is ready", { description: "Add the final Traffic CNAME below." });
      else toast.message(setup.label, { description: setup.description });
      try {
        const summary = await listCustomDomains();
        setProvisioningLimit(summary.provisioning_limit || 0);
        setProvisioningUsed(summary.provisioning_used || 0);
      } catch {
        // The domain result is authoritative; usage metadata can refresh later.
      }
    } catch (error) {
      toast.error(customDomainError(error, "Unable to check this domain"));
    } finally {
      setBusyId("");
    }
  };

  const handleTargetChange = async (domain: CustomDomainRecord, value: DomainTargetOption) => {
    setBusyId(domain.id);
    try {
      const updated = await updateCustomDomainTarget(domain.id, value.type, value.id);
      setDomains((current) => current.map((item) => item.id === domain.id ? updated : item));
      toast.success("Domain destination updated");
    } catch (error) {
      toast.error(customDomainError(error, "Unable to update this destination"));
    } finally {
      setBusyId("");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setBusyId(deleteId);
    try {
      await deleteCustomDomain(deleteId);
      setDomains((current) => current.filter((domain) => domain.id !== deleteId));
      setDomainTotal((current) => Math.max(0, current - 1));
      toast.success("Domain disconnected");
      setDeleteId("");
    } catch (error) {
      toast.error(maskError(error, "Unable to disconnect this domain"));
    } finally {
      setBusyId("");
    }
  };

  if (loading) {
    return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>;
  }
  if (loadFailed) return <div role="alert" className="rounded-2xl border border-white/10 p-6"><h2 className="font-semibold">Custom Domains could not be loaded</h2><p className="mt-2 text-sm text-muted-foreground">Your domain settings have not changed.</p><Button onClick={() => void load()} className="mt-4">Try again</Button></div>;

  const atLimit = domainTotal >= domainLimit;
  const planLabel = domainLimit === 2 ? "Creator Pro" : "Agency";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-accent">
            <Globe2 className="h-3.5 w-3.5" /> Branded routing
          </div>
          <h2 className="mt-2 text-xl font-semibold text-foreground">Custom Domains</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
            Open one Link or Public Profile directly at your domain root — no /slug in the public address.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {entitled && <div className="inline-flex w-fit items-center rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">{domainTotal} / {domainLimit} domains</div>}
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 text-[11px] text-white/55">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" /> SSL managed automatically
          </div>
        </div>
      </div>

      {!available ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6">
          <ShieldCheck className="h-7 w-7 text-white/35" />
          <h3 className="mt-4 text-lg font-semibold text-white">Custom Domains are temporarily unavailable</h3>
          <p className="mt-2 max-w-lg text-sm leading-6 text-white/50">Your saved domains and Linktery URLs are safe. Domain setup will return when the routing service is ready.</p>
        </div>
      ) : !entitled ? (
        <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-accent/[0.045] p-6">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
          <Globe2 className="h-7 w-7 text-accent" />
          <h3 className="mt-4 text-lg font-semibold text-white">Available on Creator Pro and Agency</h3>
          <p className="mt-2 max-w-lg text-sm leading-6 text-white/50">Connect branded domains, issue SSL automatically, and route each domain to a Link or Public Profile.</p>
          <Button asChild className="mt-5 bg-accent text-black hover:bg-accent/90">
            <Link to="/dashboard/pricing">View paid plans <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      ) : (
        <section className="rounded-2xl border border-white/[0.08] bg-black/15 p-4 sm:p-5">
          {atLimit && <div role="status" className="mb-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.045] px-4 py-3 text-xs leading-5 text-amber-100/70">Your {planLabel} account is using all {domainLimit} custom domains. Disconnect one to connect another.</div>}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)_auto] lg:items-end">
            <label className="space-y-2">
              <span className="text-xs font-semibold text-white/70">Domain</span>
              <div className="relative">
                <Globe2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  value={hostname}
                  onChange={(event) => setHostname(event.target.value)}
                  onBlur={() => setHostname((current) => normalizeCustomDomainInput(current))}
                  onKeyDown={(event) => { if (event.key === "Enter" && targetId) void handleCreate(); }}
                  placeholder="brand.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={atLimit}
                  className="h-12 rounded-xl border-white/[0.09] bg-black/30 pl-10"
                />
              </div>
            </label>
            <div className="space-y-2">
              <span className="text-xs font-semibold text-white/70">Opens</span>
              <div className="mb-2 grid grid-cols-2 rounded-lg border border-white/[0.07] bg-black/25 p-1">
                {(["profile", "link"] as const).map((type) => (
                  <button key={type} type="button" onClick={() => chooseType(type)} className={`flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${targetType === type ? "bg-white/[0.09] text-white" : "text-white/40 hover:text-white/70"}`}>
                    {type === "profile" ? <UserRound className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                    {type === "profile" ? "Public Profile" : "Link"}
                  </button>
                ))}
              </div>
              <DomainTargetPicker value={selectedTarget} type={targetType} onChange={setSelectedTarget} disabled={atLimit} />
            </div>
            <Button onClick={() => void handleCreate()} disabled={creating || !targetId || atLimit} className="h-12 rounded-xl bg-accent px-5 font-semibold text-black hover:bg-accent/90">
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe2 className="mr-2 h-4 w-4" />} Connect domain
            </Button>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-white/35"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Want brand.com with no path? Your DNS provider must support CNAME flattening, ALIAS, or ANAME. If it does not, use a subdomain such as links.brand.com.</p>
          <p className="mt-2 text-xs leading-5 text-white/45">Changing traffic DNS replaces the website at this address. Use a separate subdomain if you want to keep your existing website.</p>
          {provisioningLimit > 0 && <p className="mt-2 text-xs leading-5 text-white/35">Verified hostname setups: {provisioningUsed} / {provisioningLimit} in the rolling 30-day window. Changing what an existing domain opens does not use another setup.</p>}
        </section>
      )}

      {domains.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.09] px-6 py-12 text-center">
          <Globe2 className="mx-auto h-7 w-7 text-white/20" />
          <p className="mt-3 text-sm font-medium text-white/55">No custom domains connected</p>
          <p className="mt-1 text-xs text-white/30">Your existing Linktery addresses remain unchanged.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => {
            const setup = getDomainSetupState(domain);
            const withinPlanLimit = domain.within_plan_limit !== false;
            const status = !available
              ? { label: "Temporarily paused", className: "border-white/10 bg-white/[0.04] text-white/45" }
              : !entitled
                ? { label: "Paid plan required", className: statusTone.pending }
                : !withinPlanLimit
                  ? { label: "Outside plan limit", className: statusTone.pending }
                  : { label: setup.label, className: statusTone[setup.tone] };
            return (
              <article key={domain.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/15">
                <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="truncate text-base font-semibold text-white">{domain.hostname}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.12em] ${status.className}`}>{status.label}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-white/45">{domain.target_type === "profile" ? "Public Profile" : "Link"}: {domain.target_name || "Connected destination"}</p>
                    <p className="mt-1 max-w-xl text-[11px] leading-5 text-white/30">{withinPlanLimit ? setup.description : "This domain is paused because the account currently has more domains than its plan allows."}</p>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2 lg:max-w-[55%]">
                    <div className="w-full min-w-0 sm:w-56"><DomainTargetPicker value={{ id: domain.target_id, type: domain.target_type, name: domain.target_name || "Connected destination" }} onChange={(value) => void handleTargetChange(domain, value)} disabled={!enabled || !withinPlanLimit || busyId === domain.id} /></div>
                    {domain.status === "active" && enabled && withinPlanLimit && <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl border-white/[0.08]"><a href={`https://${domain.hostname}`} target="_blank" rel="noreferrer" aria-label={`Open ${domain.hostname}`}><ArrowUpRight className="h-4 w-4" /></a></Button>}
                    <Button variant="outline" onClick={() => void handleVerify(domain.id)} disabled={!enabled || !withinPlanLimit || busyId === domain.id} className="h-10 rounded-xl border-white/[0.08] px-3" aria-label={`Check ${domain.hostname}`}>
                      {busyId === domain.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Check
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setDeleteId(domain.id)} disabled={busyId === domain.id} className="h-10 w-10 rounded-xl border-red-400/10 text-red-300/70 hover:bg-red-400/10 hover:text-red-200" aria-label={`Disconnect ${domain.hostname}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <CustomDomainDnsSetup domain={domain} />
              </article>
            );
          })}
        </div>
      )}
      {hasMore && <Button variant="outline" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Loading…" : "Load more domains"}</Button>}

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => { if (!open && !busyId) setDeleteId(""); }}>
        <AlertDialogContent className="border-white/[0.09] bg-[#07110d]">
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect this domain?</AlertDialogTitle>
            <AlertDialogDescription>The domain will stop opening its Linktery destination. Your Link and Public Profile will not be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busyId)}>Keep domain</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void handleDelete(); }} disabled={Boolean(busyId)} className="bg-red-500 text-white hover:bg-red-500/90">
              {busyId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
