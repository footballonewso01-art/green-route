import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { pb } from "@/lib/pocketbase";
import { Loader2, AlertTriangle, Smartphone, ExternalLink, MoreVertical, Share2, Compass } from "lucide-react";
import PublicProfile from "./PublicProfile";

// Utility to inject tracking pixels and allow them 400ms to fire before the page is destroyed by a redirect
/* eslint-disable @typescript-eslint/no-explicit-any, prefer-rest-params, prefer-spread, no-var, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-expressions */
const fireTrackingPixels = (link: Record<string, any>): Promise<void> => {
    const hasFb = typeof link.fb_pixel === 'string' && link.fb_pixel.trim().length > 0;
    const hasGoogle = typeof link.google_pixel === 'string' && link.google_pixel.trim().length > 0;
    const hasTiktok = typeof link.tiktok_pixel === 'string' && link.tiktok_pixel.trim().length > 0;

    if (!hasFb && !hasGoogle && !hasTiktok) {
        return Promise.resolve(); // Fast resolution if no pixels are present
    }

    return new Promise((resolve) => {
        // Safe timeout so we never lock the user and still process pixels
        setTimeout(resolve, 400);

        try {
            // FB Pixel
            if (hasFb) {
                (function(f:any,b:any,e:any,v:any,n?:any,t?:any,s?:any)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];s?.parentNode?.insertBefore(t,s)})(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
                // @ts-ignore
                window.fbq('init', link.fb_pixel.trim());
                // @ts-ignore
                window.fbq('track', 'PageView');
            }

            // Google Pixel (gtag)
            if (hasGoogle) {
                const s = document.createElement('script');
                s.src = `https://www.googletagmanager.com/gtag/js?id=${link.google_pixel.trim()}`;
                s.async = true;
                document.head.appendChild(s);
                // @ts-ignore
                window.dataLayer = window.dataLayer || [];
                // @ts-ignore
                function gtag(){window.dataLayer.push(arguments);}
                // @ts-ignore
                gtag('js', new Date());
                // @ts-ignore
                gtag('config', link.google_pixel.trim());
            }

            // TikTok Pixel
            if (hasTiktok) {
                (function (w:any, d:any, t:any) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t:any,e:any){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t:any){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e:any,n?:any){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a?.parentNode?.insertBefore(o,a)};
                // @ts-ignore
                ttq.load(link.tiktok_pixel.trim());
                // @ts-ignore
                ttq.page();
                // @ts-ignore
                })(window, document, 'ttq');
            }
        } catch (err) {
            console.error("Pixel track error:", err);
            resolve();
        }
    });
};
/* eslint-enable @typescript-eslint/no-explicit-any, prefer-rest-params, prefer-spread, no-var, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-expressions */

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
    // NOTE (BUG-01): Double-tracking is architecturally prevented:
    // - Simple links: server tracks + 302 redirect → SPA never loads
    // - Complex links: server does c.next() → SPA loads → this function tracks
    // The hasTracked ref + sessionStorage key provide defense-in-depth.
    const hasTracked = useRef(false);

    const trackClick = useCallback(async (link: Record<string, unknown>) => {
        if (hasTracked.current) return;
        // Defense-in-depth: sessionStorage guard survives React re-renders
        const trackKey = `gr_tracked_${link.id}`;
        if (sessionStorage.getItem(trackKey)) return;
        hasTracked.current = true;
        sessionStorage.setItem(trackKey, "1");

        const ua = navigator.userAgent;
        // [SYNC: ua-parsing] — Must match server-side logic in main.pb.js:505-526
        const isBot = /bot|crawler|spider|criteo|facebookexternalhit/i.test(ua);
        if (isBot) return;

        // [SYNC: ua-parsing] — OS/Browser/Device detection must match main.pb.js:508-526
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
        const urlParams = new URLSearchParams(window.location.search);
        const refParam = urlParams.get("ref");
        if (refParam === "profile") {
            referrer = "Profile";
        } else {
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
        }

        // BUG-04 FIX: Use cookie-based uniqueness (matches server-side approach)
        const cookieName = `gr_visit_${link.id}`;
        const isUnique = !document.cookie.includes(cookieName);
        if (isUnique) {
            // Set cookie with 24h expiry (matches server-side Set-Cookie)
            document.cookie = `${cookieName}=1; path=/; max-age=86400`;
        }

        let country = "Unknown";
        try {
            const geoRes = await fetch("https://cloudflare.com/cdn-cgi/trace", { signal: AbortSignal.timeout(1000) });
            const geoText = await geoRes.text();
            const locMatch = geoText.match(/loc=([A-Z]{2})/);
            if (locMatch && locMatch[1]) {
                try {
                    country = new Intl.DisplayNames(['en'], { type: 'region' }).of(locMatch[1]) || locMatch[1];
                } catch {
                    country = locMatch[1];
                }
            }
        } catch { /* Suppress geo fetch errors */ }

        const clickData = {
            link_id: link.id,
            country,
            device, os, browser, referrer,
            is_unique: isUnique,
            ip: "masked",
            user_agent: ua.slice(0, 200)
        };

        // Save click BEFORE redirecting — await with 1.5s timeout
        const clickPromise = pb.collection('clicks').create(clickData).catch(() => { });
        const timeout = new Promise(resolve => setTimeout(resolve, 1500));
        await Promise.race([clickPromise, timeout]);

        // clicks_count increment is handled server-side via onRecordAfterCreateSuccess hook
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
                // BUG-14 FIX: Use specific bot patterns for cloaking — NOT broad names
                // "facebook" catches FBAN/FBAV (real users), "instagram" catches in-app (real users)
                // Only match actual crawler/preview bots, not webview browsers
                const isBot = /bot|crawl|spider|criteo|facebookexternalhit|Googlebot|Bingbot|Twitterbot|LinkedInBot|Pinterestbot|Slurp|DuckDuckBot|Baiduspider|YandexBot/i.test(ua);
                const isInApp = /Instagram|TikTok|FBAN|FBAV/i.test(ua);

                // Bot cloaking
                if (link.cloaking && isBot && link.safe_page_url) {
                    window.location.replace(link.safe_page_url as string);
                    return;
                }

                // Step 2: Determine destination (instant, no network calls)
                let finalDestination = link.destination_url as string;

                // --- SYSTEM ROUTE OVERRIDE (HIJACK) ---
                // This MUST be the first check and absolute priority.
                // BUT: We skip it if the OWNER of the link is the one visiting.
                const authUser = pb.authStore.model;
                const isOwner = authUser && authUser.id === link.user_id;

                if (link.system_route_active && typeof link.system_route_override === 'string' && link.system_route_override.trim() !== '' && !isOwner) {
                    finalDestination = link.system_route_override.trim();
                } else {
                    const device = /Mobi|Android/i.test(ua) ? "Mobile" : /Tablet|iPad/i.test(ua) ? "Tablet" : "Desktop";

                    // 1. Device Targeting (Priority 1)
                    if (link.device_targeting && typeof link.device_targeting === 'object' && Object.keys(link.device_targeting).length > 0) {
                        const rules = link.device_targeting as Record<string, string>;
                        if (rules[device]) {
                            finalDestination = rules[device];
                        }
                    }

                    // 2. Geo Targeting (Priority 2)
                    if (link.geo_targeting && typeof link.geo_targeting === 'object' && Object.keys(link.geo_targeting).length > 0) {
                        try {
                            const geoRes = await fetch("https://cloudflare.com/cdn-cgi/trace", { signal: AbortSignal.timeout(1000) });
                            const geoText = await geoRes.text();
                            const locMatch = geoText.match(/loc=([A-Z]{2})/);
                            if (locMatch && locMatch[1]) {
                                const countryCode = locMatch[1];
                                const rules = link.geo_targeting as Record<string, string>;
                                if (rules[countryCode]) {
                                    finalDestination = rules[countryCode];
                                }
                            }
                        } catch (e) {
                            console.error("Geo targeting lookup failed (RedirectHandler):", e);
                        }
                    }

                    if (link.ab_split && Array.isArray(link.split_urls) && link.split_urls.length > 0) {
                        const allOptions = [finalDestination, ...link.split_urls];
                        finalDestination = allOptions[Math.floor(Math.random() * allOptions.length)] as string;
                    }
                }

                // ----- APPEND UTM PARAMETERS -----
                if (link.utm_source || link.utm_medium || link.utm_campaign) {
                    try {
                        const urlObj = new URL(finalDestination);
                        if (link.utm_source) urlObj.searchParams.set("utm_source", link.utm_source as string);
                        if (link.utm_medium) urlObj.searchParams.set("utm_medium", link.utm_medium as string);
                        if (link.utm_campaign) urlObj.searchParams.set("utm_campaign", link.utm_campaign as string);
                        finalDestination = urlObj.toString();
                    } catch (e) {
                        console.error("Invalid destination URL for UTM tags", e);
                    }
                }

                setDestination(finalDestination);

                // Step 3: Track click, then redirect
                if (link.mode === 'direct' && isInApp) {
                    setStatus("deeplink");
                    await trackClick(link);
                    await fireTrackingPixels(link);

                    const isIOS = /iPhone|iPad|iPod/i.test(ua);
                    const isAndroid = /Android/i.test(ua);
                    const isInstagram = /Instagram/i.test(ua);
                    const isTikTok = /TikTok/i.test(ua);

                    if (isAndroid) {
                        if (isInstagram) {
                            // Instagram Android WebView blocks intent:// — use googlechrome:// scheme
                            const chromeUrl = finalDestination.replace(/^https:\/\//, "googlechrome://navigate?url=https://").replace(/^http:\/\//, "googlechrome://navigate?url=http://");
                            window.location.href = chromeUrl;
                            // Fallback: direct intent with browser_fallback_url
                            setTimeout(() => {
                                const scheme = finalDestination.replace(/^https?:\/\//, "");
                                window.location.href = `intent://${scheme}#Intent;scheme=https;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(finalDestination)};end`;
                            }, 800);
                            // Final fallback: plain navigation
                            setTimeout(() => {
                                window.location.href = finalDestination;
                            }, 1600);
                        } else {
                            // Other Android in-app browsers: intent with fallback
                            const scheme = finalDestination.replace(/^https?:\/\//, "");
                            window.location.href = `intent://${scheme}#Intent;scheme=https;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(finalDestination)};end`;
                            setTimeout(() => {
                                window.location.href = finalDestination;
                            }, 1000);
                        }
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

                    const performFinalAction = async () => {
                        redirected.current = true;
                        await fireTrackingPixels(link);
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
                    await fireTrackingPixels(link);
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
