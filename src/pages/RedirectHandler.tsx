import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { pb } from "@/lib/pocketbase";
import { Loader2, AlertTriangle, Smartphone, ExternalLink, MoreVertical, Share2, Compass } from "lucide-react";
import PublicProfile from "./PublicProfile";

/**
 * RedirectHandler — Ultra-fast redirect engine.
 *
 * Principles:
 * 1. REDIRECT FIRST, TRACK LATER — Never block the redirect on analytics.
 * 2. FIRE-AND-FORGET ANALYTICS — Geo lookup + click logging run in parallel, non-blocking.
 * 3. BFCACHE AWARE — Handle browser Back/Forward cache restoration.
 * 4. HISTORY CLEAN — Use `window.location.replace()` to keep history stack clean.
 */
export default function RedirectHandler() {
    const { username } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<"loading" | "verifying" | "error" | "deeplink" | "profile">("loading");
    const [error, setError] = useState<string | null>(null);
    const [destination, setDestination] = useState<string>("");
    const redirected = useRef(false);

    // ── bfcache handler: if the page is restored from cache, re-resolve ──
    useEffect(() => {
        const handlePageShow = (e: PageTransitionEvent) => {
            if (e.persisted) {
                // Page was restored from bfcache after user hit Back
                // Reset everything and re-resolve
                redirected.current = false;
                setStatus("loading");
            }
        };
        window.addEventListener("pageshow", handlePageShow);
        return () => window.removeEventListener("pageshow", handlePageShow);
    }, []);

    // ── Track click — returns a promise that resolves when the click is saved ──
    const trackClick = useCallback(async (link: Record<string, unknown>) => {
        const ua = navigator.userAgent;
        const isBot = /bot|crawler|spider|criteo|facebookexternalhit/i.test(ua);
        if (isBot) return;

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
            } catch { referrer = "Other"; }
        }

        const today = new Date().toISOString().split('T')[0];
        const storageKey = `gr_unique_${link.id}_${today}`;
        const isUnique = !localStorage.getItem(storageKey);
        if (isUnique) localStorage.setItem(storageKey, "1");

        const clickData = {
            link_id: link.id,
            country: "Unknown",
            device, os, browser, referrer,
            is_unique: isUnique,
            ip: "masked",
            user_agent: ua.slice(0, 200)
        };

        // Save click BEFORE redirecting — await with 1.5s timeout
        const clickPromise = pb.collection('clicks').create(clickData).catch(() => { });
        const timeout = new Promise(resolve => setTimeout(resolve, 1500));
        await Promise.race([clickPromise, timeout]);

        // Increment click count (fire-and-forget)
        pb.collection('links').update(link.id as string, { 'clicks_count+': 1 }).catch(() => { });
    }, []);

    // ── Main redirect logic ──
    useEffect(() => {
        if (status !== "loading") return;

        const handleRedirect = async () => {
            if (!username) return;
            if (redirected.current) return;

            if (username.startsWith("u/")) {
                navigate(`/${username.replace("u/", "")}`, { replace: true });
                return;
            }

            try {
                // Step 1: PARALLEL resolution — link AND user at once (halves latency)
                const [linkResult, userResult] = await Promise.allSettled([
                    pb.collection('links').getFirstListItem(`slug="${username}"`),
                    pb.collection('users').getFirstListItem(`username="${username}"`)
                ]);

                const link = linkResult.status === 'fulfilled' ? linkResult.value : null;
                const userProfile = userResult.status === 'fulfilled' ? userResult.value : null;

                // Profile takes priority if no active link found
                if (!link && userProfile) {
                    setStatus("profile");
                    return;
                }

                if (!link && !userProfile) {
                    setStatus("error");
                    setError("Link not found or inactive");
                    return;
                }

                if (!link || !link.active) {
                    setStatus("error");
                    setError("Link not found or inactive");
                    return;
                }

                // Check scheduling
                const now = new Date();
                if (link.start_at && new Date(link.start_at as string) > now) {
                    setStatus("error");
                    setError("This link is not yet active");
                    return;
                }
                if (link.expire_at && new Date(link.expire_at as string) < now) {
                    setStatus("error");
                    setError("This link has expired");
                    return;
                }

                const ua = navigator.userAgent;
                const isBot = /bot|crawler|spider|criteo|facebook|google|bing|twitter|linkedin|instagram|tiktok/i.test(ua);
                const isInApp = /Instagram|TikTok|FBAN|FBAV/i.test(ua);

                // Bot cloaking
                if (link.cloaking && isBot && link.safe_page_url) {
                    window.location.replace(link.safe_page_url as string);
                    return;
                }

                // Step 2: Determine destination (instant, no network calls)
                let finalDestination = link.destination_url as string;
                const device = /Mobi|Android/i.test(ua) ? "Mobile" : /Tablet|iPad/i.test(ua) ? "Tablet" : "Desktop";

                if (link.device_targeting && (link.device_targeting as Record<string, string>)[device]) {
                    finalDestination = (link.device_targeting as Record<string, string>)[device];
                }
                if (link.ab_split && Array.isArray(link.split_urls) && link.split_urls.length > 0) {
                    const allOptions = [finalDestination, ...link.split_urls];
                    finalDestination = allOptions[Math.floor(Math.random() * allOptions.length)] as string;
                }

                setDestination(finalDestination);

                // Step 3: Track click, then redirect
                if (link.mode === 'direct' && isInApp) {
                    setStatus("deeplink");
                    await trackClick(link);

                    const isIOS = /iPhone|iPad|iPod/i.test(ua);
                    const isAndroid = /Android/i.test(ua);
                    const isInstagram = /Instagram/i.test(ua);
                    const isTikTok = /TikTok/i.test(ua);

                    if (isAndroid) {
                        // Android: Use intent:// to open in default browser (not just Chrome)
                        const scheme = finalDestination.replace(/^https?:\/\//, "");
                        window.location.href = `intent://${scheme}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
                        // Fallback after 1s if intent didn't work
                        setTimeout(() => {
                            window.location.href = finalDestination;
                        }, 1000);
                    } else if (isIOS) {
                        if (isInstagram || isTikTok) {
                            // iOS Instagram/TikTok: Use x-safari-https:// scheme to force Safari
                            const safariUrl = finalDestination.replace(/^https:\/\//, "x-safari-https://").replace(/^http:\/\//, "x-safari-http://");
                            window.location.href = safariUrl;
                            // Fallback 1: Try Google Chrome on iOS
                            setTimeout(() => {
                                const chromeUrl = finalDestination.replace(/^https:\/\//, "googlechromes://").replace(/^http:\/\//, "googlechrome://");
                                window.location.href = chromeUrl;
                            }, 600);
                            // Fallback 2: Direct navigation if nothing else worked
                            setTimeout(() => {
                                window.location.href = finalDestination;
                            }, 1200);
                        } else {
                            // Other iOS in-app browsers: just navigate directly
                            window.location.href = finalDestination;
                        }
                    } else {
                        // Desktop or unknown: just redirect
                        window.location.href = finalDestination;
                    }
                    return;
                }

                const needsInterstitial = link.mode === 'landing' || link.interstitial_enabled;

                if (needsInterstitial) {
                    setStatus("verifying");
                    await trackClick(link);

                    const performFinalAction = () => {
                        redirected.current = true;
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
                    // Track click FIRST, then redirect
                    redirected.current = true;
                    await trackClick(link);
                    window.location.replace(finalDestination);
                }

            } catch (err: unknown) {
                console.error("Redirection error:", err);
                setStatus("error");
                setError("An error occurred during redirection");
            }
        };

        handleRedirect();
    }, [username, navigate, status, trackClick]);

    if (status === "profile") {
        return <PublicProfile />;
    }

    if (status === "loading") {
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

                <div className="w-full max-w-sm space-y-4">
                    <a
                        href={destination}
                        className="btn-primary-glow w-full flex items-center justify-center gap-2 py-4 text-lg"
                    >
                        <ExternalLink className="w-5 h-5" />
                        Open in Browser
                    </a>

                    <div className="bg-surface/50 border border-border rounded-2xl p-6 text-left space-y-4">
                        <p className="text-xs font-semibold text-accent uppercase tracking-wider">How to open manually:</p>
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
                    Skip optimization
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

    if (status === "error") {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
                    <div className="relative w-24 h-24 rounded-3xl bg-surface border border-red-500/30 flex items-center justify-center">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-3">Link Not Found</h1>
                <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
                    {error || "The link you're looking for doesn't exist or is no longer active."}
                </p>
                <a
                    href="/"
                    className="px-6 py-3 bg-accent text-black font-bold rounded-xl text-sm uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    Go to Homepage
                </a>
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
