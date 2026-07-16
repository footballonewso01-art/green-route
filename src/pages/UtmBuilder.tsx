import { useMemo, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import SeoResourceLayout from "@/components/SeoResourceLayout";
import { getSeoContentPage } from "@/lib/seoContent";

const page = getSeoContentPage("/tools/utm-builder");

const normalizeCampaignValue = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/\s+/g, "-")
  .replace(/[^a-z0-9._~-]/g, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "");

export default function UtmBuilder() {
  const [destination, setDestination] = useState("https://example.com/landing-page");
  const [source, setSource] = useState("instagram");
  const [medium, setMedium] = useState("social");
  const [campaign, setCampaign] = useState("summer-launch");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    try {
      const url = new URL(destination);
      if (!/^https?:$/.test(url.protocol)) throw new Error("unsupported protocol");
      const required = [source, medium, campaign].map(normalizeCampaignValue);
      if (required.some((value) => !value)) return { url: "", error: "Source, medium, and campaign are required." };

      url.searchParams.set("utm_source", required[0]);
      url.searchParams.set("utm_medium", required[1]);
      url.searchParams.set("utm_campaign", required[2]);
      const normalizedTerm = normalizeCampaignValue(term);
      const normalizedContent = normalizeCampaignValue(content);
      if (normalizedTerm) url.searchParams.set("utm_term", normalizedTerm);
      else url.searchParams.delete("utm_term");
      if (normalizedContent) url.searchParams.set("utm_content", normalizedContent);
      else url.searchParams.delete("utm_content");
      return { url: url.toString(), error: "" };
    } catch {
      return { url: "", error: "Enter a complete http:// or https:// destination URL." };
    }
  }, [campaign, content, destination, medium, source, term]);

  if (!page) return null;

  const copyResult = async () => {
    if (!result.url || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const fields = [
    { id: "utm-source", label: "Campaign source", value: source, setter: setSource, placeholder: "instagram", required: true },
    { id: "utm-medium", label: "Campaign medium", value: medium, setter: setMedium, placeholder: "social", required: true },
    { id: "utm-campaign", label: "Campaign name", value: campaign, setter: setCampaign, placeholder: "summer-launch", required: true },
    { id: "utm-term", label: "Campaign term", value: term, setter: setTerm, placeholder: "optional-keyword", required: false },
    { id: "utm-content", label: "Campaign content", value: content, setter: setContent, placeholder: "hero-button", required: false },
  ];

  return (
    <SeoResourceLayout page={page}>
      <section className="border-b border-border/60 px-5 py-14 sm:px-6 sm:py-18">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-border bg-card/60 p-5 sm:p-8">
            <h2 className="text-2xl font-extrabold">Campaign details</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Values are normalized to lowercase and spaces become hyphens.</p>
            <div className="mt-7 space-y-5">
              <label className="block" htmlFor="utm-destination">
                <span className="mb-2 block text-sm font-bold">Destination URL</span>
                <input id="utm-destination" type="url" value={destination} onChange={(event) => setDestination(event.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-accent" />
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                {fields.map((field) => (
                  <label className="block" htmlFor={field.id} key={field.id}>
                    <span className="mb-2 block text-sm font-bold">{field.label}{field.required ? " *" : ""}</span>
                    <input id={field.id} value={field.value} onChange={(event) => field.setter(event.target.value)} placeholder={field.placeholder} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-accent" />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-accent/25 bg-accent/[0.04] p-5 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent"><Link2 className="h-5 w-5" /></div>
              <div><h2 className="text-xl font-extrabold">Generated campaign URL</h2><p className="text-xs text-muted-foreground">Generated locally in this browser</p></div>
            </div>
            {result.error ? (
              <div className="mt-7 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{result.error}</div>
            ) : (
              <div className="mt-7 break-all rounded-xl border border-border bg-background p-4 font-mono text-xs leading-6 text-foreground">{result.url}</div>
            )}
            <button type="button" disabled={!result.url} onClick={copyResult} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-bold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50">
              {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy campaign URL</>}
            </button>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">Do not put names, email addresses, tokens, or private information into UTM values. They remain visible in the URL.</p>
          </div>
        </div>
      </section>
    </SeoResourceLayout>
  );
}
