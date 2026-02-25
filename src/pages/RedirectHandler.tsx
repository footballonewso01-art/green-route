import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { pb } from "@/lib/pocketbase";
import { Loader2, AlertTriangle, Smartphone } from "lucide-react";

export default function RedirectHandler() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<"loading" | "verifying" | "error">("loading");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleRedirect = async () => {
            if (!slug) return;

            try {
                // 1. Fetch Link Data
                const link = await pb.collection('links').getFirstListItem(`slug="${slug}"`);

                if (!link || !link.active) {
                    setStatus("error");
                    setError("Link not found or inactive");
                    return;
                }

                const ua = navigator.userAgent;
                const isBot = /bot|crawler|spider|criteo|facebook|google|bing|twitter|linkedin|instagram|tiktok/i.test(ua);

                // 2. Early Cloaking (Bot Check)
                if (link.cloaking && isBot && link.safe_page_url) {
                    console.log("Bot detected, cloaking to safe page");
                    window.location.replace(link.safe_page_url);
                    return;
                }

                // 3. Analytics Data
                let device = "Desktop";
                if (/Mobi|Android/i.test(ua)) device = "Mobile";
                else if (/Tablet|iPad/i.test(ua)) device = "Tablet";

                let country = "Unknown";
                let countryCode = "";
                try {
                    const res = await fetch("https://ipapi.co/json/").then(r => r.json());
                    country = res.country_name || "Unknown";
                    countryCode = res.country || "";
                } catch (e) { console.error("Geo failed", e); }

                // 4. Determine Destination
                let finalDestination = link.destination_url;
                if (link.geo_targeting && countryCode && link.geo_targeting[countryCode]) {
                    finalDestination = link.geo_targeting[countryCode];
                }
                if (link.device_targeting && link.device_targeting[device]) {
                    finalDestination = link.device_targeting[device];
                }
                if (link.ab_split && Array.isArray(link.split_urls) && link.split_urls.length > 0) {
                    const allOptions = [finalDestination, ...link.split_urls];
                    finalDestination = allOptions[Math.floor(Math.random() * allOptions.length)];
                }

                // 5. Interstitial / Mobile Guard Logic
                // If mode is 'landing', we always show the interstitial.
                const needsInterstitial = link.mode === 'landing' || link.interstitial_enabled;

                if (needsInterstitial) {
                    setStatus("verifying");

                    const performFinalAction = async () => {
                        // Log click
                        await pb.collection('clicks').create({
                            link_id: link.id, country, device, ip: "masked", user_agent: ua.slice(0, 200)
                        });
                        // Increment count
                        await pb.collection('links').update(link.id, { 'clicks_count+': 1 });
                        // Redirect
                        window.location.replace(finalDestination);
                    };

                    // Auto-attach listeners for interaction
                    const interactionHandler = () => {
                        window.removeEventListener('touchstart', interactionHandler);
                        window.removeEventListener('click', interactionHandler);
                        performFinalAction();
                    };

                    window.addEventListener('touchstart', interactionHandler);
                    window.addEventListener('click', interactionHandler);

                    // Optional: Fallback timer if interaction doesn't happen (for some legit browser cases)
                    // But for strict IG/TikTok bot protection, we WANT them to interact.
                } else {
                    // Standard Fast Redirect (for 'redirect' mode or others without protection)
                    await pb.collection('clicks').create({
                        link_id: link.id, country, device, ip: "masked", user_agent: ua.slice(0, 200)
                    });
                    await pb.collection('links').update(link.id, { 'clicks_count+': 1 });
                    window.location.replace(finalDestination);
                }

            } catch (err: any) {
                console.error("Redirection error:", err);
                setStatus("error");
                setError("An error occurred during redirection");
            }
        };

        handleRedirect();
    }, [slug, navigate]);

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
                <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                <p className="text-muted-foreground text-sm animate-pulse">Loading destination...</p>
            </div>
        );
    }

    if (status === "verifying") {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full" />
                    <div className="relative w-24 h-24 rounded-3xl bg-surface border border-accent/30 flex items-center justify-center">
                        <Smartphone className="w-10 h-10 text-accent animate-bounce" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-3">Security Check</h1>
                <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
                    Please tap anywhere on the screen to confirm you are not a robot.
                </p>
                <div className="w-full max-w-xs h-1 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-accent animate-shimmer" style={{ width: '40%' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center">
            <div className="glass-card p-12 flex flex-col items-center gap-6 animate-pulse">
                <Loader2 className="w-10 h-10 animate-spin text-accent" />
                <p className="text-lg font-medium text-foreground">Redirecting you smartly...</p>
            </div>
        </div>
    );
}
