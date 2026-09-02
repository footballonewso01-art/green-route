import { useMemo, useState } from "react";
import { Check, Copy, Link2, LockKeyhole } from "lucide-react";
import ToolDetailLayout from "@/components/tools/ToolDetailLayout";
import styles from "@/components/tools/ToolDetails.module.css";
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

  if (!page || page.kind !== "tool") return null;

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
    <ToolDetailLayout page={page}>
      <div className={styles.workbench} data-workbench="utm">
        <section className={styles.inputPanel} aria-labelledby="utm-input-title">
          <div className={styles.panelKicker}><span><Link2 size={16} aria-hidden="true" />Campaign recipe</span><span>Required fields are marked *</span></div>
          <h2 id="utm-input-title">Describe the traffic source.</h2>
          <p className={styles.panelIntro}>Values are normalized to lowercase and spaces become hyphens, so campaign labels stay consistent.</p>
          <div className={styles.formStack}>
            <label className={styles.field} htmlFor="utm-destination">
              <span>Destination URL</span>
              <input id="utm-destination" type="url" value={destination} onChange={(event) => setDestination(event.target.value)} />
            </label>
            <div className={styles.fieldGrid}>
              {fields.map((field) => (
                <label className={styles.field} htmlFor={field.id} key={field.id}>
                  <span>{field.label}{field.required ? " *" : ""}{!field.required && <em>Optional</em>}</span>
                  <input id={field.id} value={field.value} onChange={(event) => field.setter(event.target.value)} placeholder={field.placeholder} />
                </label>
              ))}
            </div>
          </div>
          <p className={styles.privacyNote}><LockKeyhole size={14} aria-hidden="true" />Do not put names, email addresses, tokens, or private information into UTM values. They remain visible in the URL.</p>
        </section>

        <section className={styles.outputPanel} aria-labelledby="utm-output-title">
          <div className={styles.panelKicker}><span><Check size={16} aria-hidden="true" />Live result</span><span>Updates as you type</span></div>
          <h2 id="utm-output-title">Generated campaign URL</h2>
          <p className={styles.panelIntro}>Copy this exact URL into the campaign, or use it as the destination behind a managed Linktery link.</p>
          {result.error ? (
            <div className={`${styles.urlOutput} ${styles.errorOutput}`} role="alert">{result.error}</div>
          ) : (
            <div className={styles.urlOutput}><span>Ready-to-share URL</span><code>{result.url}</code></div>
          )}
          <div className={styles.outputMeta} aria-label="Campaign parameter summary">
            <div><span>Source</span><strong>{normalizeCampaignValue(source) || "—"}</strong></div>
            <div><span>Medium</span><strong>{normalizeCampaignValue(medium) || "—"}</strong></div>
            <div><span>Campaign</span><strong>{normalizeCampaignValue(campaign) || "—"}</strong></div>
          </div>
          <button type="button" disabled={!result.url} onClick={copyResult} className={styles.toolButton}>
            {copied ? <><Check size={16} aria-hidden="true" />Copied</> : <><Copy size={16} aria-hidden="true" />Copy campaign URL</>}
          </button>
        </section>
      </div>
    </ToolDetailLayout>
  );
}
