// pocketbase/pb_hooks/utils.js

var RATE_LIMIT_STORE = {};
var RATE_LIMIT_LAST_RESET = new Date().getTime();

var GEO_CACHE = {};
var GEO_CACHE_SIZE = 0;
var GEO_CACHE_MAX = 10000;
var GEO_CACHE_CREATED = new Date().getTime();

// Process-local aggregate response cache and abuse controls. Keeping these in
// the shared module is required by PocketBase's isolated router callbacks.
var ANALYTICS_RESPONSE_CACHE = {};
var ANALYTICS_INFLIGHT = {};
var ANALYTICS_RATE_WINDOWS = {};

// Linktery marketing GEO presets. Exact country rules always win; these
// compact keys avoid persisting hundreds of duplicate country URLs per link.
var TIER_1_COUNTRIES = {
    "AU": true, "AT": true, "BE": true, "CA": true, "DK": true, "FI": true,
    "FR": true, "DE": true, "IS": true, "IE": true, "IL": true, "IT": true,
    "JP": true, "LU": true, "NL": true, "NZ": true, "NO": true, "SA": true,
    "SG": true, "KR": true, "ES": true, "SE": true, "CH": true, "AE": true,
    "GB": true, "US": true
};

var TIER_2_COUNTRIES = {
    "AD": true, "AR": true, "BS": true, "BH": true, "BO": true, "BA": true,
    "BR": true, "BN": true, "BG": true, "CL": true, "CN": true, "CO": true,
    "CR": true, "HR": true, "CY": true, "CZ": true, "DO": true, "EC": true,
    "EG": true, "EE": true, "GR": true, "HU": true, "IN": true, "ID": true,
    "KZ": true, "KW": true, "LV": true, "LT": true, "MY": true, "MT": true,
    "MX": true, "ME": true, "MA": true, "OM": true, "PA": true, "PY": true,
    "PE": true, "PH": true, "PL": true, "PT": true, "QA": true, "RO": true,
    "RS": true, "SK": true, "SI": true, "ZA": true, "TH": true, "TR": true,
    "UY": true, "VU": true
};

var getCountryTierKey = function (countryCode) {
    var normalized = String(countryCode || "").trim().toUpperCase();
    if (TIER_1_COUNTRIES[normalized]) return "TIER_1";
    if (TIER_2_COUNTRIES[normalized]) return "TIER_2";
    return "TIER_3";
};

var getRedirectLoopHtml = function() {
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Redirect stopped</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050907;color:#f5f7f6;font:16px system-ui,sans-serif}.card{max-width:440px;margin:24px;padding:32px;border:1px solid #20342a;border-radius:24px;background:#0a120e;text-align:center}h1{font-size:24px;margin:0 0 12px}p{color:#9fb0a7;line-height:1.6}a{display:inline-block;margin-top:12px;padding:12px 18px;border-radius:12px;background:#34d399;color:#03110a;text-decoration:none;font-weight:700}</style></head><body><main class="card"><h1>Redirect stopped</h1><p>This link points back into the same redirect chain. Linktery stopped it to prevent an endless loading screen.</p><a href="https://linktery.com">Return to Linktery</a></main></body></html>';
};

var PUBLIC_PROMOCODE_ERRORS = {
    "Promocode is required": true,
    "Invalid or inactive promocode": true,
    "This promocode has reached its usage limit": true,
    "You have already used a promocode on this account": true
};

var getSafePromocodeError = function(err) {
    var message = String((err && err.message) || "");
    if (PUBLIC_PROMOCODE_ERRORS[message] || /^Your current (creator|pro|agency) plan is higher than the (creator|pro|agency) reward$/.test(message) || /^You already have the (creator|pro|agency) plan$/.test(message)) {
        return message;
    }
    return "We couldn't process this promocode. Please check the code and try again.";
};

var analyticsRateLimitAllows = function (userId) {
    var now = new Date().getTime();
    var windowStart = now - 60000;
    var previous = ANALYTICS_RATE_WINDOWS[userId] || [];
    var active = [];
    for (var i = 0; i < previous.length; i++) {
        if (previous[i] >= windowStart) active.push(previous[i]);
    }
    if (active.length >= 10) {
        ANALYTICS_RATE_WINDOWS[userId] = active;
        return false;
    }
    active.push(now);
    ANALYTICS_RATE_WINDOWS[userId] = active;
    return true;
};

var getAnalyticsCache = function (key) {
    var item = ANALYTICS_RESPONSE_CACHE[key];
    if (!item) return null;
    if (item.expiresAt <= new Date().getTime()) {
        delete ANALYTICS_RESPONSE_CACHE[key];
        return null;
    }
    return item.data;
};

var setAnalyticsCache = function (key, data, ttlMs) {
    var keys = Object.keys(ANALYTICS_RESPONSE_CACHE);
    if (keys.length > 500) {
        var now = new Date().getTime();
        for (var i = 0; i < keys.length; i++) {
            if (ANALYTICS_RESPONSE_CACHE[keys[i]].expiresAt <= now) {
                delete ANALYTICS_RESPONSE_CACHE[keys[i]];
            }
        }
    }
    ANALYTICS_RESPONSE_CACHE[key] = {
        expiresAt: new Date().getTime() + ttlMs,
        data: data
    };
};

// Single server-side source of truth for entitlements and monthly list prices.
// -1 denotes an unlimited resource.
var PLAN_CATALOG = {
    "creator": { "links": 3, "publicProfiles": 1, "monthlyPrice": 0, "analytics": false },
    "pro": { "links": 15, "publicProfiles": 3, "monthlyPrice": 11, "analytics": true },
    "agency": { "links": -1, "publicProfiles": 25, "monthlyPrice": 29, "analytics": true }
};

var PROFILE_TEMPLATES = {
    "classic": true,
    "compact": true,
    "banner": true,
    "hero": true,
    "cutout": true
};

var PROFILE_LINK_CARD_STYLES = {
    "minimal": true,
    "solid": true,
    "outline": true,
    "glass": true,
    "image-first": true
};

var PROFILE_SOCIAL_LINK_STYLES = {
    "icons": true,
    "branded-pills": true
};

var getPlanCatalogEntry = function(planName) {
    return PLAN_CATALOG[planName] || PLAN_CATALOG.creator;
};

// PocketBase executes router callbacks in isolated JSVM scopes. Keep Stripe
// helpers in this shared module and require them inside each callback.
var getStripePeriodFromSubscription = function (subscription) {
    var firstItem = subscription && subscription.items && subscription.items.data && subscription.items.data.length > 0
        ? subscription.items.data[0]
        : null;
    var start = subscription ? (subscription.current_period_start || (firstItem && firstItem.current_period_start)) : null;
    var end = subscription ? (subscription.current_period_end || (firstItem && firstItem.current_period_end)) : null;

    if (!start || !end || !isFinite(Number(start)) || !isFinite(Number(end))) {
        throw new Error("Stripe subscription has no valid current billing period");
    }

    // PocketBase DateTime accepts a formatted string, not a JavaScript Date.
    // Passing Date objects silently creates "now", which would expire plans
    // immediately after webhook processing.
    var startValue = new Date(Number(start) * 1000).toISOString().replace("T", " ");
    var endValue = new Date(Number(end) * 1000).toISOString().replace("T", " ");

    return {
        start: new DateTime(startValue),
        end: new DateTime(endValue),
        startUnix: Number(start),
        endUnix: Number(end)
    };
};

var fetchStripeSubscriptionPeriod = function (subscriptionId, stripeSecretKey) {
    if (!subscriptionId) {
        throw new Error("Stripe subscription id is required to determine billing period");
    }

    var response = $http.send({
        url: "https://api.stripe.com/v1/subscriptions/" + subscriptionId,
        method: "GET",
        headers: {
            "Authorization": "Bearer " + stripeSecretKey
        },
        timeout: 10
    });
    if (response.statusCode >= 400) {
        throw new Error("Stripe subscription fetch error: " + response.statusCode);
    }

    return getStripePeriodFromSubscription(response.json);
};

var readerToString = function (reader) {
    var result = "";
    var buffer = new Uint8Array(1024);
    while (true) {
        var n = reader.read(buffer);
        if (n <= 0) break;
        result += String.fromCharCode.apply(null, buffer.subarray(0, n));
    }
    return result;
};

var FLY_REGION_MAP = {
    "ams": "NL", "arn": "SE", "atl": "US", "bog": "CO",
    "bom": "IN", "bos": "US", "cdg": "FR", "den": "US",
    "dfw": "US", "ewr": "US", "eze": "AR", "fra": "DE",
    "gdl": "MX", "gig": "BR", "gru": "BR", "hkg": "HK",
    "iad": "US", "jnb": "ZA", "lax": "US", "lhr": "GB",
    "maa": "IN", "mad": "ES", "mia": "US", "nrt": "JP",
    "ord": "US", "otp": "RO", "phx": "US", "qro": "MX",
    "scl": "CL", "sea": "US", "sin": "SG", "sjc": "US",
    "syd": "AU", "waw": "PL", "yul": "CA", "yyz": "CA",
    "bkk": "TH", "del": "IN", "dxb": "AE", "fco": "IT",
    "gua": "GT", "hel": "FI", "lis": "PT", "mel": "AU",
    "mxp": "IT", "per": "AU", "prg": "CZ", "sto": "SE",
    "vie": "AT", "zrh": "CH", "cpt": "ZA", "doh": "QA",
    "icn": "KR", "kul": "MY", "mnl": "PH", "tpe": "TW"
};

var resolveCountryFromIP = function (request) {
    var country = request.header.get("CF-IPCountry") || "";
    if (country && country !== "XX" && country !== "T1") return country;

    country = request.header.get("X-Country-Code") || "";
    if (country) return country;

    var xff = request.header.get("X-Forwarded-For") || "";
    var clientIP = request.header.get("Fly-Client-IP")
        || request.header.get("CF-Connecting-IP")
        || (xff ? xff.split(",")[0].replace(/^\s+|\s+$/g, "") : "")
        || "";

    if (clientIP.indexOf(":") !== -1 && clientIP.indexOf(".") !== -1 && clientIP.split(":").length === 2) {
        clientIP = clientIP.split(":")[0];
    }

    var isPrivate = !clientIP
        || clientIP === "127.0.0.1"
        || clientIP === "::1"
        || clientIP.indexOf("10.") === 0
        || clientIP.indexOf("192.168.") === 0
        || clientIP.indexOf("172.") === 0;

    if (!isPrivate) {
        var nowGeo = new Date().getTime();
        if (GEO_CACHE_SIZE >= GEO_CACHE_MAX || (nowGeo - GEO_CACHE_CREATED) > 21600000) {
            GEO_CACHE = {};
            GEO_CACHE_SIZE = 0;
            GEO_CACHE_CREATED = nowGeo;
        }

        var cached = GEO_CACHE[clientIP];
        if (cached) return cached;

        try {
            var geoRes = $http.send({
                url: "http://ip-api.com/json/" + encodeURIComponent(clientIP) + "?fields=status,countryCode",
                method: "GET",
                timeout: 2
            });
            if (geoRes.statusCode === 200 && geoRes.json && geoRes.json.status === "success" && geoRes.json.countryCode) {
                var cc = geoRes.json.countryCode;
                GEO_CACHE[clientIP] = cc;
                GEO_CACHE_SIZE++;
                return cc;
            }
        } catch (geoErr) {
        }
    }

    var flyRegion = request.header.get("Fly-Region") || "";
    if (flyRegion) {
        var mapped = FLY_REGION_MAP[flyRegion.toLowerCase()];
        if (mapped) return mapped;
    }

    return "Unknown";
};

var getAuthInfo = function(e) {
    var isSuperAdmin = false;
    var isAppAdmin = false;
    var authUserId = null;
    
    if (e.auth) {
        try {
            isSuperAdmin = e.auth.collection().name === "_superusers";
        } catch (err) {}
        try {
            if (e.auth.collection().name === "users") {
                authUserId = e.auth.id;
                isAppAdmin = e.auth.get("role") === "admin";
            }
        } catch (err) {}
    }
    else if (e.httpContext) {
        try {
            isSuperAdmin = e.httpContext.get("admin") !== null;
        } catch (err) {}
        try {
            var authUser = e.httpContext.get("authRecord");
            if (authUser) {
                authUserId = authUser.id;
                isAppAdmin = authUser.get("role") === "admin";
            }
        } catch (err) {}
    }
    
    return { isSuperAdmin: isSuperAdmin, isAppAdmin: isAppAdmin, isAdmin: isSuperAdmin || isAppAdmin, authUserId: authUserId };
};

// RecordsListRequestEvent exposes the parsed request on `e.request` in
// PocketBase 0.24. Keep a fallback for older wrappers, but never let an
// unreadable filter become an unrestricted public query.
var getRequestFilter = function(e) {
    try {
        if (e && typeof e.requestInfo === "function") {
            var info = e.requestInfo();
            if (info && info.query) return info.query["filter"] || "";
        }
    } catch (err) {}

    try {
        if (e && e.request && e.request.url) {
            var requestQuery = e.request.url.query();
            if (requestQuery) return requestQuery.get("filter") || "";
        }
    } catch (err) {}

    try {
        if (e && e.httpContext && e.httpContext.request && e.httpContext.request.url) {
            var contextQuery = e.httpContext.request.url.query();
            if (contextQuery) return contextQuery.get("filter") || "";
        }
    } catch (err) {}

    return "";
};

var isSafeSlugLookupFilter = function(filter) {
    // Accepted public lookups:
    //   slug="..."
    //   slug="..." && active=true
    //   slug="..." && id!="..."
    //   slug="..." && (domain="..." || domain="")
    return /^\s*slug\s*=\s*"[^"\\]{1,200}"(?:\s*&&\s*(?:active\s*=\s*true|id\s*!=\s*"[^"\\]*"|\(\s*domain\s*=\s*"[^"\\]*"\s*\|\|\s*domain\s*=\s*""\s*\)))?\s*$/i.test(filter);
};

var isSafePublicProfileLinksFilter = function(filter) {
    return /^\s*profile_id\s*=\s*"[a-z0-9]{15}"\s*&&\s*active\s*=\s*true\s*&&\s*show_on_profile\s*!=\s*false\s*$/i.test(filter);
};

var isSafePublicProfileCompositionFilter = function(filter) {
    return /^\s*profile_id\s*=\s*"[a-z0-9]{15}"\s*&&\s*visible\s*=\s*true\s*$/i.test(filter);
};

var isAuthenticatedOwnerFilter = function(filter, authUserId) {
    if (!authUserId || filter.indexOf("||") !== -1) return false;

    var escapedUserId = String(authUserId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var ownerPattern = new RegExp(
        "(?:^|&&|\\()\\s*user_id\\s*=\\s*\"" + escapedUserId + "\"\\s*(?:$|&&|\\))",
        "i"
    );
    return ownerPattern.test(filter);
};

var assertSafePublicListFilter = function(e, collectionName, authInfo) {
    if (authInfo && authInfo.isAdmin) return;

    var filter = getRequestFilter(e);
    filter = typeof filter === "string" ? filter.trim() : String(filter || "").trim();

    if (filter && isSafeSlugLookupFilter(filter)) return;
    if (collectionName === "links" && filter && isSafePublicProfileLinksFilter(filter)) return;
    if (collectionName === "profile_links" && filter && isSafePublicProfileCompositionFilter(filter)) return;
    if (filter && authInfo && isAuthenticatedOwnerFilter(filter, authInfo.authUserId)) return;

    throw new BadRequestError(
        "Bulk queries are restricted. Use a public slug lookup or an authenticated owner filter."
    );
};

var normalizeLinkHost = function(value) {
    var host = String(value || "").trim().toLowerCase();
    host = host.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
    return host;
};

var getPlatformLinkHosts = function() {
    var hosts = {
        "linktery.com": true,
        "linktery.bio": true,
        "hotme.online": true,
        "hotmylinks.cc": true
    };
    var hostUrl = String($os.getenv("HOST_URL") || "");
    var hostUrlMatch = hostUrl.match(/^https?:\/\/([^/?#]+)/i);
    if (hostUrlMatch && hostUrlMatch[1]) hosts[normalizeLinkHost(hostUrlMatch[1])] = true;
    return hosts;
};

// Returns the Link record addressed by a Linktery-owned short URL. Public
// Profile URLs intentionally return null and remain valid destinations.
var findManagedShortLinkTarget = function(url) {
    if (!url || typeof url !== "string") return null;
    var match = url.trim().match(/^https?:\/\/([^/?#]+)\/([a-z0-9_-]+)\/?(?:[?#].*)?$/i);
    if (!match) return null;

    var targetHost = normalizeLinkHost(match[1]);
    var targetSlug = match[2];
    var targetLink = null;
    try {
        targetLink = $app.findFirstRecordByFilter("links", "slug = {:slug}", { slug: targetSlug });
    } catch (err) {
        return null;
    }

    if (!targetLink) return null;
    var platformHosts = getPlatformLinkHosts();
    var storedHost = normalizeLinkHost(targetLink.get("domain"));
    if (platformHosts[targetHost] || (storedHost && storedHost === targetHost)) return targetLink;
    return null;
};

var parseRedirectTrace = function(rawUrl) {
    var match = String(rawUrl || "").match(/[?&]lr_trace=([^&#]+)/i);
    if (!match || !match[1]) return [];
    var decoded = "";
    try { decoded = decodeURIComponent(match[1]); } catch (err) { decoded = match[1]; }
    return decoded.split(".").filter(function(value) {
        return /^[a-z0-9]{15}$/i.test(value);
    }).slice(0, 8);
};

var appendRedirectTrace = function(url, trace) {
    var cleanTrace = (trace || []).filter(function(value) {
        return /^[a-z0-9]{15}$/i.test(String(value));
    }).slice(-8);
    if (cleanTrace.length === 0) return url;

    var raw = String(url || "");
    var hashIndex = raw.indexOf("#");
    var base = hashIndex === -1 ? raw : raw.substring(0, hashIndex);
    var hash = hashIndex === -1 ? "" : raw.substring(hashIndex);
    base = base.replace(/([?&])lr_trace=[^&#]*&?/i, function(full, separator) {
        return separator === "?" && full.charAt(full.length - 1) === "&" ? "?" : "";
    }).replace(/[?&]$/, "");
    var separator = base.indexOf("?") === -1 ? "?" : "&";
    return base + separator + "lr_trace=" + encodeURIComponent(cleanTrace.join(".")) + hash;
};

var parseRecordJson = function(raw) {
    if (!raw) return null;
    var serialized = "";
    try {
        serialized = typeof raw === "string" ? raw.trim() : JSON.stringify(raw);
    } catch (err) {
        return null;
    }
    if (!serialized || serialized === "null" || serialized === '""') return null;
    try {
        return JSON.parse(serialized);
    } catch (err) {
        return null;
    }
};

var toPlainTargetingObject = function(raw) {
    var parsed = parseRecordJson(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
};

var toPlainStringArray = function(raw) {
    var parsed = parseRecordJson(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(function(value) {
        return typeof value === "string" && value.trim() !== "";
    });
};

var validateTargetingUrls = function(record) {
    var checkUrl = function (url, fieldName) {
        // Skip nulls, undefined, empty strings, numbers, booleans
        if (!url || typeof url !== "string") return;
        var urlStr = url.trim();
        if (!urlStr) return;
        if (urlStr.indexOf("http://") !== 0 && urlStr.indexOf("https://") !== 0) {
            throw new BadRequestError("All destination and targeting URLs must start with http:// or https://.");
        }
        if (findManagedShortLinkTarget(urlStr)) {
            throw new BadRequestError("Use the final destination URL instead of another Linktery short URL. This prevents slow redirects and redirect loops.");
        }
    };

    checkUrl(record.get("destination_url"), "destination_url");

    var devObj = toPlainTargetingObject(record.getString("device_targeting"));
    if (devObj) {
        for (var key in devObj) {
            if (devObj.hasOwnProperty(key)) {
                checkUrl(devObj[key], "device_targeting[" + key + "]");
            }
        }
    }

    var geoObj = toPlainTargetingObject(record.getString("geo_targeting"));
    if (geoObj) {
        for (var geoKey in geoObj) {
            if (geoObj.hasOwnProperty(geoKey)) {
                checkUrl(geoObj[geoKey], "geo_targeting[" + geoKey + "]");
            }
        }
    }

    var splitUrls = toPlainStringArray(record.getString("split_urls"));
    for (var i = 0; i < splitUrls.length; i++) {
        checkUrl(splitUrls[i], "split_urls[" + i + "]");
    }
};

// A link shown on a Public Profile must point to a profile owned by the same
// account. Keeping this invariant on the server prevents direct API requests
// from attaching links to another user's page or creating half-linked records.
var validateLinkProfileAssignment = function(record) {
    var showOnProfile = record.get("show_on_profile") === true;
    var profileId = String(record.get("profile_id") || "").trim();
    var userId = String(record.get("user_id") || "").trim();

    if (!showOnProfile) {
        if (profileId) record.set("profile_id", "");
        return;
    }

    if (!profileId) {
        throw new BadRequestError("Select a Public Profile before showing this link on a profile.");
    }

    var profile = null;
    try {
        profile = $app.findRecordById("public_profiles", profileId);
    } catch (err) {
        throw new BadRequestError("The selected Public Profile does not exist.");
    }

    if (!profile || String(profile.get("user_id") || "") !== userId) {
        throw new BadRequestError("The selected Public Profile must belong to the link owner.");
    }
};

// profile_links is the presentation/composition layer. It may change how a
// core link looks on a profile, but it must never cross account boundaries.
var validateProfileLinkComposition = function(record, authInfo) {
    var profileId = String(record.get("profile_id") || "").trim();
    var linkId = String(record.get("link_id") || "").trim();

    if (!profileId || !linkId) {
        throw new BadRequestError("A profile link requires both a Public Profile and a Link.");
    }

    var profile;
    var link;
    try {
        profile = $app.findRecordById("public_profiles", profileId);
        link = $app.findRecordById("links", linkId);
    } catch (err) {
        throw new BadRequestError("The selected Public Profile or Link does not exist.");
    }

    var profileOwner = String(profile.get("user_id") || "");
    var linkOwner = String(link.get("user_id") || "");
    if (!profileOwner || profileOwner !== linkOwner) {
        throw new BadRequestError("The Public Profile and Link must belong to the same account.");
    }

    if (!authInfo.isAdmin && authInfo.authUserId !== profileOwner) {
        throw new ForbiddenError("You cannot manage links on another account's Public Profile.");
    }

    record.set("user_id", profileOwner);

    var size = String(record.get("size") || "regular").trim().toLowerCase();
    if (size !== "regular" && size !== "large") {
        throw new BadRequestError("Unsupported profile link size.");
    }
    record.set("size", size);

    var titleOverride = String(record.get("title_override") || "").trim();
    record.set("title_override", titleOverride);
};

var validateProfileSocialLinks = function(record) {
    var socialLinks = record.get("social_links");
    if (socialLinks) {
        var list = [];
        if (typeof socialLinks === "string" && socialLinks.trim() !== "") {
            try { list = JSON.parse(socialLinks); } catch (e) { }
        } else if (Array.isArray(socialLinks)) {
            list = socialLinks;
        } else if (typeof socialLinks === "object") {
            try { list = JSON.parse(JSON.stringify(socialLinks)); } catch (e) { }
        }
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (item && item.url) {
                var urlStr = String(item.url);
                if (urlStr.indexOf("http://") !== 0 && urlStr.indexOf("https://") !== 0) {
                    throw new BadRequestError("All social links must start with http:// or https://");
                }
            }
        }
    }
};

var validateProfileTemplate = function(record) {
    var template = String(record.get("profile_template") || "classic").trim().toLowerCase();
    if (!PROFILE_TEMPLATES[template]) {
        throw new BadRequestError("Unsupported public profile template.");
    }
    record.set("profile_template", template);
};

var validateProfilePresentation = function(record) {
    var linkCardStyle = String(record.get("link_card_style") || "glass").trim().toLowerCase();
    if (!PROFILE_LINK_CARD_STYLES[linkCardStyle]) {
        throw new BadRequestError("Unsupported public profile link card style.");
    }
    record.set("link_card_style", linkCardStyle);

    var socialLinkStyle = String(record.get("social_link_style") || "icons").trim().toLowerCase();
    if (!PROFILE_SOCIAL_LINK_STYLES[socialLinkStyle]) {
        throw new BadRequestError("Unsupported public profile social link style.");
    }
    record.set("social_link_style", socialLinkStyle);
};

module.exports = {
    RATE_LIMIT_STORE,
    RATE_LIMIT_LAST_RESET,
    GEO_CACHE,
    GEO_CACHE_SIZE,
    GEO_CACHE_MAX,
    GEO_CACHE_CREATED,
    ANALYTICS_RESPONSE_CACHE,
    ANALYTICS_INFLIGHT,
    ANALYTICS_RATE_WINDOWS,
    TIER_1_COUNTRIES,
    TIER_2_COUNTRIES,
    getCountryTierKey,
    getRedirectLoopHtml,
    getSafePromocodeError,
    analyticsRateLimitAllows,
    getAnalyticsCache,
    setAnalyticsCache,
    PLAN_CATALOG,
    PROFILE_TEMPLATES,
    PROFILE_LINK_CARD_STYLES,
    PROFILE_SOCIAL_LINK_STYLES,
    getPlanCatalogEntry,
    getStripePeriodFromSubscription,
    fetchStripeSubscriptionPeriod,
    readerToString,
    FLY_REGION_MAP,
    resolveCountryFromIP,
    getAuthInfo,
    getRequestFilter,
    isSafeSlugLookupFilter,
    isSafePublicProfileLinksFilter,
    isSafePublicProfileCompositionFilter,
    isAuthenticatedOwnerFilter,
    assertSafePublicListFilter,
    findManagedShortLinkTarget,
    parseRedirectTrace,
    appendRedirectTrace,
    parseRecordJson,
    toPlainTargetingObject,
    toPlainStringArray,
    validateTargetingUrls,
    validateLinkProfileAssignment,
    validateProfileLinkComposition,
    validateProfileSocialLinks,
    validateProfileTemplate,
    validateProfilePresentation
};
