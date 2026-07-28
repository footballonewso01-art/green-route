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

// Click ingestion is intentionally protected separately from redirect
// requests. Dropping excess telemetry must never prevent navigation.
var CLICK_RATE_WINDOW_STARTED_AT = new Date().getTime();
var CLICK_RATE_BY_IP = {};
var CLICK_RATE_BY_IP_AND_LINK = {};
var CLICK_UNIQUE_CACHE = {};
var CLICK_UNIQUE_CACHE_SIZE = 0;
var CLICK_UNIQUE_LAST_SWEEP = new Date().getTime();
var CLICK_UNIQUE_TTL_MS = 24 * 60 * 60 * 1000;
var CLICK_UNIQUE_CACHE_MAX = 100000;

// Public API authentication state. Raw secrets are never stored here. The
// database keeps a keyed digest for authentication, a non-secret lookup
// prefix, and an AES-GCM encrypted copy for the authenticated reveal screen.
var API_RATE_WINDOWS = {};
var API_LAST_USED_WRITES = {};
var API_ALLOWED_SCOPES = {
    "links:read": true
};

// One-segment application routes share the same namespace as Links and Public
// Profiles. Keep the server authoritative; the frontend has a contract test
// that must remain synchronized with this list.
var SYSTEM_ROUTE_SLUGS = {
    "404": true,
    "admin": true,
    "alternatives": true,
    "api": true,
    "assets": true,
    "auth": true,
    "compare": true,
    "dashboard": true,
    "features": true,
    "guides": true,
    "login": true,
    "open-in-browser": true,
    "pricing": true,
    "privacy": true,
    "ref": true,
    "register": true,
    "solutions": true,
    "templates": true,
    "terms": true,
    "tools": true
};

var isReservedPublicSlug = function(value) {
    return SYSTEM_ROUTE_SLUGS[String(value || "").trim().toLowerCase()] === true;
};

var validatePublicSlug = function(value) {
    var slug = String(value || "").trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(slug)) {
        throw new BadRequestError("Slug must be 1-64 characters and use only lowercase letters, numbers, or hyphens.");
    }
    if (isReservedPublicSlug(slug)) {
        throw new BadRequestError("This address is reserved by Linktery. Please choose another slug.");
    }
    return slug;
};

var getClientIP = function(eventOrRequest) {
    var event = eventOrRequest || null;
    var request = event && event.request ? event.request : event;

    // Fly sets this header at the trusted edge. Prefer it over user-controlled
    // forwarding headers when the backend is directly reachable.
    try {
        var flyIP = request && request.header ? request.header.get("Fly-Client-IP") : "";
        if (flyIP) return String(flyIP).trim();
    } catch (err) {}

    try {
        if (event && typeof event.realIP === "function") {
            var realIP = event.realIP();
            if (realIP) return String(realIP).trim();
        }
    } catch (err) {}

    try {
        var remoteIP = request && request.remoteIP;
        if (typeof remoteIP === "function") remoteIP = remoteIP();
        if (remoteIP) return String(remoteIP).trim();
    } catch (err) {}

    return "unknown";
};

var clickRateLimitAllows = function(eventOrRequest, linkId) {
    var now = new Date().getTime();
    if (now - CLICK_RATE_WINDOW_STARTED_AT >= 60000) {
        CLICK_RATE_WINDOW_STARTED_AT = now;
        CLICK_RATE_BY_IP = {};
        CLICK_RATE_BY_IP_AND_LINK = {};
    }

    var ip = getClientIP(eventOrRequest);
    var safeLinkId = String(linkId || "");
    var ipKey = $security.sha256(ip);
    var pairKey = ipKey + ":" + safeLinkId;
    var ipCount = CLICK_RATE_BY_IP[ipKey] || 0;
    var pairCount = CLICK_RATE_BY_IP_AND_LINK[pairKey] || 0;

    // A shared/mobile NAT still has enough room for normal bursts. When the
    // threshold is reached only telemetry is dropped; redirecting continues.
    if (ipCount >= 240 || pairCount >= 60) return false;

    CLICK_RATE_BY_IP[ipKey] = ipCount + 1;
    CLICK_RATE_BY_IP_AND_LINK[pairKey] = pairCount + 1;
    return true;
};

var isUniqueTrackedClick = function(eventOrRequest, linkId) {
    var now = new Date().getTime();

    if (CLICK_UNIQUE_CACHE_SIZE >= CLICK_UNIQUE_CACHE_MAX || now - CLICK_UNIQUE_LAST_SWEEP >= 60 * 60 * 1000) {
        var keys = Object.keys(CLICK_UNIQUE_CACHE);
        var next = {};
        var nextSize = 0;
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (CLICK_UNIQUE_CACHE[key] > now && nextSize < CLICK_UNIQUE_CACHE_MAX) {
                next[key] = CLICK_UNIQUE_CACHE[key];
                nextSize++;
            }
        }
        CLICK_UNIQUE_CACHE = next;
        CLICK_UNIQUE_CACHE_SIZE = nextSize;
        CLICK_UNIQUE_LAST_SWEEP = now;
    }

    var event = eventOrRequest || null;
    var request = event && event.request ? event.request : event;
    var userAgent = "";
    try {
        userAgent = request && request.header ? request.header.get("User-Agent") || "" : "";
    } catch (err) {}

    // The cache stores only a digest, never the visitor IP or User-Agent.
    var fingerprint = $security.sha256(
        String(linkId || "") + "|" + getClientIP(eventOrRequest) + "|" + String(userAgent).substring(0, 300)
    );
    var existingExpiry = CLICK_UNIQUE_CACHE[fingerprint] || 0;
    if (existingExpiry > now) return false;

    CLICK_UNIQUE_CACHE[fingerprint] = now + CLICK_UNIQUE_TTL_MS;
    CLICK_UNIQUE_CACHE_SIZE++;
    return true;
};

var normalizeApiScopes = function(raw) {
    var values = [];
    if (Array.isArray(raw)) {
        values = raw;
    } else {
        var source = String(raw || "").trim();
        if (source.charAt(0) === "[") {
            try {
                var parsed = JSON.parse(source);
                if (Array.isArray(parsed)) values = parsed;
            } catch (err) {}
        }
        if (values.length === 0 && source) values = source.split(",");
    }

    var seen = {};
    var normalized = [];
    for (var i = 0; i < values.length; i++) {
        var scope = String(values[i] || "").trim().toLowerCase();
        if (!scope || seen[scope]) continue;
        if (!API_ALLOWED_SCOPES[scope]) {
            throw new BadRequestError("Unsupported API scope.");
        }
        seen[scope] = true;
        normalized.push(scope);
    }
    normalized.sort();
    if (normalized.length === 0) normalized.push("links:read");
    return normalized;
};

var getApiKeyPepper = function() {
    var pepper = String($os.getenv("API_KEY_PEPPER") || "");
    // A missing/weak pepper must fail closed. It is intentionally not derived
    // from another application secret so key rotation remains independent.
    return pepper.length >= 32 ? pepper : "";
};

var hashApiToken = function(token) {
    var pepper = getApiKeyPepper();
    if (!pepper) return "";
    return $security.sha256(pepper + ":" + String(token || ""));
};

var getApiKeyEncryptionKey = function() {
    var key = String($os.getenv("API_KEY_ENCRYPTION_KEY") || "");
    // PocketBase's AES-256-GCM helper requires an exact 32-character key.
    // Keep this independent from API_KEY_PEPPER so either secret can be
    // rotated without reusing key material for a different purpose.
    return key.length === 32 ? key : "";
};

var encryptApiToken = function(token) {
    var key = getApiKeyEncryptionKey();
    if (!key || !token) return "";
    try {
        return String($security.encrypt(String(token), key) || "");
    } catch (err) {
        return "";
    }
};

var decryptApiToken = function(cipherText) {
    var key = getApiKeyEncryptionKey();
    if (!key || !cipherText) return "";
    try {
        return String($security.decrypt(String(cipherText), key) || "");
    } catch (err) {
        return "";
    }
};

var revealApiToken = function(record) {
    if (!record) return "";
    var token = decryptApiToken(record.get("encrypted_secret"));
    if (!/^ltk_live_[A-Za-z0-9]{10}_[A-Za-z0-9]{40}$/.test(token)) return "";
    if (token.substring(0, token.lastIndexOf("_")) !== String(record.get("key_prefix") || "")) return "";
    var digest = hashApiToken(token);
    if (!digest || digest !== String(record.get("secret_hash") || "")) return "";
    return token;
};

var createManagedApiKey = function(app, userId) {
    if (!getApiKeyPepper() || !getApiKeyEncryptionKey()) {
        throw new Error("API key encryption is not configured.");
    }

    var keyPrefix = "ltk_live_" + $security.randomString(10);
    var token = keyPrefix + "_" + $security.randomString(40);
    var digest = hashApiToken(token);
    var encryptedSecret = encryptApiToken(token);
    if (!digest || !encryptedSecret) {
        throw new Error("Unable to protect the API key.");
    }

    var collection = app.findCollectionByNameOrId("api_keys");
    var record = new Record(collection, {
        user_id: String(userId || ""),
        name: "Account API key",
        key_prefix: keyPrefix,
        secret_hash: digest,
        encrypted_secret: encryptedSecret,
        scopes: "links:read",
        status: "active",
        expires_at: "",
        last_used_at: "",
        revoked_at: ""
    });
    app.save(record);
    return { record: record, secret: token };
};

var serializeApiKey = function(record) {
    return {
        id: record.id,
        name: String(record.get("name") || ""),
        prefix: String(record.get("key_prefix") || ""),
        scopes: normalizeApiScopes(record.get("scopes")),
        status: String(record.get("status") || "revoked"),
        expires_at: String(record.get("expires_at") || ""),
        last_used_at: String(record.get("last_used_at") || ""),
        revoked_at: String(record.get("revoked_at") || ""),
        created: String(record.get("created") || ""),
        updated: String(record.get("updated") || "")
    };
};

var serializeApiLink = function(record) {
    var domain = String(record.get("domain") || "linktery.com").trim().toLowerCase();
    if (!domain) domain = "linktery.com";
    var slug = String(record.get("slug") || "");
    return {
        id: record.id,
        title: String(record.get("title") || ""),
        slug: slug,
        domain: domain,
        short_url: "https://" + domain + "/" + slug,
        destination_url: String(record.get("destination_url") || ""),
        active: record.get("active") === true,
        mode: String(record.get("mode") || "direct"),
        clicks_count: Number(record.get("clicks_count") || 0),
        created: String(record.get("created") || ""),
        updated: String(record.get("updated") || "")
    };
};

var consumeApiRateLimit = function(keyId, limitPerMinute) {
    var now = new Date().getTime();
    var safeLimit = Math.max(1, parseInt(limitPerMinute, 10) || 1);
    var state = API_RATE_WINDOWS[keyId];
    if (!state || now - state.startedAt >= 60000) {
        state = { startedAt: now, count: 0 };
        API_RATE_WINDOWS[keyId] = state;
    }

    var resetAt = state.startedAt + 60000;
    if (state.count >= safeLimit) {
        return {
            allowed: false,
            limit: safeLimit,
            remaining: 0,
            resetAt: Math.ceil(resetAt / 1000)
        };
    }

    state.count++;
    return {
        allowed: true,
        limit: safeLimit,
        remaining: Math.max(0, safeLimit - state.count),
        resetAt: Math.ceil(resetAt / 1000)
    };
};

var authenticateApiRequest = function(c, requiredScope) {
    var requestId = $security.randomString(12);
    var authHeader = "";
    try {
        authHeader = String(c.request.header.get("Authorization") || "");
    } catch (err) {}

    var match = authHeader.match(/^Bearer (ltk_live_[A-Za-z0-9]{10}_[A-Za-z0-9]{40})$/);
    if (!match) {
        return {
            ok: false,
            status: 401,
            code: "invalid_api_key",
            message: "Provide a valid API key in the Authorization Bearer header.",
            requestId: requestId
        };
    }

    var token = match[1];
    var prefix = token.substring(0, token.lastIndexOf("_"));
    var digest = hashApiToken(token);
    if (!digest) {
        $app.logger().error("Public API disabled: API_KEY_PEPPER must contain at least 32 characters.");
        return {
            ok: false,
            status: 503,
            code: "api_unavailable",
            message: "Public API authentication is temporarily unavailable.",
            requestId: requestId
        };
    }

    var keyRecord = null;
    try {
        keyRecord = $app.findFirstRecordByFilter(
            "api_keys",
            "key_prefix = {:prefix} && secret_hash = {:digest} && status = 'active'",
            { prefix: prefix, digest: digest }
        );
    } catch (err) {}
    if (!keyRecord) {
        return {
            ok: false,
            status: 401,
            code: "invalid_api_key",
            message: "The API key is invalid or inactive.",
            requestId: requestId
        };
    }

    var expiresAt = String(keyRecord.get("expires_at") || "");
    if (expiresAt) {
        var expiresMs = new Date(expiresAt).getTime();
        if (!isFinite(expiresMs) || expiresMs <= new Date().getTime()) {
            return {
                ok: false,
                status: 401,
                code: "expired_api_key",
                message: "The API key has expired.",
                requestId: requestId
            };
        }
    }

    var user = null;
    try {
        user = $app.findRecordById("users", keyRecord.get("user_id"));
    } catch (err) {}
    if (!user || user.get("banned") === true) {
        return {
            ok: false,
            status: 401,
            code: "invalid_api_key",
            message: "The API key is invalid or inactive.",
            requestId: requestId
        };
    }

    var plan = getPlanCatalogEntry(user.get("plan") || "creator");
    if (!plan.apiKeys || plan.apiKeys < 1) {
        return {
            ok: false,
            status: 403,
            code: "api_plan_required",
            message: "Public API access is not included in the current plan.",
            requestId: requestId
        };
    }

    var scopes;
    try {
        scopes = normalizeApiScopes(keyRecord.get("scopes"));
    } catch (err) {
        return {
            ok: false,
            status: 401,
            code: "invalid_api_key",
            message: "The API key is invalid or inactive.",
            requestId: requestId
        };
    }
    if (requiredScope && scopes.indexOf(requiredScope) === -1) {
        return {
            ok: false,
            status: 403,
            code: "insufficient_scope",
            message: "This API key does not include the required scope.",
            requestId: requestId
        };
    }

    var rate = consumeApiRateLimit(keyRecord.id, plan.apiRatePerMinute || 60);
    if (!rate.allowed) {
        return {
            ok: false,
            status: 429,
            code: "rate_limit_exceeded",
            message: "Too many API requests. Retry after the current rate-limit window.",
            requestId: requestId,
            rate: rate
        };
    }

    var now = new Date().getTime();
    if (!API_LAST_USED_WRITES[keyRecord.id] || now - API_LAST_USED_WRITES[keyRecord.id] >= 300000) {
        API_LAST_USED_WRITES[keyRecord.id] = now;
        try {
            $app.db().newQuery(
                "UPDATE api_keys SET last_used_at = {:lastUsedAt} WHERE id = {:id}"
            ).bind({
                id: keyRecord.id,
                lastUsedAt: new Date(now).toISOString()
            }).execute();
        } catch (err) {
            $app.logger().warn("Unable to update API key last_used_at for key " + keyRecord.id);
        }
    }

    return {
        ok: true,
        requestId: requestId,
        key: keyRecord,
        user: user,
        scopes: scopes,
        rate: rate
    };
};

var applyApiResponseHeaders = function(c, authResult) {
    c.response.header().add("Cache-Control", "no-store");
    c.response.header().add("X-Request-Id", authResult.requestId || "");
    if (authResult.rate) {
        c.response.header().add("X-RateLimit-Limit", String(authResult.rate.limit));
        c.response.header().add("X-RateLimit-Remaining", String(authResult.rate.remaining));
        c.response.header().add("X-RateLimit-Reset", String(authResult.rate.resetAt));
    }
};

var apiErrorResponse = function(c, authResult) {
    applyApiResponseHeaders(c, authResult);
    if ((authResult.status || 500) === 401) {
        c.response.header().add("WWW-Authenticate", 'Bearer realm="Linktery API"');
    }
    return c.json(authResult.status || 500, {
        error: {
            code: authResult.code || "internal_error",
            message: authResult.message || "The request could not be completed."
        },
        request_id: authResult.requestId || ""
    });
};

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
    "You have already used a promocode on this account": true,
    "This affiliate offer is only available to new accounts": true,
    "You cannot use your own affiliate offer": true
};

var getSafePromocodeError = function(err) {
    var message = String((err && err.message) || "");
    if (PUBLIC_PROMOCODE_ERRORS[message] || /^Your current (creator|pro|agency) plan is higher than the (creator|pro|agency) reward$/.test(message) || /^You already have the (creator|pro|agency) plan$/.test(message)) {
        return message;
    }
    return "We couldn't process this promocode. Please check the code and try again.";
};

var normalizeAffiliateCode = function (value) {
    return String(value || "").trim().replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 40);
};

var getAccountAgeMs = function (record) {
    var created = record ? String(record.get("created") || "") : "";
    var createdMs = created ? new Date(created).getTime() : NaN;
    if (!isFinite(createdMs)) return Number.MAX_SAFE_INTEGER;
    return Math.max(0, new Date().getTime() - createdMs);
};

var ensureAffiliatePartner = function (app, userRecord) {
    var existing = null;
    try {
        existing = app.findFirstRecordByFilter(
            "affiliate_partners",
            "user_id = {:userId}",
            { userId: userRecord.id }
        );
    } catch (error) { }
    if (existing) return existing;

    var partners = app.findCollectionByNameOrId("affiliate_partners");
    var referralCode = "lt" + userRecord.id;
    var partner = new Record(partners, {
        "user_id": userRecord.id,
        "referral_code": referralCode,
        "default_commission_rate_bps": 0,
        "status": "active"
    });
    app.save(partner);
    return partner;
};

var createAffiliateAttribution = function (app, options) {
    var partnerId = String(options.partnerId || "");
    var referredUserId = String(options.referredUserId || "");
    if (!partnerId || !referredUserId) {
        throw new Error("Affiliate attribution requires both accounts");
    }
    if (partnerId === referredUserId) {
        throw new BadRequestError("You cannot use your own affiliate offer");
    }

    var existing = null;
    try {
        existing = app.findFirstRecordByFilter(
            "affiliate_attributions",
            "referred_user_id = {:userId}",
            { userId: referredUserId }
        );
    } catch (error) { }
    if (existing) {
        return { record: existing, created: false };
    }

    var partner = app.findRecordById("users", partnerId);
    var referred = app.findRecordById("users", referredUserId);
    var partnerIp = String(partner.get("created_ip") || "");
    var referredIp = String(referred.get("created_ip") || "");
    var riskStatus = partnerIp && referredIp && partnerIp === referredIp ? "review" : "clear";
    var bps = Math.max(0, Math.min(10000, parseInt(options.commissionRateBps, 10) || 0));
    var collection = app.findCollectionByNameOrId("affiliate_attributions");
    var attribution = new Record(collection, {
        "partner_id": partnerId,
        "referred_user_id": referredUserId,
        "promocode_id": String(options.promocodeId || ""),
        "source": options.source === "promocode" ? "promocode" : "referral_link",
        "referral_code": normalizeAffiliateCode(options.referralCode),
        "commission_rate_bps": bps,
        "commission_eligible": options.commissionEligible === true,
        "risk_status": riskStatus,
        "status": "attributed",
        "attributed_at": new DateTime()
    });
    app.save(attribution);
    return { record: attribution, created: true };
};

// Creates one commission per successfully paid subscription invoice. The
// Stripe invoice id is the durable idempotency key, while the attribution keeps
// the partner and rate frozen for the lifetime of the referred account.
var createAffiliateCommission = function (app, options) {
    var userId = String(options.referredUserId || "");
    var invoiceId = String(options.stripeInvoiceId || "");
    var amountPaidCents = Math.max(0, parseInt(options.amountPaidCents, 10) || 0);
    if (!userId || !invoiceId || amountPaidCents <= 0) return null;

    var attribution = null;
    try {
        attribution = app.findFirstRecordByFilter(
            "affiliate_attributions",
            "referred_user_id = {:userId} && commission_eligible = true",
            { userId: userId }
        );
    } catch (error) {
        return null;
    }
    if (!attribution) return null;

    var rateBps = Math.max(0, Math.min(10000, parseInt(attribution.get("commission_rate_bps"), 10) || 0));
    var commissionCents = Math.floor(amountPaidCents * rateBps / 10000);
    if (commissionCents <= 0) return null;

    try {
        var alreadyCreated = app.findFirstRecordByFilter(
            "affiliate_commissions",
            "stripe_invoice_id = {:invoiceId}",
            { invoiceId: invoiceId }
        );
        if (alreadyCreated) return alreadyCreated;
    } catch (error) { }

    var firstPaidInvoiceId = String(attribution.get("first_paid_invoice_id") || "");
    if (!firstPaidInvoiceId) {
        try {
            var previousCommissions = app.findRecordsByFilter(
                "affiliate_commissions",
                "attribution_id = {:attributionId}",
                "created",
                1,
                0,
                { attributionId: attribution.id }
            );
            if (previousCommissions.length > 0) {
                firstPaidInvoiceId = String(previousCommissions[0].get("stripe_invoice_id") || "");
            }
        } catch (error) { }
    }
    var commissionType = firstPaidInvoiceId ? "renewal" : "initial";

    var collection = app.findCollectionByNameOrId("affiliate_commissions");
    var commission = new Record(collection, {
        "partner_id": attribution.get("partner_id"),
        "referred_user_id": userId,
        "attribution_id": attribution.id,
        "promocode_id": attribution.get("promocode_id") || "",
        "stripe_invoice_id": invoiceId,
        "amount_paid_cents": amountPaidCents,
        "refunded_cents": 0,
        "commission_rate_bps": rateBps,
        "commission_cents": commissionCents,
        "currency": String(options.currency || "usd").toUpperCase().substring(0, 3),
        "plan": String(options.plan || "pro").substring(0, 16),
        "stripe_subscription_id": String(options.stripeSubscriptionId || "").substring(0, 255),
        "billing_reason": String(options.billingReason || "").substring(0, 40),
        "commission_type": commissionType,
        "status": attribution.get("risk_status") === "review" ? "review" : "pending",
        "available_at": new DateTime().addDate(0, 0, 30)
    });
    app.save(commission);

    attribution.set("status", "commissioned");
    if (!firstPaidInvoiceId) {
        attribution.set("first_paid_invoice_id", invoiceId);
    }
    app.save(attribution);
    return commission;
};

var reconcileAffiliateRefund = function (app, stripeInvoiceId, refundedCents) {
    var invoiceId = String(stripeInvoiceId || "");
    var cumulativeRefundCents = Math.max(0, parseInt(refundedCents, 10) || 0);
    if (!invoiceId || cumulativeRefundCents <= 0) return null;

    var commission = null;
    try {
        commission = app.findFirstRecordByFilter(
            "affiliate_commissions",
            "stripe_invoice_id = {:invoiceId}",
            { invoiceId: invoiceId }
        );
    } catch (error) {
        return null;
    }
    if (!commission) return null;

    var paidCents = Math.max(0, parseInt(commission.get("amount_paid_cents"), 10) || 0);
    var normalizedRefund = Math.min(paidCents, cumulativeRefundCents);
    var rateBps = Math.max(0, parseInt(commission.get("commission_rate_bps"), 10) || 0);
    var remainingCents = Math.max(0, paidCents - normalizedRefund);
    var adjustedCommission = Math.floor(remainingCents * rateBps / 10000);

    commission.set("refunded_cents", normalizedRefund);
    commission.set("commission_cents", adjustedCommission);
    if (adjustedCommission <= 0) {
        commission.set("status", "reversed");
        commission.set("reversed_at", new DateTime());
    }
    app.save(commission);
    return commission;
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
    "creator": { "links": 3, "publicProfiles": 1, "monthlyPrice": 0, "analytics": false, "apiKeys": 0, "apiRatePerMinute": 0 },
    "pro": { "links": 15, "publicProfiles": 3, "monthlyPrice": 11, "analytics": true, "apiKeys": 1, "apiRatePerMinute": 60 },
    "agency": { "links": -1, "publicProfiles": 25, "monthlyPrice": 29, "analytics": true, "apiKeys": 1, "apiRatePerMinute": 300 }
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

var escapeHtml = function(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
};

var safeJsonForHtml = function(value) {
    return JSON.stringify(String(value || ""))
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026");
};

var getInAppBrowser = function(userAgent) {
    var ua = String(userAgent || "");
    if (/Instagram/i.test(ua)) return "Instagram";
    if (/TikTok/i.test(ua)) return "TikTok";
    if (/FBAN|FBAV/i.test(ua)) return "Facebook";
    return "";
};

var getDeeplinkDestinationName = function(destination) {
    var value = String(destination || "");
    var match = value.match(/^https?:\/\/([^\/?#]+)/i);
    if (!match) return "";
    var hostname = String(match[1] || "").toLowerCase().replace(/^www\./, "");
    if (hostname === "youtu.be" || hostname === "youtube.com" || /\.youtube\.com$/.test(hostname)) return "YouTube";
    if (hostname === "t.me" || hostname === "telegram.me" || /\.telegram\.me$/.test(hostname)) return "Telegram";
    if (hostname === "open.spotify.com") return "Spotify";
    if (hostname === "tiktok.com" || /\.tiktok\.com$/.test(hostname)) return "TikTok";
    if (hostname === "instagram.com" || /\.instagram\.com$/.test(hostname)) return "Instagram";
    return "";
};

var buildAndroidBrowserIntent = function(destination) {
    var value = String(destination || "");
    var match = value.match(/^(https?):\/\/([^\/?#]+)([^#]*)/i);
    if (!match) return value;
    var scheme = match[1].toLowerCase();
    var target = match[2] + (match[3] || "/");
    return "intent://" + target + "#Intent;scheme=" + scheme +
        ";action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;" +
        "package=com.android.chrome;S.browser_fallback_url=" + encodeURIComponent(value) + ";end";
};

var getDeeplinkHandoffHtml = function(destination, userAgent, pixelScripts, attemptScope) {
    var dest = String(destination || "");
    var ua = String(userAgent || "");
    var sourceApp = getInAppBrowser(ua) || "this app";
    var isAndroid = /Android/i.test(ua);
    var actionUrl = isAndroid ? buildAndroidBrowserIntent(dest) : dest;
    var destinationName = getDeeplinkDestinationName(dest);
    var actionLabel = isAndroid ? "Open in Chrome" : (destinationName ? "Open " + destinationName : "Open destination");
    var safeDest = escapeHtml(dest);
    var safeActionUrl = escapeHtml(actionUrl);
    var attemptKey = "linktery_deeplink_v2_" + String(attemptScope || "link").replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 40);
    var automaticScript = isAndroid && actionUrl !== dest ? `
    <script>
        (function () {
            var key = ${safeJsonForHtml(attemptKey)};
            var action = ${safeJsonForHtml(actionUrl)};
            var now = Date.now();
            try {
                var previous = Number(sessionStorage.getItem(key) || "0");
                if (Number.isFinite(previous) && now - previous < 15000) return;
                sessionStorage.setItem(key, String(now));
            } catch (error) {
                return;
            }
            setTimeout(function () { window.location.href = action; }, 120);
        })();
    </script>` : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <title>Continue to destination</title>
    ${pixelScripts || ""}
    <style>
        :root { color-scheme: dark; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        * { box-sizing: border-box; }
        body { min-height: 100vh; margin: 0; padding: 28px; display: grid; place-items: center; background: #050806; color: #f7faf8; }
        .card { width: min(100%, 420px); padding: 30px; border: 1px solid #20382d; border-radius: 28px; background: #0a120e; box-shadow: 0 24px 80px rgba(0,0,0,.45); }
        .mark { width: 52px; height: 52px; display: grid; place-items: center; border-radius: 16px; background: #22e58b; color: #03130b; font-size: 24px; font-weight: 900; }
        h1 { margin: 0 0 10px; font-size: 28px; line-height: 1.08; letter-spacing: -.04em; }
        p { margin: 0; color: #9dafaa; font-size: 15px; line-height: 1.55; }
        .actions { display: grid; gap: 12px; margin-top: 26px; }
        .button { min-height: 54px; display: flex; align-items: center; justify-content: center; padding: 0 20px; border-radius: 15px; text-decoration: none; font-weight: 800; }
        .primary { background: #22e58b; color: #03130b; }
        .secondary { border: 1px solid #294137; color: #e9f3ee; background: #101b16; }
        .hint { margin-top: 22px; padding: 16px; border-radius: 16px; background: #0f1a15; border: 1px solid #1c3027; color: #9dafaa; font-size: 13px; line-height: 1.5; }
        .hint strong { color: #e9f3ee; }
        .eyebrow { margin: 24px 0 10px; color: #22e58b; font-size: 11px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
        .brand { margin-top: 24px; color: #61756c; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; text-align: center; }
        .button:focus-visible { outline: 2px solid #22e58b; outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
    </style>
</head>
<body>
    <main class="card">
        <div class="mark">&#8599;</div>
        <div class="eyebrow">Deeplink handoff</div>
        <h1>${isAndroid ? "Opening your browser&hellip;" : "Continue outside " + escapeHtml(sourceApp)}</h1>
        <p>${isAndroid
            ? "Linktery is making one safe attempt to leave " + escapeHtml(sourceApp) + ". If it is blocked, tap the button below."
            : "Tap below to open the supported app or destination. iOS may still require the browser menu."}</p>
        <div class="actions">
            <a class="button primary" href="${safeActionUrl}" rel="noopener noreferrer">${actionLabel}</a>
            <a class="button secondary" href="${safeDest}" rel="noopener noreferrer">Continue inside ${escapeHtml(sourceApp)}</a>
        </div>
        <div class="hint">If the first button stays inside ${escapeHtml(sourceApp)}, tap <strong>&#8942;</strong> and choose <strong>Open in browser</strong>. Linktery attempts the automatic handoff only once, so this page cannot create a redirect loop.</div>
        <div class="brand">Powered by Linktery</div>
    </main>
    ${automaticScript}
</body>
</html>`;
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
    SYSTEM_ROUTE_SLUGS,
    isReservedPublicSlug,
    validatePublicSlug,
    getClientIP,
    clickRateLimitAllows,
    isUniqueTrackedClick,
    API_ALLOWED_SCOPES,
    normalizeApiScopes,
    getApiKeyPepper,
    hashApiToken,
    getApiKeyEncryptionKey,
    encryptApiToken,
    decryptApiToken,
    revealApiToken,
    createManagedApiKey,
    serializeApiKey,
    serializeApiLink,
    authenticateApiRequest,
    applyApiResponseHeaders,
    apiErrorResponse,
    TIER_1_COUNTRIES,
    TIER_2_COUNTRIES,
    getCountryTierKey,
    getRedirectLoopHtml,
    getSafePromocodeError,
    normalizeAffiliateCode,
    getAccountAgeMs,
    ensureAffiliatePartner,
    createAffiliateAttribution,
    createAffiliateCommission,
    reconcileAffiliateRefund,
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
    validateProfilePresentation,
    escapeHtml,
    safeJsonForHtml,
    getInAppBrowser,
    getDeeplinkDestinationName,
    buildAndroidBrowserIntent,
    getDeeplinkHandoffHtml
};
