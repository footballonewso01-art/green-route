import { useEffect, useState, useRef, useCallback, lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { pb } from "@/lib/pocketbase";
import { Loader2, AlertTriangle, Smartphone, ExternalLink, MoreVertical, Share2, Compass, Lock } from "lucide-react";
import { DEFAULT_AVAILABLE_DOMAINS, PRIMARY_DOMAIN, PRIMARY_ORIGIN } from "@/lib/siteConfig";
import { getCountryTierKey } from "@/lib/countryTiers";
import { isValidPublicSlug } from "@/lib/systemRoutes";
import {
    detectInAppBrowser,
    getDeeplinkPrimaryAction,
    isAndroidUserAgent,
    prepareAutomaticExternalHandoff,
} from "@/lib/deeplink";
import { useSeo } from "@/hooks/useSeo";
const PublicProfile = lazy(() => import("./PublicProfile"));

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

const fetchCountryCode = async (): Promise<string> => {
    // 1. Try our first-party geo endpoint first (respects privacy, fast, cached)
    try {
        const geoRes = await fetch(`${pb.baseUrl}/api/geo`, { signal: AbortSignal.timeout(1200) });
        const geoData = await geoRes.json();
        if (geoData.country && geoData.country !== "Unknown") {
            return geoData.country;
        }
    } catch { /* First-party geo failed */ }

    // 2. Fallback to Cloudflare trace if our own API fails
    try {
        const geoRes = await fetch("https://cloudflare.com/cdn-cgi/trace", { signal: AbortSignal.timeout(1200) });
        const geoText = await geoRes.text();
        const locMatch = geoText.match(/loc=([A-Z]{2})/);
        if (locMatch && locMatch[1]) {
            return locMatch[1];
        }
    } catch { /* Fallback failed */ }

    return "Unknown";
};

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
    const { username: rawUsername } = useParams();
    const username = rawUsername && isValidPublicSlug(rawUsername)
        ? rawUsername
        : undefined;
    const [status, setStatus] = useState<"loading" | "verifying" | "error" | "deeplink" | "profile">("loading");
    const [error, setError] = useState<string | null>(null);
    const [destination, setDestination] = useState<string>("");
    const redirected = useRef(false);

    // Short links and public profile slugs are utility URLs. They should never
    // inherit the indexable homepage metadata while the client resolves them.
    useSeo({
        title: "Link Redirect | Linktery",
        description: "Resolving a Linktery smart link.",
        canonical: `/${username || ""}`,
        noIndex: true,
    });

    // If a visitor returns from a destination through bfcache, resolve again.
    // Real redirect cycles are handled by the cross-domain lr_trace marker;
    // counting bfcache restores produced false "infinity loop" warnings.
    useEffect(() => {
        const handlePageShow = (e: PageTransitionEvent) => {
            if (e.persisted && username) {
                redirected.current = false;
                setStatus("loading");
            }
        };
        window.addEventListener("pageshow", handlePageShow);
        return () => window.removeEventListener("pageshow", handlePageShow);
    }, [username]);

    useEffect(() => {
        if (status !== "deeplink" || !destination) return;

        const attempt = prepareAutomaticExternalHandoff({
            destination,
            userAgent: navigator.userAgent,
            storage: window.sessionStorage,
            scope: username || window.location.pathname,
        });
        if (!attempt) return;

        // A short delay lets the handoff screen paint before Instagram/TikTok
        // decides whether to honor the external-browser intent.
        const timer = window.setTimeout(() => {
            window.location.href = attempt.href;
        }, 120);
        return () => window.clearTimeout(timer);
    }, [destination, status, username]);

    // ── Track click without blocking the redirect ──
    // Geo, User-Agent parsing and persistence happen on the backend. sendBeacon
    // keeps the request alive while the page navigates away; keepalive fetch is
    // retained as a fallback for browsers where Beacon isn't available.
    const hasTracked = useRef(false);

    const trackClick = useCallback((link: Record<string, unknown>) => {
        if (hasTracked.current) return;
        // Defense-in-depth: sessionStorage guard survives React re-renders
        const trackKey = `gr_tracked_${link.id}`;
        if (sessionStorage.getItem(trackKey)) return;
        hasTracked.current = true;
        sessionStorage.setItem(trackKey, "1");

        const ua = navigator.userAgent;
        const isBot = /bot|crawler|spider|criteo|facebookexternalhit/i.test(ua);
        if (isBot) return;

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

        const trackingUrl = `${pb.baseUrl}/api/track-click`;
        const payload = new URLSearchParams({
            link_id: String(link.id || ""),
            referrer,
            is_unique: isUnique ? "true" : "false"
        });

        // URLSearchParams uses a CORS-safelisted content type, avoiding a
        // preflight that could otherwise race with the outgoing navigation.
        try {
            if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon(trackingUrl, payload)) {
                return;
            }
        } catch { /* fall back to keepalive fetch */ }

        try {
            void fetch(trackingUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                },
                body: payload.toString(),
                keepalive: true
            }).catch(() => {});
        } catch { /* analytics must never block or break the redirect */ }
    }, []);

    // ── Main redirect logic ──
    useEffect(() => {
        if (status !== "loading") return;

        const handleRedirect = async () => {
            if (!username) {
                setError("This link does not exist or is no longer available.");
                setStatus("error");
                return;
            }
            if (redirected.current) return;

            try {
                const currentDomain = window.location.host;
                // Step 1: PARALLEL resolution — link AND public profile at once (halves latency)
                const [linkResult, profileResult] = await Promise.allSettled([
                    pb.collection('links').getFirstListItem(`slug="${username}" && (domain="${currentDomain}" || domain="")`, { expand: 'user_id' }),
                    pb.collection('public_profiles').getFirstListItem(`slug="${username}" && (domain="${currentDomain}" || domain="")`, { expand: 'user_id' })
                ]);

                let link = linkResult.status === 'fulfilled' ? linkResult.value : null;
                const userProfile = profileResult.status === 'fulfilled' ? profileResult.value : null;

                // Fallback: if no link found with domain filter, try slug-only lookup.
                // This handles cross-domain access (e.g., link has domain="linktery.bio" but accessed via "linktery.com")
                if (!link) {
                    try {
                        link = await pb.collection('links').getFirstListItem(`slug="${username}" && active=true`, { expand: 'user_id' });
                    } catch { /* no fallback match either */ }
                }

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
                const inAppBrowser = detectInAppBrowser(ua);
                const isInApp = inAppBrowser !== null;

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
                            const countryCode = await fetchCountryCode();
                            if (countryCode && countryCode !== "Unknown") {
                                const rules = link.geo_targeting as Record<string, string>;
                                if (rules[countryCode]) {
                                    finalDestination = rules[countryCode];
                                } else {
                                    const tierKey = getCountryTierKey(countryCode);
                                    if (rules[tierKey]) finalDestination = rules[tierKey];
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

                // ----- SANITIZE URL TO PREVENT XSS (Zero Trust Validation) -----
                if (finalDestination && !finalDestination.startsWith("http://") && !finalDestination.startsWith("https://")) {
                    console.error("Blocked unsafe redirect scheme:", finalDestination);
                    finalDestination = PRIMARY_ORIGIN; // Safe fallback
                }

                setDestination(finalDestination);

                // Determine if destination is local or points to our own profile / domains
                let isLocalDestination = false;
                try {
                    const destUrlObj = new URL(finalDestination, window.location.href);
                    isLocalDestination = destUrlObj.hostname === window.location.hostname ||
                                         destUrlObj.hostname === PRIMARY_DOMAIN ||
                                         destUrlObj.hostname === `www.${PRIMARY_DOMAIN}` ||
                                         /^[./]/.test(finalDestination);
                } catch {
                    isLocalDestination = finalDestination.includes(window.location.hostname) ||
                                         finalDestination.includes(PRIMARY_DOMAIN) ||
                                         /^[./]/.test(finalDestination);
                }

                // Detect direct and cross-domain Linktery redirect loops. Legacy
                // chains may still exist even though new internal short-link
                // destinations are rejected on save.
                let isSamePage = false;
                let isManagedDestination = false;
                let trace: string[] = [];
                try {
                    const incomingTrace = new URLSearchParams(window.location.search).get("lr_trace") || "";
                    trace = incomingTrace.split(".").filter((value) => /^[a-z0-9]{15}$/i.test(value)).slice(0, 8);
                    if (trace.includes(String(link.id))) {
                        setStatus("error");
                        setError("This redirect chain contains a loop and was stopped for your safety.");
                        return;
                    }

                    const destUrlObj = new URL(finalDestination, window.location.href);
                    const normalizedHost = destUrlObj.hostname.toLowerCase().replace(/^www\./, "");
                    isManagedDestination = DEFAULT_AVAILABLE_DOMAINS.includes(normalizedHost as typeof DEFAULT_AVAILABLE_DOMAINS[number]);
                    const isOurDomain = isManagedDestination || normalizedHost === window.location.hostname.toLowerCase().replace(/^www\./, "");
                    
                    isSamePage = isOurDomain && destUrlObj.pathname.toLowerCase().replace(/\/$/, "") === window.location.pathname.toLowerCase().replace(/\/$/, "");

                    if (isManagedDestination && /^\/[a-z0-9_-]+\/?$/i.test(destUrlObj.pathname)) {
                        const nextTrace = [...trace, String(link.id)].slice(-8);
                        destUrlObj.searchParams.set("lr_trace", nextTrace.join("."));
                        finalDestination = destUrlObj.toString();
                        setDestination(finalDestination);
                    }
                } catch (e) {
                    console.error("Error parsing destination URL for loop check:", e);
                }

                if (isSamePage) {
                    console.warn("Detected self-referencing redirect loop, rendering profile instead.");
                    setStatus("profile");
                    return;
                }

                // Step 3: Track click, then redirect
                if (link.mode === 'direct' && isInApp && !isLocalDestination) {
                    setStatus("deeplink");
                    trackClick(link);
                    await fireTrackingPixels(link);
                    return;
                }

                const needsInterstitial = link.mode === 'landing' || link.interstitial_enabled;

                if (needsInterstitial) {
                    setStatus("verifying");
                    trackClick(link);

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
                    // Queue click tracking, then redirect without waiting for geo/storage.
                    redirected.current = true;
                    trackClick(link);
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
    }, [username, status, trackClick]);

    if (status === "profile") {
        return (
            <Suspense fallback={
                <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
                    <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                </div>
            }>
                <PublicProfile />
            </Suspense>
        );
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
        const userAgent = navigator.userAgent;
        const action = getDeeplinkPrimaryAction(destination, userAgent);
        const inAppBrowser = detectInAppBrowser(userAgent);
        const isAndroid = isAndroidUserAgent(userAgent);
        const browserName = inAppBrowser === "instagram"
            ? "Instagram"
            : inAppBrowser === "tiktok"
                ? "TikTok"
                : inAppBrowser === "facebook"
                    ? "Facebook"
                    : "this app";
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <div className="relative mb-10">
                    <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full animate-pulse" />
                    <div className="relative w-28 h-28 rounded-[2.5rem] bg-surface border border-accent/30 flex items-center justify-center shadow-2xl shadow-accent/20">
                        <Compass className="w-14 h-14 text-accent animate-spin-slow" />
                    </div>
                </div>

                <div className="space-y-4 mb-10 max-w-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                        Deeplink handoff
                    </p>
                    <h1 className="text-3xl font-bold text-foreground">
                        {isAndroid ? "Opening your browser…" : `Continue outside ${browserName}`}
                    </h1>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {isAndroid
                            ? `Linktery is making one safe attempt to leave ${browserName}. If it is blocked, tap the button below.`
                            : "Tap below to open the supported app or destination. iOS may still require the browser menu."}
                    </p>
                </div>

                <div className="w-full max-w-sm space-y-4">
                    <a
                        href={action.href}
                        rel="noopener noreferrer"
                        className="btn-primary-glow w-full min-h-14 flex items-center justify-center gap-2 py-4 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                        <ExternalLink className="w-5 h-5" />
                        {action.label}
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
                    className="mt-8 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-accent transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                    <Share2 className="w-3 h-3" />
                    Continue inside {browserName}
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
        const isFrozen = error === "LINK_FROZEN";
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <div className="relative mb-8">
                    <div className={`absolute inset-0 ${isFrozen ? 'bg-amber-500/20' : 'bg-red-500/20'} blur-3xl rounded-full`} />
                    <div className={`relative w-24 h-24 rounded-3xl bg-surface border ${isFrozen ? 'border-amber-500/30' : 'border-red-500/30'} flex items-center justify-center`}>
                        {isFrozen ? (
                            <Lock className="w-10 h-10 text-amber-500" />
                        ) : (
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        )}
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-3">
                    {isFrozen ? "Link Suspended" : "Link Not Found"}
                </h1>
                <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
                    {isFrozen 
                        ? "This link is temporarily frozen because the owner has exceeded their plan limits." 
                        : (error || "The link you're looking for doesn't exist or is no longer active.")}
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
