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
    if (filter && authInfo && isAuthenticatedOwnerFilter(filter, authInfo.authUserId)) return;

    throw new BadRequestError(
        "Bulk queries are restricted. Use a public slug lookup or an authenticated owner filter."
    );
};

var validateTargetingUrls = function(record) {
    var checkUrl = function (url, fieldName) {
        // Skip nulls, undefined, empty strings, numbers, booleans
        if (!url || typeof url !== "string") return;
        var urlStr = url.trim();
        if (!urlStr) return;
        if (urlStr.indexOf("http://") !== 0 && urlStr.indexOf("https://") !== 0) {
            throw new BadRequestError("All destination and targeting URLs must start with http:// or https:// (failed on " + fieldName + ": \"" + urlStr + "\")");
        }
    };

    checkUrl(record.get("destination_url"), "destination_url");

    // Helper: safely parse a targeting field into a plain object
    var parseTargetingObj = function(raw) {
        if (!raw) return null;
        
        // Convert to JSON string first. This safely stringifies Go maps/slices/nil values.
        var str = "";
        try {
            if (typeof raw === "string") {
                var trimmed = raw.trim();
                if (!trimmed || trimmed === '""' || trimmed === "null") return null;
                // If it is a JSON string, use it directly
                str = trimmed;
            } else {
                str = JSON.stringify(raw);
            }
        } catch (e) {
            return null;
        }
        
        if (!str || str === "null" || str === '""' || str === "{}" || str === "[]") {
            return null;
        }
        
        try {
            var obj = JSON.parse(str);
            if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
                return null;
            }
            return obj;
        } catch (e) {
            return null;
        }
    };

    var devObj = parseTargetingObj(record.get("device_targeting"));
    if (devObj) {
        for (var key in devObj) {
            if (devObj.hasOwnProperty(key)) {
                checkUrl(devObj[key], "device_targeting[" + key + "]");
            }
        }
    }

    var geoObj = parseTargetingObj(record.get("geo_targeting"));
    if (geoObj) {
        for (var geoKey in geoObj) {
            if (geoObj.hasOwnProperty(geoKey)) {
                checkUrl(geoObj[geoKey], "geo_targeting[" + geoKey + "]");
            }
        }
    }

    var splitUrls = record.get("split_urls");
    if (splitUrls) {
        var list = [];
        if (typeof splitUrls === "string" && splitUrls.trim() !== "") {
            try { list = JSON.parse(splitUrls); } catch (e) { }
        } else if (Array.isArray(splitUrls)) {
            list = splitUrls;
        } else if (typeof splitUrls === "object") {
            try { list = JSON.parse(JSON.stringify(splitUrls)); } catch (e) { }
        }
        if (Array.isArray(list)) {
            for (var i = 0; i < list.length; i++) {
                checkUrl(list[i], "split_urls[" + i + "]");
            }
        }
    }
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
    analyticsRateLimitAllows,
    getAnalyticsCache,
    setAnalyticsCache,
    PLAN_CATALOG,
    PROFILE_TEMPLATES,
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
    isAuthenticatedOwnerFilter,
    assertSafePublicListFilter,
    validateTargetingUrls,
    validateProfileSocialLinks,
    validateProfileTemplate
};
