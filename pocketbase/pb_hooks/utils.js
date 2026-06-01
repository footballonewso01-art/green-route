// pocketbase/pb_hooks/utils.js

var RATE_LIMIT_STORE = {};
var RATE_LIMIT_LAST_RESET = new Date().getTime();

var GEO_CACHE = {};
var GEO_CACHE_SIZE = 0;
var GEO_CACHE_MAX = 10000;
var GEO_CACHE_CREATED = new Date().getTime();

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

module.exports = {
    RATE_LIMIT_STORE,
    RATE_LIMIT_LAST_RESET,
    GEO_CACHE,
    GEO_CACHE_SIZE,
    GEO_CACHE_MAX,
    GEO_CACHE_CREATED,
    readerToString,
    FLY_REGION_MAP,
    resolveCountryFromIP,
    getAuthInfo,
    validateTargetingUrls,
    validateProfileSocialLinks
};
