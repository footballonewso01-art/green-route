import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

import Footer from "@/components/Footer";
import MarketingHeader from "@/components/MarketingHeader";
import { useSeo } from "@/hooks/useSeo";
import { pocketBaseUrl } from "@/lib/pocketbase";
import { SEO_PAGES } from "@/lib/seo-config";

const API_BASE_URL = `${pocketBaseUrl}/api/v1`;

const documentationSections = [
  { id: "quickstart", label: "Quickstart" },
  { id: "authentication", label: "Authentication" },
  { id: "endpoints", label: "Endpoints" },
  { id: "analytics", label: "Link analytics" },
  { id: "limits-errors", label: "Limits and errors" },
] as const;

const endpointGroups = [
  {
    title: "Links",
    description: "Read, create, and update smart links owned by your account.",
    endpoints: [
      { method: "GET", path: "/links", scope: "links:read", detail: "List your links with pagination." },
      { method: "GET", path: "/links/{id}", scope: "links:read", detail: "Retrieve one link and its current ETag." },
      { method: "POST", path: "/links", scope: "links:write", detail: "Create a link with an Idempotency-Key header." },
      { method: "PATCH", path: "/links/{id}", scope: "links:write", detail: "Update a link with its current If-Match ETag." },
    ],
  },
  {
    title: "Analytics",
    description: "Bring privacy-safe aggregate link performance into your dashboards.",
    endpoints: [
      {
        method: "GET",
        path: "/links/{id}/analytics?period=30d",
        scope: "analytics:read",
        detail: "Read summary, time series, and traffic breakdowns for one link.",
      },
    ],
  },
  {
    title: "Public Profiles",
    description: "Read your profiles and their attached links. Profile changes and file uploads are not available in API v1.",
    endpoints: [
      { method: "GET", path: "/profiles", scope: "profiles:read", detail: "List profiles owned by your account." },
      { method: "GET", path: "/profiles/{id}", scope: "profiles:read", detail: "Retrieve one owned profile." },
      {
        method: "GET",
        path: "/profiles/{id}/links",
        scope: "profiles:read + links:read",
        detail: "Read the ordered profile composition and attached links.",
      },
    ],
  },
] as const;

const listLinksExample = `curl "${API_BASE_URL}/links?page=1&per_page=25" \\
  -H "Authorization: Bearer $LINKTERY_API_KEY"`;

const analyticsExample = `curl "${API_BASE_URL}/links/LINK_ID/analytics?period=30d" \\
  -H "Authorization: Bearer $LINKTERY_API_KEY"`;

const createLinkExample = `curl -X POST "${API_BASE_URL}/links" \\
  -H "Authorization: Bearer $LINKTERY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: campaign-2026-08-03-001" \\
  --data '{
    "title": "Campaign",
    "destination_url": "https://example.com/offer",
    "domain": "linktery.com",
    "active": true
  }'`;

const updateLinkExample = `curl -X PATCH "${API_BASE_URL}/links/LINK_ID" \\
  -H "Authorization: Bearer $LINKTERY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H 'If-Match: "ltk-link-..."' \\
  --data '{
    "destination_url": "https://example.com/new-offer",
    "active": true
  }'`;

const errorExample = `{
  "error": {
    "code": "invalid_api_key",
    "message": "The API key is invalid or inactive."
  },
  "request_id": "reqA1b2C3d4"
}`;

function CopyControl({ value, label }: { value: string; label: string }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
  }, []);

  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus("copied");
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopyStatus("idle"), 1600);
    } catch {
      setCopyStatus("failed");
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopyStatus("idle"), 2200);
    }
  };

  const copied = copyStatus === "copied";
  const failed = copyStatus === "failed";

  return (
    <button
      type="button"
      onClick={() => void copyValue()}
      aria-label={copied ? `${label} copied` : failed ? `${label} failed, try again` : label}
      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
      <span className={failed ? "text-destructive" : undefined} aria-live="polite">
        {copied ? "Copied" : failed ? "Copy failed" : "Copy"}
      </span>
    </button>
  );
}

function CodeBlock({ code, label, copyLabel }: { code: string; label: string; copyLabel?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/45">
      <div className="flex items-center justify-between border-b border-border/60 px-3.5 py-2 sm:px-4">
        <span className="font-mono text-[11px] text-muted-foreground">{label}</span>
        <CopyControl value={code} label={copyLabel || `Copy ${label}`} />
      </div>
      <pre className="no-scrollbar overflow-x-auto p-4 text-[12px] leading-6 text-foreground sm:p-5 sm:text-[13px]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SectionHeading({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <header id={id} className="scroll-mt-28">
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">{children}</p>
    </header>
  );
}

export default function DocumentationPage() {
  useSeo(SEO_PAGES.documentation);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader current="documentation" />

      <main className="mx-auto max-w-7xl px-5 pb-24 pt-28 sm:px-6 lg:pt-32">
        <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14 xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-20">
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <p className="text-sm font-semibold text-foreground">Documentation</p>
              <nav className="mt-4" aria-label="Documentation sections">
                <ul className="space-y-1">
                  {documentationSections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {section.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>

          <article className="min-w-0 max-w-4xl">
            <section aria-labelledby="documentation-title">
              <div className="inline-flex items-center rounded-md border border-accent/25 bg-accent/10 px-2.5 py-1 font-mono text-xs font-semibold text-accent">
                API v1
              </div>
              <h1 id="documentation-title" className="mt-5 max-w-3xl text-4xl font-extrabold tracking-[-0.035em] text-foreground sm:text-5xl">
                Linktery API documentation
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Create smart links, read Public Profiles, and bring aggregate link analytics into your own dashboards.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/dashboard/settings?section=api"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <KeyRound className="h-4 w-4" />
                  Open API Access
                </Link>
                <a
                  href="#quickstart"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-surface/60 px-4 text-sm font-semibold text-foreground transition-colors hover:border-accent/30 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Quickstart
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </section>

            <details className="group mt-9 border-y border-border/60 lg:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground outline-none [&::-webkit-details-marker]:hidden">
                On this page
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <nav className="border-t border-border/60 py-2" aria-label="On this page">
                <ul className="grid grid-cols-2 gap-1 pb-2">
                  {documentationSections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {section.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </details>

            <section className="mt-12 border-t border-border/60 pt-10 sm:mt-14 sm:pt-12">
              <SectionHeading id="quickstart" title="Quickstart">
                Make your first owner-scoped request with the API key from Settings.
              </SectionHeading>

              <div className="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-surface/30">
                <ol className="divide-y divide-border/60">
                  {[
                    ["Get your key", "Open Settings, choose API Access, then reveal and copy your account key."],
                    ["Store it safely", "Save it as a server environment variable named LINKTERY_API_KEY."],
                    ["Send a request", "Pass the key in the Authorization header. Query parameters are not accepted."],
                  ].map(([title, detail], index) => (
                    <li key={title} className="flex gap-4 px-4 py-4 sm:px-5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 font-mono text-xs font-bold text-accent">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-6">
                <CodeBlock code={listLinksExample} label="cURL" copyLabel="Copy list links request" />
              </div>

              <div className="mt-5 flex flex-col gap-2 rounded-xl border border-border/70 bg-surface/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">API base URL</p>
                  <code className="mt-1 block overflow-x-auto whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
                    {API_BASE_URL}
                  </code>
                </div>
                <CopyControl value={API_BASE_URL} label="Copy API base URL" />
              </div>
            </section>

            <section className="mt-14 border-t border-border/60 pt-12">
              <SectionHeading id="authentication" title="Authentication">
                Every request uses your single account API key as a Bearer token.
              </SectionHeading>

              <div className="mt-6 rounded-2xl border border-border/70 bg-surface/30 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10">
                    <LockKeyhole className="h-4 w-4 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">Authorization header</h3>
                    <code className="mt-2 block overflow-x-auto whitespace-nowrap rounded-lg bg-background/60 px-3 py-2.5 text-xs text-foreground sm:text-sm">
                      Authorization: Bearer ltk_live_...
                    </code>
                  </div>
                </div>
                <div className="mt-5 flex gap-2.5 border-t border-border/60 pt-4 text-sm leading-6 text-muted-foreground">
                  <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-accent" />
                  <p>
                    Keep the key in server-side code only. Never place it in browser JavaScript, a mobile bundle, a public repository, or a URL.
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                Refreshing the key in API Access revokes the previous key immediately. Existing keys are never silently granted new scopes, so refresh an older key to enable the latest capabilities.
              </p>
            </section>

            <section className="mt-14 border-t border-border/60 pt-12">
              <SectionHeading id="endpoints" title="Endpoints">
                All resources are filtered to the account that owns the API key. Another account's resource returns the same 404 as a missing resource.
              </SectionHeading>

              <div className="mt-7 space-y-8">
                {endpointGroups.map((group) => (
                  <section key={group.title} aria-labelledby={`endpoint-${group.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    <div>
                      <h3 id={`endpoint-${group.title.toLowerCase().replace(/\s+/g, "-")}`} className="text-lg font-semibold text-foreground">
                        {group.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{group.description}</p>
                    </div>
                    <div className="mt-3 overflow-hidden rounded-2xl border border-border/70 bg-surface/20">
                      <ul className="divide-y divide-border/60">
                        {group.endpoints.map((endpoint) => (
                          <li key={`${endpoint.method}-${endpoint.path}`} className="p-4 sm:p-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span className="rounded-md border border-accent/25 bg-accent/10 px-2 py-1 font-mono text-[10px] font-bold text-accent">
                                    {endpoint.method}
                                  </span>
                                  <code className="min-w-0 overflow-x-auto whitespace-nowrap text-xs text-foreground sm:text-sm">
                                    {endpoint.path}
                                  </code>
                                </div>
                                <p className="mt-2.5 text-sm leading-6 text-muted-foreground">{endpoint.detail}</p>
                              </div>
                              <code className="w-fit shrink-0 rounded-md bg-background/60 px-2 py-1 text-[10px] text-muted-foreground">
                                {endpoint.scope}
                              </code>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                ))}
              </div>

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-surface/30 p-5">
                  <h3 className="text-sm font-semibold text-foreground">Safe retries</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    POST requires an Idempotency-Key. Reusing it with the same payload returns the original result without creating another link.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-surface/30 p-5">
                  <h3 className="text-sm font-semibold text-foreground">Safe updates</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    GET returns an ETag. Send that value in If-Match when using PATCH so concurrent edits cannot overwrite each other silently.
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-foreground">Create a link</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Creator Pro receives a generated slug. Agency can also send a custom <code className="text-foreground">slug</code>.
                </p>
                <div className="mt-4">
                  <CodeBlock code={createLinkExample} label="Create a link" />
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Create and update accept only <code className="text-foreground">title</code>, <code className="text-foreground">destination_url</code>, <code className="text-foreground">domain</code>, <code className="text-foreground">active</code>, and the Agency-only <code className="text-foreground">slug</code>. Another Linktery short URL cannot be used as the destination.
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Supported Linktery domains are <code className="text-foreground">linktery.com</code>, <code className="text-foreground">linktery.bio</code>, <code className="text-foreground">hotme.online</code>, and <code className="text-foreground">hotmylinks.cc</code>.
                </p>
              </div>

              <details className="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-surface/20">
                <summary className="cursor-pointer px-4 py-4 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-surface/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:px-5">
                  Update a link safely
                </summary>
                <div className="border-t border-border/60 p-4 sm:p-5">
                  <p className="mb-4 text-sm leading-6 text-muted-foreground">
                    Read the link first, copy its ETag, then pass that value in <code className="text-foreground">If-Match</code>. To disable a link, update <code className="text-foreground">active</code> to <code className="text-foreground">false</code>. Permanent deletion is not exposed in API v1.
                  </p>
                  <CodeBlock code={updateLinkExample} label="Update a link" />
                </div>
              </details>

              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                List endpoints accept <code className="text-foreground">page</code> and <code className="text-foreground">per_page</code>. The maximum page size is 100 records.
              </p>
            </section>

            <section className="mt-14 border-t border-border/60 pt-12">
              <SectionHeading id="analytics" title="Link analytics">
                Use aggregate analytics to power a custom dashboard without exposing individual visitor records.
              </SectionHeading>

              <div className="mt-6">
                <CodeBlock code={analyticsExample} label="cURL" copyLabel="Copy analytics request" />
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)]">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Available periods</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["24h", "7d", "30d", "90d"].map((period) => (
                      <code key={period} className="rounded-lg border border-border/70 bg-surface/40 px-2.5 py-1.5 text-xs text-foreground">
                        {period}
                      </code>
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    Responses include total and unique clicks, a complete UTC time series, and breakdowns for country, referrer, device, browser, and operating system.
                  </p>
                </div>
                <div className="rounded-2xl border border-accent/20 bg-accent/[0.06] p-5">
                  <h3 className="text-sm font-semibold text-foreground">Privacy boundary</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    The endpoint never returns raw click rows, IP addresses, User-Agent strings, or visitor identifiers.
                  </p>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Results are cached for 30 seconds. Refresh custom dashboards every 30-60 seconds.
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-14 border-t border-border/60 pt-12">
              <SectionHeading id="limits-errors" title="Limits and errors">
                Creator Pro and Agency use the same API surface with different rate and daily safety limits.
              </SectionHeading>

              <div className="no-scrollbar mt-6 overflow-x-auto rounded-2xl border border-border/70">
                <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                  <caption className="sr-only">Linktery API limits by plan</caption>
                  <thead className="bg-surface/50 text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Reads</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Writes</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Analytics</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Daily safety</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 bg-surface/20 text-foreground">
                    <tr>
                      <th scope="row" className="whitespace-nowrap px-4 py-3.5 font-semibold">Creator</th>
                      <td className="px-4 py-3.5 text-muted-foreground" colSpan={4}>API access is not included</td>
                    </tr>
                    <tr>
                      <th scope="row" className="whitespace-nowrap px-4 py-3.5 font-semibold">Creator Pro</th>
                      <td className="whitespace-nowrap px-4 py-3.5">60/min</td>
                      <td className="whitespace-nowrap px-4 py-3.5">15/min</td>
                      <td className="whitespace-nowrap px-4 py-3.5">20/min</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">100 creates, 1,000 mutations</td>
                    </tr>
                    <tr>
                      <th scope="row" className="whitespace-nowrap px-4 py-3.5 font-semibold">Agency</th>
                      <td className="whitespace-nowrap px-4 py-3.5">300/min</td>
                      <td className="whitespace-nowrap px-4 py-3.5">60/min</td>
                      <td className="whitespace-nowrap px-4 py-3.5">60/min</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">2,000 creates, 10,000 mutations</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-8 grid gap-7 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Common responses</h3>
                  <dl className="mt-3 space-y-3 text-sm">
                    {[
                      ["401", "The API key is missing, invalid, or revoked."],
                      ["403", "The key lacks the required scope or plan capability."],
                      ["404", "The resource is missing or belongs to another account."],
                      ["409 / 412", "An idempotency or concurrent update conflict occurred."],
                      ["429", "A rate or daily safety limit has been reached."],
                    ].map(([status, description]) => (
                      <div key={status} className="grid grid-cols-[70px_minmax(0,1fr)] gap-3">
                        <dt><code className="text-xs font-semibold text-accent">{status}</code></dt>
                        <dd className="leading-6 text-muted-foreground">{description}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <CodeBlock code={errorExample} label="Error response" />
              </div>

              <p className="mt-6 text-sm leading-6 text-muted-foreground">
                Keep the returned <code className="text-foreground">request_id</code> when troubleshooting. A 429 response also includes <code className="text-foreground">Retry-After</code> and rate-limit headers.
              </p>
            </section>

          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
