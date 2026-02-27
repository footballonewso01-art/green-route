import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { pb } from "@/lib/pocketbase";
import { Loader2, AlertTriangle, Smartphone, ExternalLink, MoreVertical, X, Share2, Compass } from "lucide-react";
import PublicProfile from "./PublicProfile";

export default function RedirectHandler() {
    const { username } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<"loading" | "verifying" | "error" | "deeplink" | "profile">("loading");
    const [error, setError] = useState<string | null>(null);
    const [linkData, setLinkData] = useState<any>(null);
    const [destination, setDestination] = useState<string>("");

    useEffect(() => {
        const handleRedirect = async () => {
            if (!username) return;

            // Handle legacy /u/ prefix if it comes through the catch-all
            if (username.startsWith("u/")) {
                const cleanSlug = username.replace("u/", "");
                navigate(`/${cleanSlug}`, { replace: true });
                return;
            }

            const effectiveSlug = username;

            try {
                // 1. Fetch Link Data
                let link = null;
                try {
                    link = await pb.collection('links').getFirstListItem(`slug="${effectiveSlug}"`);
                } catch (e) {
                    // Link not found, check for User Profile (Aesthetic URL)
                    try {
                        const userProfile = await pb.collection('users').getFirstListItem(`username="${effectiveSlug}"`);
                        if (userProfile) {
                            setStatus("profile");
                            return;
                        }
                    } catch (userErr) {
                        // Neither link nor user found
                        setStatus("error");
                        setError("Link not found or inactive");
                        return;
                    }
                }

                setLinkData(link);
                // ... (rest of useEffect logic using username instead of slug)

                if (!link || !link.active) {
                    setStatus("error");
                    setError("Link not found or inactive");
                    return;
                }

                const ua = navigator.userAgent;
                const isBot = /bot|crawler|spider|criteo|facebook|google|bing|twitter|linkedin|instagram|tiktok/i.test(ua);
                const isInstagram = /Instagram/i.test(ua);
                const isTikTok = /TikTok/i.test(ua);
                const isFacebook = /FBAN|FBAV/i.test(ua);
                const isInApp = isInstagram || isTikTok || isFacebook;

                // 2. Link Optimization (Bot Check)
                if (link.cloaking && isBot && link.safe_page_url) {
                    console.log("Bot detected, optimizing to safe page");
                    window.location.replace(link.safe_page_url);
                    return;
                }

                // 3. Analytics Data
                let os = "Other";
                if (/Windows/i.test(ua)) os = "Windows";
                else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
                else if (/Android/i.test(ua)) os = "Android";
                else if (/Macintosh/i.test(ua)) os = "macOS";
                else if (/Linux/i.test(ua)) os = "Linux";

                let browser = "Other";
                if (/Instagram/i.test(ua)) browser = "Instagram";
                else if (/TikTok/i.test(ua)) browser = "TikTok";
                else if (/FBAN|FBAV/i.test(ua)) browser = "Facebook";
                else if (/Chrome/i.test(ua)) browser = "Chrome";
                else if (/Safari/i.test(ua)) browser = "Safari";
                else if (/Firefox/i.test(ua)) browser = "Firefox";
                else if (/Edg/i.test(ua)) browser = "Edge";

                let device = "Desktop";
                if (/Mobi|Android/i.test(ua)) device = "Mobile";
                else if (/Tablet|iPad/i.test(ua)) device = "Tablet";

                let country = "Unknown";
                let countryCode = "";
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

                    const res = await fetch("https://ipapi.co/json/", { signal: controller.signal }).then(r => r.json());
                    clearTimeout(timeoutId);

                    country = res.country_name || "Unknown";
                    countryCode = res.country || "";
                } catch (e) { console.error("Geo failed or timed out", e); }

                // Referrer normalization
                let referrer = "Direct";
                const ref = document.referrer;
                if (ref) {
                    try {
                        const url = new URL(ref);
                        referrer = url.hostname;
                        if (referrer.includes("instagram.com")) referrer = "Instagram";
                        else if (referrer.includes("t.co")) referrer = "Twitter";
                        else if (referrer.includes("facebook.com")) referrer = "Facebook";
                        else if (referrer.includes("tiktok.com")) referrer = "TikTok";
                        else if (referrer.includes("google.com")) referrer = "Google";
                    } catch (e) { referrer = "Other"; }
                }

                // Uniqueness check
                const today = new Date().toISOString().split('T')[0];
                const storageKey = `gr_unique_${link.id}_${today}`;
                const isUnique = !localStorage.getItem(storageKey);
                if (isUnique) {
                    localStorage.setItem(storageKey, "1");
                }

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
                setDestination(finalDestination);

                // Log click before redirect (if not a bot)
                if (!isBot) {
                    await pb.collection('clicks').create({
                        link_id: link.id,
                        country,
                        device,
                        os,
                        browser,
                        referrer,
                        is_unique: isUnique,
                        ip: "masked",
                        user_agent: ua.slice(0, 200)
                    });
                    await pb.collection('links').update(link.id, { 'clicks_count+': 1 });
                }

                // 5. Advanced Deep Link Escape (Special mode)
                if (link.mode === 'direct' && isInApp) {
                    setStatus("deeplink");

                    // Escape Strategy for Android (Intents)
                    if (/Android/i.test(ua)) {
                        const scheme = finalDestination.replace(/^https?:\/\//, "");
                        const intentUrl = `intent://${scheme}#Intent;scheme=https;package=com.android.chrome;end`;
                        window.location.href = intentUrl;
                    }

                    // Fallback attempt for iOS/Other
                    setTimeout(() => {
                        window.location.href = finalDestination;
                    }, 500);

                    return;
                }

                // 6. Interstitial / Mobile Guard Logic
                const needsInterstitial = link.mode === 'landing' || link.interstitial_enabled;

                if (needsInterstitial) {
                    setStatus("verifying");

                    const performFinalAction = () => {
                        window.location.replace(finalDestination);
                    };

                    const interactionHandler = () => {
                        window.removeEventListener('touchstart', interactionHandler);
                        window.removeEventListener('click', interactionHandler);
                        performFinalAction();
                    };

                    window.addEventListener('touchstart', interactionHandler);
                    window.addEventListener('click', interactionHandler);
                } else {
                    // Standard Fast Redirect
                    window.location.replace(finalDestination);
                }

            } catch (err: any) {
                console.error("Redirection error:", err);
                setStatus("error");
                setError("An error occurred during redirection");
            }
        };

        handleRedirect();
    }, [username, navigate]);

    if (status === "profile") {
        return <PublicProfile />;
    }

    if (status === "loading") {
        // ... (rest of the file)
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
                <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                <p className="text-muted-foreground text-sm animate-pulse">Loading destination...</p>
            </div>
        );
    }

    if (status === "deeplink") {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <div className="relative mb-10">
                    <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full animate-pulse" />
                    <div className="relative w-28 h-28 rounded-[2.5rem] bg-surface border border-accent/30 flex items-center justify-center shadow-2xl shadow-accent/20">
                        <Compass className="w-14 h-14 text-accent animate-spin-slow" />
                    </div>
                </div>

                <div className="space-y-4 mb-10 max-w-sm">
                    <h1 className="text-3xl font-bold text-foreground">Opening Link...</h1>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        We are attempting to open this link in your system browser for a better experience.
                    </p>
                </div>

                {/* Manual Fallback Assistance */}
                <div className="w-full max-w-sm space-y-4">
                    <a
                        href={destination}
                        className="btn-primary-glow w-full flex items-center justify-center gap-2 py-4 text-lg"
                    >
                        <ExternalLink className="w-5 h-5" />
                        Open in Browser
                    </a>

                    <div className="bg-surface/50 border border-border rounded-2xl p-6 text-left space-y-4">
                        <p className="text-xs font-semibold text-accent uppercase tracking-wider">How to escape manually:</p>

                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-lg bg-background border border-border flex items-center justify-center text-xs font-bold text-foreground mt-0.5">1</div>
                            <p className="text-xs text-muted-foreground">Tap the <span className="text-foreground inline-flex items-center gap-1 bg-background px-1.5 py-0.5 rounded border border-border"><MoreVertical className="w-3 h-3" /> menu</span> in top right corner.</p>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-lg bg-background border border-border flex items-center justify-center text-xs font-bold text-foreground mt-0.5">2</div>
                            <p className="text-xs text-muted-foreground">Select <span className="text-foreground font-semibold">"Open in Browser"</span> or <span className="text-foreground font-semibold">"Open in Chrome/Safari"</span>.</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => window.location.replace(destination)}
                    className="mt-8 text-xs text-muted-foreground hover:text-accent transition-colors flex items-center gap-1.5"
                >
                    <Share2 className="w-3 h-3" />
                    Bypass escape attempt
                </button>
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
