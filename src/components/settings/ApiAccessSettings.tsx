import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
  SquareTerminal,
  Trash2,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface ApiKeysResponse {
  data: ApiKeyItem[];
  meta: {
    max_active_keys: number;
    api_rate_limit_per_minute: number;
    request_id: string;
  };
}

interface CreatedApiKeyResponse {
  secret: string;
  data: ApiKeyItem;
  request_id: string;
}

const formatDate = (value: string) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

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
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [maxActiveKeys, setMaxActiveKeys] = useState(0);
  const [rateLimit, setRateLimit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [name, setName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(90);
  const [createdSecret, setCreatedSecret] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyItem | null>(null);

  const apiBaseUrl = useMemo(
    () => `${pb.baseURL.replace(/\/$/, "")}/api/v1`,
    [],
  );
  const activeKeys = keys.filter((key) => key.status === "active");
  const canCreate = maxActiveKeys > 0 && activeKeys.length < maxActiveKeys;

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const response = (await pb.send("/api/developer/keys", {
        method: "GET",
        requestKey: null,
      })) as ApiKeysResponse;
      setKeys(response.data || []);
      setMaxActiveKeys(Number(response.meta?.max_active_keys || 0));
      setRateLimit(Number(response.meta?.api_rate_limit_per_minute || 0));
    } catch (error) {
      toast.error(maskError(error, "We couldn't load your API keys."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const createKey = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error("Give this key a name so you can recognize it later.");
      return;
    }

    setCreating(true);
    try {
      const response = (await pb.send("/api/developer/keys", {
        method: "POST",
        body: {
          name: cleanName,
          scopes: "links:read",
          expires_in_days: expiresInDays,
        },
        requestKey: null,
      })) as CreatedApiKeyResponse;
      setCreatedSecret(response.secret);
      setCopiedSecret(false);
      setName("");
      await loadKeys();
      toast.success("API key created");
    } catch (error) {
      toast.error(maskError(error, "We couldn't create this API key."));
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await pb.send(`/api/developer/keys/${revokeTarget.id}`, {
        method: "DELETE",
        requestKey: null,
      });
      setRevokeTarget(null);
      await loadKeys();
      toast.success("API key revoked");
    } catch (error) {
      toast.error(maskError(error, "We couldn't revoke this API key."));
    } finally {
      setRevoking(false);
    }
  };

  const copy = async (value: string, secret = false) => {
    try {
      await navigator.clipboard.writeText(value);
      if (secret) {
        setCopiedSecret(true);
        window.setTimeout(() => setCopiedSecret(false), 1800);
      }
      toast.success("Copied");
    } catch {
      toast.error("Copy failed. Select the value and copy it manually.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-semibold text-foreground">API Access</h2>
            <span className="rounded-md border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
              Beta
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Read your Linktery links securely from your own tools and workflows.
          </p>
        </div>
        {maxActiveKeys > 0 && (
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border/50 bg-surface/50 px-3 py-2">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <span className="text-xs font-medium text-muted-foreground">
              {rateLimit} requests / minute
            </span>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/50 bg-[#07100c]">
        <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-accent/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="ml-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">
            Base URL
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-3 px-4 py-4">
          <SquareTerminal className="h-4 w-4 shrink-0 text-accent" />
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-white/75 sm:text-sm">
            {apiBaseUrl}
          </code>
          <button
            type="button"
            onClick={() => void copy(apiBaseUrl)}
            aria-label="Copy API base URL"
            className="rounded-lg border border-white/10 p-2 text-white/45 transition-colors hover:border-accent/30 hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-border/40 bg-surface/30">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </div>
      ) : maxActiveKeys < 1 ? (
        <div className="rounded-2xl border border-border/50 bg-surface/35 p-6">
          <div className="flex max-w-xl flex-col items-start">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-accent/20 bg-accent/10">
              <KeyRound className="h-5 w-5 text-accent" />
            </div>
            <h3 className="text-base font-semibold text-foreground">API access starts with Creator Pro</h3>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              Upgrade to create a scoped API key. Pro includes one key and 60 requests per minute;
              Agency includes five keys and higher throughput.
            </p>
            <Link
              to="/dashboard/pricing"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Compare plans
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">
                  Create a key
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeKeys.length} of {maxActiveKeys} active keys
                </p>
              </div>
              <span className="text-xs text-muted-foreground">Scope: Links · Read</span>
            </div>

            <div className="grid gap-3 rounded-2xl border border-border/40 bg-surface/40 p-4 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-end">
              <label className="space-y-1.5">
                <span className="block text-xs font-medium text-muted-foreground">Key name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value.slice(0, 64))}
                  maxLength={64}
                  placeholder="Production dashboard"
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent/50"
                />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-medium text-muted-foreground">Expires after</span>
                <select
                  value={expiresInDays}
                  onChange={(event) => setExpiresInDays(Number(event.target.value))}
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent/50"
                >
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>180 days</option>
                  <option value={365}>1 year</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void createKey()}
                disabled={!canCreate || creating}
                className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create key
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">Your keys</h3>
            {keys.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 px-5 py-10 text-center">
                <KeyRound className="mx-auto h-5 w-5 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium text-foreground">No API keys yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Create one above when your integration is ready.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30 overflow-hidden rounded-2xl border border-border/40 bg-surface/35">
                {keys.map((key) => {
                  const isActive = key.status === "active";
                  return (
                    <div key={key.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                        isActive
                          ? "border-accent/20 bg-accent/10 text-accent"
                          : "border-border/50 bg-background/30 text-muted-foreground"
                      }`}>
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{key.name}</p>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isActive
                              ? "bg-accent/10 text-accent"
                              : "bg-foreground/5 text-muted-foreground"
                          }`}>
                            {key.status}
                          </span>
                        </div>
                        <code className="mt-1 block truncate font-mono text-xs text-muted-foreground">
                          {key.prefix}••••••••
                        </code>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground/75">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-3 w-3" />
                            Last used {formatLastUsed(key.last_used_at)}
                          </span>
                          <span>Expires {formatDate(key.expires_at)}</span>
                        </div>
                      </div>
                      {isActive && (
                        <button
                          type="button"
                          onClick={() => setRevokeTarget(key)}
                          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 sm:self-auto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Revoke
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <Dialog
        open={Boolean(createdSecret)}
        onOpenChange={(open) => {
          if (!open) setCreatedSecret("");
        }}
      >
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-lg rounded-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle>Copy your API key now</DialogTitle>
            <DialogDescription>
              Linktery stores only a secure hash. This secret cannot be shown again after you close this window.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 rounded-xl border border-accent/20 bg-[#07100c] p-3">
            <code className="block break-all font-mono text-xs leading-5 text-white/80">{createdSecret}</code>
          </div>
          <button
            type="button"
            onClick={() => void copy(createdSecret, true)}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
          >
            {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedSecret ? "Copied" : "Copy secret key"}
          </button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(revokeTarget)} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke {revokeTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Requests using this key will stop working immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Keep key</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void revokeKey();
              }}
              disabled={revoking}
              className="bg-red-500 text-white hover:bg-red-500/90"
            >
              {revoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revoke key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
