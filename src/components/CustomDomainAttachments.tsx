import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Globe2, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  listCustomDomainsForTarget,
  type CustomDomainRecord,
  type CustomDomainTargetType,
} from "@/lib/customDomains";

interface CustomDomainAttachmentsProps {
  targetType: CustomDomainTargetType;
  targetId?: string | null;
  className?: string;
}

function getStatusLabel(domain: CustomDomainRecord): string {
  if (domain.within_plan_limit === false) return "Plan limit";
  if (domain.status === "active") return "HTTPS ready";
  if (domain.status === "failed") return "Needs attention";
  return domain.ownership_verified ? "Finishing HTTPS" : "Setup pending";
}

export function CustomDomainAttachments({
  targetType,
  targetId,
  className = "",
}: CustomDomainAttachmentsProps) {
  const [domains, setDomains] = useState<CustomDomainRecord[]>([]);

  const load = useCallback(async () => {
    if (!targetId) {
      setDomains([]);
      return;
    }

    try {
      const response = await listCustomDomainsForTarget(targetType, targetId);
      setDomains(response.domains);
    } catch {
      // This is supporting context, not a blocking editor dependency. Keep the
      // editor usable if domain status cannot be refreshed momentarily.
      setDomains([]);
    }
  }, [targetId, targetType]);

  useEffect(() => {
    void load();
    const refreshOnFocus = () => void load();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load]);

  if (!domains.length) return null;

  return (
    <section
      aria-label="Connected custom domains"
      className={`rounded-2xl border border-accent/20 bg-accent/[0.045] p-3.5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
          <Globe2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {domains.length === 1 ? "Custom domain" : "Custom domains"}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                Connected at the domain root, separately from the Linktery primary and alias /slug addresses.
              </p>
            </div>
            <Link
              to="/dashboard/settings?section=domains"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border/80 bg-background/30 px-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-accent/30 hover:text-foreground"
            >
              <Settings2 className="h-3.5 w-3.5" /> Manage
            </Link>
          </div>

          <div className="mt-3 space-y-2">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.07] bg-background/25 px-3 py-2.5"
              >
                {domain.within_plan_limit === false ? (
                  <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-muted-foreground">{domain.hostname}</span>
                ) : (
                  <a
                    href={`https://${domain.hostname}`}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-foreground transition-colors hover:text-accent"
                  >
                    {domain.hostname}
                  </a>
                )}
                <span className="shrink-0 rounded-full bg-white/[0.055] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Root URL
                </span>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${domain.within_plan_limit === false ? "bg-amber-500/10 text-amber-300" : domain.status === "active" ? "bg-accent/10 text-accent" : domain.status === "failed" ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300"}`}>
                  {getStatusLabel(domain)}
                </span>
                {domain.within_plan_limit !== false && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
