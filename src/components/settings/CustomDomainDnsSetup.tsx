import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, CircleAlert, Copy, HelpCircle } from "lucide-react";
import { getDomainDnsStep, getDomainSetupState, type DomainDnsRecord } from "@/lib/customDomainSetup";
import type { CustomDomainRecord } from "@/lib/customDomains";

function DnsCell({ label, value, recordLabel }: { label: "Name" | "Value"; value: string; recordLabel: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  useEffect(() => {
    if (copyState === "idle") return;
    const timer = window.setTimeout(() => setCopyState("idle"), 2_500);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  return (
    <div className="flex min-w-0 items-start gap-2 py-2 sm:py-0">
      <div className="min-w-0 flex-1">
        <span className="block text-[10px] font-mono uppercase tracking-[0.12em] text-white/30">{label}</span>
        <code className="mt-1 block break-all text-[11px] leading-5 text-white/65">{value}</code>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={copyState === "error" ? `Copy failed. Select the ${recordLabel} ${label.toLowerCase()} manually.` : `Copy ${recordLabel} ${label.toLowerCase()}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/35 outline-none transition-colors hover:bg-white/[0.06] hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#07110d] active:bg-white/[0.08]"
      >
        {copyState === "copied" ? <Check className="h-4 w-4 text-accent" aria-hidden="true" /> : copyState === "error" ? <CircleAlert className="h-4 w-4 text-red-300" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        <span className="sr-only" aria-live="polite">{copyState === "copied" ? "Copied" : copyState === "error" ? "Copy failed. Select the value manually." : ""}</span>
      </button>
    </div>
  );
}

function DnsRecordRow({ record }: { record: DomainDnsRecord }) {
  return (
    <div className="grid min-w-0 divide-y divide-white/[0.06] border-t border-white/[0.07] px-3 first:border-t-0 sm:grid-cols-[132px_minmax(0,0.85fr)_minmax(0,1.15fr)] sm:items-center sm:divide-x sm:divide-y-0 sm:px-0">
      <div className="flex items-center justify-between gap-3 py-3 sm:block sm:px-3">
        <span className="text-xs font-medium text-white/65">{record.label}</span>
        <span className="rounded-md bg-white/[0.06] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-white/45">{record.type}</span>
      </div>
      <div className="sm:px-2"><DnsCell label="Name" value={record.name} recordLabel={record.label} /></div>
      <div className="sm:px-2"><DnsCell label="Value" value={record.value} recordLabel={record.label} /></div>
    </div>
  );
}

export function CustomDomainDnsSetup({ domain }: { domain: CustomDomainRecord }) {
  const setup = getDomainSetupState(domain);
  const dnsStep = getDomainDnsStep(domain);
  const [isOpen, setIsOpen] = useState(setup.tone !== "ready");
  const previousTone = useRef(setup.tone);
  const records = dnsStep.records;

  useEffect(() => {
    if (previousTone.current !== "ready" && setup.tone === "ready") setIsOpen(true);
    else if (previousTone.current === setup.tone) setIsOpen(setup.tone !== "ready");
    previousTone.current = setup.tone;
  }, [domain.id, setup.tone]);

  return (
    <details
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      className="group border-t border-white/[0.07] bg-black/15"
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-xs font-medium text-white/55 outline-none hover:text-white/75 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:px-5 [&::-webkit-details-marker]:hidden">
        <span>Step {dnsStep.number} of 3 · {dnsStep.title}</span>
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-white/[0.06] px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/75">{dnsStep.title}</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-white/40">{dnsStep.description}</p>
          </div>
          {records.length > 0 && <span className="shrink-0 rounded-full border border-white/[0.08] px-2.5 py-1 font-mono text-[10px] text-white/35">{records.length} {records.length === 1 ? "record" : "records"}</span>}
        </div>
        {records.length > 0 ? <div aria-label="DNS records" className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
          {records.map((record, index) => <DnsRecordRow key={`${record.type}:${record.name}:${index}`} record={record} />)}
        </div> : <div className="rounded-xl border border-accent/10 bg-accent/[0.035] px-4 py-3 text-xs leading-5 text-white/45">Linktery is preparing the secure connection. This usually completes within a few minutes.</div>}
        <details className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.015] px-3.5 py-3">
          <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 text-xs font-medium text-white/45 outline-none hover:text-white/65 focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
            <HelpCircle className="h-4 w-4" aria-hidden="true" /> Need help?
          </summary>
          <div className="mt-2 space-y-2 pl-6 text-[11px] leading-5 text-white/35">
            <p>For a root domain, your provider may show the Name as <code className="text-white/55">@</code>. For a subdomain such as links.brand.com, it may show only <code className="text-white/55">links</code>.</p>
            <p>Keep all TXT verification records after setup. They prove ownership and allow HTTPS to renew.</p>
            <p>Add the Traffic CNAME only when Linktery shows Step 3. DNS changes usually appear within minutes, but some providers can take up to 24 hours.</p>
          </div>
        </details>
      </div>
    </details>
  );
}
