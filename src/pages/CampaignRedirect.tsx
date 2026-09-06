import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Loader2, Megaphone } from "lucide-react";
import { captureCampaignPromocode } from "@/lib/campaignOffer";
import { captureCampaignAttribution, getGrowthJourneyId } from "@/lib/telemetry";
import { useSeo } from "@/hooks/useSeo";

interface CampaignVisitResponse {
  destination_path: string;
  journey_id: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  promocode?: string;
}

const SAFE_DESTINATION = /^(?:\/|\/register|\/(?:features|guides|tools|templates|solutions|alternatives|compare)(?:\/[a-z0-9-]+)?|\/pricing|\/documentation)$/;

export default function CampaignRedirect() {
  const { trackingSlug = "" } = useParams();
  const [unavailable, setUnavailable] = useState(false);

  useSeo({ title: "Continue to Linktery", description: "Continue to Linktery.", noIndex: true });

  useEffect(() => {
    let cancelled = false;
    const slug = trackingSlug.trim().toLowerCase();
    if (!/^[a-z0-9_-]{8,40}$/.test(slug)) {
      setUnavailable(true);
      return;
    }

    const journeyId = getGrowthJourneyId();
    fetch(`/api/campaigns/visit/${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ journey_id: journeyId }),
      credentials: "omit",
    }).then(async (response) => {
      if (!response.ok) throw new Error("Campaign unavailable");
      const result = await response.json() as CampaignVisitResponse;
      if (!SAFE_DESTINATION.test(String(result.destination_path || ""))) {
        throw new Error("Unsafe campaign destination");
      }
      if (cancelled) return;
      captureCampaignAttribution({
        journeyId,
        source: result.source,
        medium: result.medium,
        campaign: result.campaign,
        content: result.content,
        landingPath: result.destination_path,
      });
      const promo = captureCampaignPromocode(result.promocode || "");
      const target = new URL(result.destination_path, window.location.origin);
      target.searchParams.set("utm_source", result.source);
      target.searchParams.set("utm_medium", result.medium);
      target.searchParams.set("utm_campaign", result.campaign);
      target.searchParams.set("utm_content", result.content);
      if (promo) target.searchParams.set("promo", promo);
      window.location.replace(`${target.pathname}${target.search}`);
    }).catch(() => {
      if (!cancelled) setUnavailable(true);
    });

    return () => { cancelled = true; };
  }, [trackingSlug]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <section className="glass-card w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
          {unavailable ? <Megaphone className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {unavailable ? "This campaign link is unavailable" : "Taking you to Linktery"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {unavailable
            ? "The campaign may have ended or the link may be mistyped. Linktery is still available directly."
            : "Your campaign offer and attribution are being preserved."}
        </p>
        {unavailable && (
          <Link to="/" className="btn-primary-glow mt-6 inline-flex min-h-11 items-center gap-2 px-5">
            Go to Linktery <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </section>
    </main>
  );
}
