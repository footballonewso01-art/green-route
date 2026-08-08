import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
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
import { Skeleton } from "@/components/ui/skeleton";
import { pb } from "@/lib/pocketbase";
import { maskError } from "@/lib/utils";

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  status: "active" | "revoked";
  expires_at: string;
  last_used_at: string;
  revoked_at: string;
  created: string;
  updated: string;
}

interface ApiCredentialResponse {
  data: ApiKeyItem | null;
  secret: string;
  meta: {
    enabled: boolean;
    key_limit: number;
    api_rate_limit_per_minute: number;
    api_write_rate_limit_per_minute?: number;
    api_analytics_rate_limit_per_minute?: number;
    api_write_daily_limit?: number;
    api_create_daily_limit?: number;
    scope: string;
    scopes?: string[];
    capability_upgrade_available?: boolean;
    replaced_unrecoverable_key?: boolean;
  };
  request_id: string;
}

const formatLastUsed = (value: string) => {
  if (!value) return "Not used yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not used yet";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export function ApiAccessSettings() {
  const [credential, setCredential] = useState<ApiKeyItem | null>(null);
  const [secret, setSecret] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [rateLimit, setRateLimit] = useState(0);
  const [writeRateLimit, setWriteRateLimit] = useState(0);
  const [analyticsRateLimit, setAnalyticsRateLimit] = useState(0);
  const [dailyWriteLimit, setDailyWriteLimit] = useState(0);
  const [dailyCreateLimit, setDailyCreateLimit] = useState(0);
  const [capabilityUpgradeAvailable, setCapabilityUpgradeAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const applyResponse = (response: ApiCredentialResponse) => {
    const hasAccess = response?.meta?.enabled === true;
    setEnabled(hasAccess);
    setRateLimit(Number(response?.meta?.api_rate_limit_per_minute || 0));
    setWriteRateLimit(Number(response?.meta?.api_write_rate_limit_per_minute || 0));
    setAnalyticsRateLimit(Number(response?.meta?.api_analytics_rate_limit_per_minute || 0));
    setDailyWriteLimit(Number(response?.meta?.api_write_daily_limit || 0));
    setDailyCreateLimit(Number(response?.meta?.api_create_daily_limit || 0));
    setCapabilityUpgradeAvailable(response?.meta?.capability_upgrade_available === true);

    if (!hasAccess) {
      setCredential(null);
      setSecret("");
      return;
    }
    if (!response?.data?.id || !response?.secret) {
      throw new Error("API credential response was incomplete");
    }

    setCredential(response.data);
    setSecret(response.secret);
  };

  const credentialScopes = Array.isArray(credential?.scopes) ? credential.scopes : [];
  const canWriteLinks = credentialScopes.includes("links:write");
  const canReadProfiles = credentialScopes.includes("profiles:read");
  const canReadAnalytics = credentialScopes.includes("analytics:read");

  const loadKey = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = (await pb.send("/api/developer/key", {
        method: "GET",
        requestKey: null,
      })) as ApiCredentialResponse;
      applyResponse(response);
      if (response.meta.replaced_unrecoverable_key) {
        toast.warning("Your previous beta key was replaced. Update any integration that used it.");
      }
    } catch (error) {
      console.error("API key load failed", error);
      setLoadError(maskError(error, "We couldn't load API Access."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKey();
  }, [loadKey]);

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      toast.success("API key copied");
    } catch {
      toast.error("Copy failed. Reveal the key and copy it manually.");
    }
  };

  const refreshKey = async () => {
    setRefreshing(true);
    try {
      const response = (await pb.send("/api/developer/key/refresh", {
        method: "POST",
        requestKey: null,
      })) as ApiCredentialResponse;
      applyResponse(response);
      setRevealed(true);
      setCopied(false);
      setRefreshDialogOpen(false);
      toast.success("API key refreshed. The previous key is no longer active.");
    } catch (error) {
      console.error("API key refresh failed", error);
      toast.error(maskError(error, "We couldn't refresh your API key."));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-7">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-xl font-semibold text-foreground">API Access</h2>
          <span className="rounded-md border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
            Beta
          </span>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Your account has one secure key for Linktery integrations.
        </p>
      </div>

      {loading ? (
        <div
          className="space-y-5 rounded-2xl border border-border/40 bg-surface/40 p-5 sm:p-6"
          aria-label="Loading API Access"
          role="status"
        >
          <span className="sr-only">Loading API Access</span>
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-border/50 bg-surface/40 p-5 sm:p-6" role="alert">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-background/40">
            <RotateCcw className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">API Access is unavailable right now</h3>
          <p className="mt-1.5 max-w-lg text-sm leading-6 text-muted-foreground">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadKey()}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/30 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
        </div>
      ) : !enabled ? (
        <div className="rounded-2xl border border-border/50 bg-surface/40 p-5 sm:p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/20 bg-accent/10">
            <KeyRound className="h-5 w-5 text-accent" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">API access starts with Creator Pro</h3>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted-foreground">
            Upgrade your plan to get a personal API key and connect Linktery to your own tools.
          </p>
          <Link
            to="/dashboard/pricing"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Compare plans
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      ) : credential && secret ? (
        <section
          className="overflow-hidden rounded-2xl border border-border/50 bg-surface/40"
          aria-labelledby="account-api-key"
        >
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10">
                  <KeyRound className="h-4 w-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <h3 id="account-api-key" className="truncate text-sm font-semibold text-foreground">
                    Account API key
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Ready to use</p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/20 bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Active
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <div className="flex min-h-12 min-w-0 flex-1 items-center rounded-xl border border-border/60 bg-background/40 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20">
                <input
                  id="api-key-secret"
                  type={revealed ? "text" : "password"}
                  readOnly
                  value={secret}
                  onFocus={(event) => event.currentTarget.select()}
                  autoComplete="off"
                  aria-label="API key secret"
                  className="min-w-0 flex-1 bg-transparent px-3.5 font-mono text-xs text-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={() => setRevealed((current) => !current)}
                  aria-label={revealed ? "Hide API key" : "Show API key"}
                  className="mr-1.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => void copySecret()}
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-live="polite"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy key"}
              </button>
            </div>

            <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <p>
                Keep this key private and use it only in server-side integrations. It can access only resources owned by your account.
              </p>
            </div>

            {capabilityUpgradeAvailable && (
              <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.07] px-3.5 py-3 text-xs leading-5 text-amber-100/80">
                This key does not include the latest API capabilities. Refresh it to enable Link management, Public Profile reads, and aggregated analytics.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-border/40 bg-background/20 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
              <span>Links · {canWriteLinks ? "Read + write" : "Read only"}</span>
              {canReadProfiles && <span>Public Profiles · Read</span>}
              {canReadAnalytics && (
                <span>Analytics · Read{analyticsRateLimit > 0 ? ` · ${analyticsRateLimit}/min` : ""}</span>
              )}
              <span>
                {rateLimit} reads/min{canWriteLinks && writeRateLimit > 0 ? ` · ${writeRateLimit} writes/min` : ""}
              </span>
              {canWriteLinks && dailyWriteLimit > 0 && dailyCreateLimit > 0 && (
                <span>{dailyCreateLimit} creates/day · {dailyWriteLimit} mutations/day</span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3 w-3" />
                {formatLastUsed(credential.last_used_at)}
              </span>
            </div>
            <div className="flex items-center gap-1 self-start sm:self-auto">
              <Link
                to="/documentation"
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Read docs
              </Link>
              <button
                type="button"
                onClick={() => setRefreshDialogOpen(true)}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {capabilityUpgradeAvailable ? "Enable new capabilities" : "Refresh key"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <AlertDialog open={refreshDialogOpen} onOpenChange={setRefreshDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Refresh your API key?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current key will stop working immediately. The replacement key includes the latest account API capabilities, so update every integration that uses the old key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={refreshing}>Keep current key</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void refreshKey();
              }}
              disabled={refreshing}
              className="bg-red-500 text-white hover:bg-red-500/90"
            >
              {refreshing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Refresh key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
