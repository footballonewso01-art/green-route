// Linktery Public API v1 service layer.
//
// Custom PocketBase routes do not execute Records API request hooks. Every
// mutation therefore performs authentication, strict DTO validation,
// ownership checks and shared business validation explicitly in this module.

var utils = require("./utils.js");

var MAX_JSON_BODY_BYTES = 64 * 1024;
var MAX_PAGE = 1000;
var ANALYTICS_PERIODS = {
    "24h": { cutoff: "-23 hours", points: 24, granularity: "hour" },
    "7d": { cutoff: "-6 days", points: 7, granularity: "day" },
    "30d": { cutoff: "-29 days", points: 30, granularity: "day" },
    "90d": { cutoff: "-89 days", points: 90, granularity: "day" }
};
var LINK_MUTATION_FIELDS = {
    "title": true,
    "slug": true,
    "domain": true,
    "destination_url": true,
    "active": true
};

var errorResponse = function(c, auth, status, code, message, retryAfterResetAt) {
    return utils.apiErrorResponse(c, {
        status: status,
        code: code,
        message: message,
        requestId: auth && auth.requestId ? auth.requestId : $security.randomString(12),
        rate: auth && auth.rate ? auth.rate : null,
        retryAfterResetAt: retryAfterResetAt || 0
    });
};

var stableJson = function(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) {
        return "[" + value.map(function(item) { return stableJson(item); }).join(",") + "]";
    }
    var keys = Object.keys(value).sort();
    var parts = [];
    for (var i = 0; i < keys.length; i++) {
        parts.push(JSON.stringify(keys[i]) + ":" + stableJson(value[keys[i]]));
    }
    return "{" + parts.join(",") + "}";
};

var parseStrictJsonBody = function(c, allowedFields, requireAtLeastOne) {
    var contentType = "";
    var contentLength = 0;
    var transferEncoding = "";
    try {
        contentType = String(c.request.header.get("Content-Type") || "").toLowerCase();
        contentLength = parseInt(c.request.header.get("Content-Length") || "0", 10) || 0;
        transferEncoding = String(c.request.header.get("Transfer-Encoding") || "").toLowerCase();
    } catch (err) {}

    if (contentType.split(";")[0].trim() !== "application/json") {
        return { ok: false, status: 415, code: "unsupported_media_type", message: "Use Content-Type: application/json." };
    }
    // PocketBase 0.24's body-limit middleware does not consistently reject a
    // chunked body before requestInfo() reads it. Public API mutations require
    // a truthful Content-Length so oversized payloads are rejected pre-parse.
    if (contentLength <= 0 || transferEncoding.indexOf("chunked") !== -1) {
        return { ok: false, status: 411, code: "length_required", message: "Send a Content-Length header with the JSON request body." };
    }
    if (contentLength > MAX_JSON_BODY_BYTES) {
        return { ok: false, status: 413, code: "payload_too_large", message: "The JSON request body must not exceed 64 KB." };
    }

    var body;
    try {
        var info = c.requestInfo();
        body = info && info.body ? info.body : {};
    } catch (err) {
        return { ok: false, status: 400, code: "invalid_json", message: "The request body must contain valid JSON." };
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { ok: false, status: 400, code: "invalid_request", message: "The JSON body must be an object." };
    }

    var keys = Object.keys(body);
    if (requireAtLeastOne && keys.length === 0) {
        return { ok: false, status: 400, code: "empty_update", message: "Provide at least one field to update." };
    }
    for (var i = 0; i < keys.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(allowedFields, keys[i])) {
            return {
                ok: false,
                status: 400,
                code: "unknown_field",
                message: "Unsupported request field: " + keys[i] + "."
            };
        }
        var fieldValue = body[keys[i]];
        if (fieldValue !== null && typeof fieldValue === "object") {
            return {
                ok: false,
                status: 400,
                code: "invalid_field_type",
                message: "Link fields must contain scalar values."
            };
        }
    }

    // The route-level bodyLimit middleware caps raw bytes before requestInfo()
    // parses them. At this point all five allowed fields are scalar, so stable
    // canonicalization cannot recurse through attacker-controlled structures.
    var serialized = stableJson(body);
    if (serialized.length > MAX_JSON_BODY_BYTES) {
        return { ok: false, status: 413, code: "payload_too_large", message: "The JSON request body must not exceed 64 KB." };
    }

    return { ok: true, body: body, canonical: serialized };
};

var validateTitle = function(value) {
    if (typeof value !== "string") throw new BadRequestError("title must be a string.");
    var title = value.trim();
    if (title.length > 100) throw new BadRequestError("title must be 100 characters or fewer.");
    return title;
};

var validateDestination = function(value) {
    if (typeof value !== "string") throw new BadRequestError("destination_url must be a string.");
    var destination = value.trim();
    if (!destination || destination.length > 2048) {
        throw new BadRequestError("destination_url must be between 1 and 2048 characters.");
    }
    if (/[^\x20-\x7E]/.test(destination) || !/^https?:\/\/[^\s/?#]+(?::\d{1,5})?(?:[/?#][^\s]*)?$/i.test(destination)) {
        throw new BadRequestError("destination_url must be a valid http or https URL.");
    }
    return destination;
};

var validateActive = function(value) {
    if (typeof value !== "boolean") throw new BadRequestError("active must be a boolean.");
    return value;
};

var validateSlugInput = function(value) {
    if (typeof value !== "string") throw new BadRequestError("slug must be a string.");
    return utils.validatePublicSlug(value);
};

var generateAvailableSlug = function(app) {
    for (var attempt = 0; attempt < 20; attempt++) {
        var candidate = $security.randomString(12).toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 10);
        if (candidate.length < 8 || utils.isReservedPublicSlug(candidate)) continue;
        var occupied = false;
        try { app.findFirstRecordByFilter("links", "slug = {:slug}", { slug: candidate }); occupied = true; } catch (err) {}
        if (!occupied) {
            try { app.findFirstRecordByFilter("public_profiles", "slug = {:slug}", { slug: candidate }); occupied = true; } catch (err) {}
        }
        if (!occupied) return candidate;
    }
    throw new Error("Unable to allocate a unique slug.");
};

var getOwnedLink = function(app, userId, linkId) {
    if (!/^[a-z0-9]{15}$/.test(String(linkId || ""))) return null;
    try {
        return app.findFirstRecordByFilter(
            "links",
            "id = {:id} && user_id = {:userId}",
            { id: String(linkId), userId: String(userId) }
        );
    } catch (err) {
        return null;
    }
};

var getOwnedProfile = function(app, userId, profileId) {
    if (!/^[a-z0-9]{15}$/.test(String(profileId || ""))) return null;
    try {
        return app.findFirstRecordByFilter(
            "public_profiles",
            "id = {:id} && user_id = {:userId}",
            { id: String(profileId), userId: String(userId) }
        );
    } catch (err) {
        return null;
    }
};

var getIdempotencyKey = function(c) {
    var value = "";
    try { value = String(c.request.header.get("Idempotency-Key") || "").trim(); } catch (err) {}
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(value)) {
        throw new BadRequestError("Provide an Idempotency-Key containing 8-128 letters, numbers, dots, colons, underscores, or hyphens.");
    }
    return value;
};

var getNextUtcDayEpochSeconds = function() {
    var now = new Date();
    return Math.floor(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0, 0
    ) / 1000);
};

var consumeDailyMutationAllowance = function(app, userId, plan, isCreate) {
    var usageDate = new Date().toISOString().substring(0, 10);
    var writeLimit = Math.max(1, Number(plan.apiWriteDailyLimit || 1));
    var createLimit = Math.max(1, Number(plan.apiCreateDailyLimit || 1));
    var rows = arrayOf(new DynamicModel({ "write_count": 0, "create_count": 0 }));
    app.db().newQuery(`
        SELECT write_count, create_count
        FROM api_usage_daily
        WHERE user_id = {:userId} AND usage_date = {:usageDate}
        LIMIT 1
    `).bind({ userId: userId, usageDate: usageDate }).all(rows);

    var writeCount = rows.length > 0 ? Number(rows[0].write_count || 0) : 0;
    var createCount = rows.length > 0 ? Number(rows[0].create_count || 0) : 0;
    if (isCreate && createCount >= createLimit) {
        throw new BadRequestError("API_DAILY_CREATE_LIMIT");
    }
    if (writeCount >= writeLimit) {
        throw new BadRequestError("API_DAILY_WRITE_LIMIT");
    }

    app.db().newQuery(`
        INSERT INTO api_usage_daily (
            user_id, usage_date, write_count, create_count, updated
        ) VALUES (
            {:userId}, {:usageDate}, 1, {:createIncrement}, datetime('now')
        )
        ON CONFLICT(user_id, usage_date) DO UPDATE SET
            write_count = api_usage_daily.write_count + 1,
            create_count = api_usage_daily.create_count + excluded.create_count,
            updated = datetime('now')
    `).bind({
        userId: userId,
        usageDate: usageDate,
        createIncrement: isCreate ? 1 : 0
    }).execute();
};

var dailyQuotaErrorResponse = function(c, auth, code, message) {
    return errorResponse(c, auth, 429, code, message, getNextUtcDayEpochSeconds());
};

var recordMutationAudit = function(auth, method, path, resourceType, resourceId, status) {
    try {
        $app.db().newQuery(`
            INSERT INTO api_mutation_audit (
                id, user_id, api_key_id, method, path, resource_type,
                resource_id, response_status, request_id, created
            ) VALUES (
                {:id}, {:userId}, {:apiKeyId}, {:method}, {:path}, {:resourceType},
                {:resourceId}, {:status}, {:requestId}, datetime('now')
            )
        `).bind({
            id: $security.randomString(20),
            userId: auth.user.id,
            apiKeyId: auth.key.id,
            method: method,
            path: path,
            resourceType: resourceType,
            resourceId: resourceId || "",
            status: status,
            requestId: auth.requestId
        }).execute();
    } catch (err) {
        $app.logger().warn("Unable to write Public API mutation audit request_id=" + auth.requestId + ": " + err);
    }
};

var isKnownSlugConflict = function(error) {
    var message = String(error || "").toLowerCase();
    return message.indexOf("unique constraint failed: links.slug") !== -1
        || message.indexOf("slug is already used") !== -1
        || message.indexOf("slug is already taken") !== -1;
};

var createLink = function(c) {
    var auth = utils.authenticateApiRequest(c, "links:write", "write");
    if (!auth.ok) return utils.apiErrorResponse(c, auth);

    var parsed = parseStrictJsonBody(c, LINK_MUTATION_FIELDS, false);
    if (!parsed.ok) return errorResponse(c, auth, parsed.status, parsed.code, parsed.message);
    if (!Object.prototype.hasOwnProperty.call(parsed.body, "destination_url")) {
        return errorResponse(c, auth, 400, "missing_field", "destination_url is required.");
    }

    var idempotencyKey;
    try {
        idempotencyKey = getIdempotencyKey(c);
    } catch (err) {
        return errorResponse(c, auth, 400, "invalid_idempotency_key", String(err.message || err));
    }

    var plan = auth.plan || utils.getApiPlanCatalogEntryForUser(auth.user);
    var requestedSlug = Object.prototype.hasOwnProperty.call(parsed.body, "slug");
    if (requestedSlug && !plan.customSlug && auth.user.get("role") !== "admin") {
        return errorResponse(c, auth, 403, "feature_not_available", "Custom slugs require the Agency plan.");
    }

    var endpoint = "POST:/api/v1/links";
    var requestHash = $security.sha256(parsed.canonical);
    var resultId = "";
    var replayed = false;

    try {
        $app.runInTransaction((txApp) => {
            var rows = arrayOf(new DynamicModel({ "request_hash": "", "resource_id": "" }));
            txApp.db().newQuery(`
                SELECT request_hash, resource_id
                FROM api_idempotency
                WHERE api_key_id = {:apiKeyId}
                  AND endpoint = {:endpoint}
                  AND idempotency_key = {:idempotencyKey}
                LIMIT 1
            `).bind({
                apiKeyId: auth.key.id,
                endpoint: endpoint,
                idempotencyKey: idempotencyKey
            }).all(rows);

            if (rows.length > 0) {
                if (String(rows[0].request_hash) !== requestHash) {
                    throw new BadRequestError("IDEMPOTENCY_CONFLICT");
                }
                var replayRecord = getOwnedLink(txApp, auth.user.id, rows[0].resource_id);
                if (!replayRecord) throw new BadRequestError("IDEMPOTENCY_RESOURCE_GONE");
                resultId = replayRecord.id;
                replayed = true;
                return;
            }

            consumeDailyMutationAllowance(txApp, auth.user.id, plan, true);

            var slug = requestedSlug
                ? validateSlugInput(parsed.body.slug)
                : generateAvailableSlug(txApp);
            var collection = txApp.findCollectionByNameOrId("links");
            var record = new Record(collection, {
                user_id: auth.user.id,
                title: Object.prototype.hasOwnProperty.call(parsed.body, "title") ? validateTitle(parsed.body.title) : "",
                slug: slug,
                domain: Object.prototype.hasOwnProperty.call(parsed.body, "domain")
                    ? utils.normalizeLinkDomain(parsed.body.domain)
                    : "linktery.com",
                destination_url: validateDestination(parsed.body.destination_url),
                active: Object.prototype.hasOwnProperty.call(parsed.body, "active")
                    ? validateActive(parsed.body.active)
                    : true,
                mode: "redirect",
                show_on_profile: false,
                profile_id: "",
                clicks_count: 0,
                system_route_active: false,
                system_route_override: ""
            });

            utils.enforceLinkCreateOwnershipAndEntitlements(
                txApp,
                record,
                auth.user.id,
                auth.user.get("role") === "admin"
            );
            utils.sanitizeLinkSystemFields(record, auth.user.get("role") === "admin");
            utils.validateLinkRecordForMutation(txApp, record);
            txApp.save(record);

            txApp.db().newQuery(`
                INSERT INTO api_idempotency (
                    api_key_id, endpoint, idempotency_key, request_hash,
                    resource_type, resource_id, created
                ) VALUES (
                    {:apiKeyId}, {:endpoint}, {:idempotencyKey}, {:requestHash},
                    'link', {:resourceId}, datetime('now')
                )
            `).bind({
                apiKeyId: auth.key.id,
                endpoint: endpoint,
                idempotencyKey: idempotencyKey,
                requestHash: requestHash,
                resourceId: record.id
            }).execute();
            resultId = record.id;
        });
    } catch (err) {
        if (err instanceof BadRequestError) {
            var safeMessage = String(err.message || err);
            if (safeMessage.indexOf("API_DAILY_CREATE_LIMIT") !== -1) {
                return dailyQuotaErrorResponse(c, auth, "daily_create_limit_exceeded", "The daily API Link creation safety limit has been reached.");
            }
            if (safeMessage.indexOf("API_DAILY_WRITE_LIMIT") !== -1) {
                return dailyQuotaErrorResponse(c, auth, "daily_write_limit_exceeded", "The daily API write safety limit has been reached.");
            }
            if (safeMessage.indexOf("IDEMPOTENCY_CONFLICT") !== -1) {
                return errorResponse(c, auth, 409, "idempotency_conflict", "This Idempotency-Key was already used with a different request body.");
            }
            if (safeMessage.indexOf("IDEMPOTENCY_RESOURCE_GONE") !== -1) {
                return errorResponse(c, auth, 409, "idempotency_resource_gone", "The original resource for this Idempotency-Key is no longer available.");
            }
            if (safeMessage.indexOf("link limit") !== -1) {
                return errorResponse(c, auth, 409, "link_limit_reached", "Your current plan link limit has been reached.");
            }
            return errorResponse(c, auth, 400, "invalid_request", safeMessage);
        }
        if (isKnownSlugConflict(err)) {
            return errorResponse(c, auth, 409, "slug_conflict", "This slug is already in use.");
        }
        $app.logger().error("Public API link create failed request_id=" + auth.requestId + ": " + err);
        return errorResponse(c, auth, 500, "internal_error", "Unable to create the link.");
    }

    var saved = getOwnedLink($app, auth.user.id, resultId);
    if (!saved) {
        $app.logger().error("Public API created link could not be reloaded request_id=" + auth.requestId);
        return errorResponse(c, auth, 500, "internal_error", "Unable to load the created link.");
    }
    utils.applyApiResponseHeaders(c, auth);
    c.response.header().add("ETag", utils.getApiLinkEtag(saved));
    c.response.header().add("Location", "/api/v1/links/" + saved.id);
    if (!replayed) {
        recordMutationAudit(auth, "POST", "/api/v1/links", "link", saved.id, 201);
    }
    return c.json(201, {
        data: utils.serializeApiLink(saved),
        meta: { idempotent_replay: replayed, request_id: auth.requestId }
    });
};

var updateLink = function(c) {
    var auth = utils.authenticateApiRequest(c, "links:write", "write");
    if (!auth.ok) return utils.apiErrorResponse(c, auth);

    var linkId = String(c.request.pathValue("id") || "");
    var current = getOwnedLink($app, auth.user.id, linkId);
    if (!current) return errorResponse(c, auth, 404, "not_found", "Link not found.");

    var ifMatch = "";
    try { ifMatch = String(c.request.header.get("If-Match") || "").trim(); } catch (err) {}
    if (!ifMatch) {
        return errorResponse(c, auth, 428, "precondition_required", "Send the current link etag in the If-Match header.");
    }
    if (ifMatch !== utils.getApiLinkEtag(current)) {
        return errorResponse(c, auth, 412, "precondition_failed", "The link changed since it was read. Fetch it again and retry.");
    }

    var parsed = parseStrictJsonBody(c, LINK_MUTATION_FIELDS, true);
    if (!parsed.ok) return errorResponse(c, auth, parsed.status, parsed.code, parsed.message);

    var plan = auth.plan || utils.getApiPlanCatalogEntryForUser(auth.user);
    if (Object.prototype.hasOwnProperty.call(parsed.body, "slug") && !plan.customSlug && auth.user.get("role") !== "admin") {
        return errorResponse(c, auth, 403, "feature_not_available", "Custom slugs require the Agency plan.");
    }

    var resultId = "";
    try {
        $app.runInTransaction((txApp) => {
            var record = getOwnedLink(txApp, auth.user.id, linkId);
            if (!record) throw new BadRequestError("LINK_NOT_FOUND");
            if (utils.getApiLinkEtag(record) !== ifMatch) throw new BadRequestError("ETAG_MISMATCH");

            consumeDailyMutationAllowance(txApp, auth.user.id, plan, false);

            var body = parsed.body;
            if (Object.prototype.hasOwnProperty.call(body, "title")) record.set("title", validateTitle(body.title));
            if (Object.prototype.hasOwnProperty.call(body, "slug")) record.set("slug", validateSlugInput(body.slug));
            if (Object.prototype.hasOwnProperty.call(body, "domain")) record.set("domain", utils.normalizeLinkDomain(body.domain));
            if (Object.prototype.hasOwnProperty.call(body, "destination_url")) record.set("destination_url", validateDestination(body.destination_url));
            if (Object.prototype.hasOwnProperty.call(body, "active")) record.set("active", validateActive(body.active));

            utils.sanitizeLinkSystemFields(record, auth.user.get("role") === "admin");
            utils.validateLinkRecordForMutation(txApp, record);
            txApp.save(record);
            resultId = record.id;
        });
    } catch (err) {
        if (err instanceof BadRequestError) {
            var safeMessage = String(err.message || err);
            if (safeMessage.indexOf("API_DAILY_WRITE_LIMIT") !== -1) {
                return dailyQuotaErrorResponse(c, auth, "daily_write_limit_exceeded", "The daily API write safety limit has been reached.");
            }
            if (safeMessage.indexOf("LINK_NOT_FOUND") !== -1) {
                return errorResponse(c, auth, 404, "not_found", "Link not found.");
            }
            if (safeMessage.indexOf("ETAG_MISMATCH") !== -1) {
                return errorResponse(c, auth, 412, "precondition_failed", "The link changed since it was read. Fetch it again and retry.");
            }
            return errorResponse(c, auth, 400, "invalid_request", safeMessage);
        }
        if (isKnownSlugConflict(err)) {
            return errorResponse(c, auth, 409, "slug_conflict", "This slug is already in use.");
        }
        $app.logger().error("Public API link update failed request_id=" + auth.requestId + ": " + err);
        return errorResponse(c, auth, 500, "internal_error", "Unable to update the link.");
    }

    var saved = getOwnedLink($app, auth.user.id, resultId);
    if (!saved) return errorResponse(c, auth, 500, "internal_error", "Unable to load the updated link.");
    utils.applyApiResponseHeaders(c, auth);
    c.response.header().add("ETag", utils.getApiLinkEtag(saved));
    recordMutationAudit(auth, "PATCH", "/api/v1/links/{id}", "link", saved.id, 200);
    return c.json(200, { data: utils.serializeApiLink(saved), request_id: auth.requestId });
};

var parsePagination = function(c) {
    var query = c.request.url.query();
    var page = parseInt(query.get("page") || "1", 10) || 1;
    var perPage = parseInt(query.get("per_page") || "25", 10) || 25;
    return {
        page: Math.max(1, Math.min(MAX_PAGE, page)),
        perPage: Math.max(1, Math.min(100, perPage))
    };
};

var analyticsCutoffSql = function(config) {
    return config.granularity === "hour"
        ? "strftime('%Y-%m-%dT%H:00:00Z', 'now', {:cutoff})"
        : "strftime('%Y-%m-%dT00:00:00Z', 'now', {:cutoff})";
};

var analyticsBucketSql = function(config) {
    return config.granularity === "hour" ? "r.bucket" : "substr(r.bucket, 1, 10)";
};

var analyticsBucketLabel = function(date, granularity) {
    var iso = date.toISOString();
    return granularity === "hour" ? iso.substring(0, 13) + ":00:00Z" : iso.substring(0, 10);
};

var fillAnalyticsSeries = function(rows, config) {
    var byBucket = {};
    for (var i = 0; i < rows.length; i++) {
        byBucket[String(rows[i].bucket || "")] = {
            clicks: Number(rows[i].clicks || 0),
            unique_clicks: Number(rows[i].unique_clicks || 0)
        };
    }

    var end = new Date();
    if (config.granularity === "hour") end.setUTCMinutes(0, 0, 0);
    else end.setUTCHours(0, 0, 0, 0);

    var result = [];
    for (var offset = config.points - 1; offset >= 0; offset--) {
        var cursor = new Date(end.getTime());
        if (config.granularity === "hour") cursor.setUTCHours(cursor.getUTCHours() - offset);
        else cursor.setUTCDate(cursor.getUTCDate() - offset);
        var bucket = analyticsBucketLabel(cursor, config.granularity);
        var values = byBucket[bucket] || { clicks: 0, unique_clicks: 0 };
        result.push({
            bucket: bucket,
            clicks: values.clicks,
            unique_clicks: values.unique_clicks
        });
    }
    return result;
};

var queryAnalyticsBreakdowns = function(db, linkId, config, totalClicks) {
    var rows = arrayOf(new DynamicModel({
        "dimension_type": "", "name": "", "clicks": 0
    }));
    db.newQuery(`
        WITH grouped AS (
            SELECT
                r.dimension_type,
                r.dimension_value AS name,
                sum(r.total) AS clicks
            FROM analytics_hourly_rollup r INDEXED BY idx_analytics_rollup_lookup
            WHERE r.link_id = {:linkId}
              AND r.bucket >= ${analyticsCutoffSql(config)}
              AND r.dimension_type IN ('country', 'referrer', 'device', 'browser', 'os')
            GROUP BY r.dimension_type, r.dimension_value
        ), ranked AS (
            SELECT
                dimension_type,
                name,
                clicks,
                ROW_NUMBER() OVER (
                    PARTITION BY dimension_type
                    ORDER BY clicks DESC, name ASC
                ) AS rank_order
            FROM grouped
        )
        SELECT dimension_type, name, clicks
        FROM ranked
        WHERE rank_order <= 20
        ORDER BY dimension_type ASC, rank_order ASC
    `).bind({
        linkId: linkId,
        cutoff: config.cutoff
    }).all(rows);

    var output = {
        countries: [],
        referrers: [],
        devices: [],
        browsers: [],
        operating_systems: []
    };
    var outputKeys = {
        country: "countries",
        referrer: "referrers",
        device: "devices",
        browser: "browsers",
        os: "operating_systems"
    };
    for (var i = 0; i < rows.length; i++) {
        var outputKey = outputKeys[String(rows[i].dimension_type || "")];
        if (!outputKey) continue;
        var clicks = Number(rows[i].clicks || 0);
        output[outputKey].push({
            name: String(rows[i].name || ""),
            clicks: clicks,
            percentage: totalClicks > 0 ? Math.round((clicks / totalClicks) * 10000) / 100 : 0
        });
    }
    return output;
};

var readLinkAnalytics = function(c) {
    var auth = utils.authenticateApiRequest(c, "analytics:read", "analytics");
    if (!auth.ok) return utils.apiErrorResponse(c, auth);

    var linkId = String(c.request.pathValue("id") || "");
    var link = getOwnedLink($app, auth.user.id, linkId);
    if (!link) return errorResponse(c, auth, 404, "not_found", "Link not found.");
    if (!auth.plan.analytics && auth.user.get("role") !== "admin") {
        return errorResponse(c, auth, 403, "feature_not_available", "Analytics requires Creator Pro or Agency.");
    }

    var period = String(c.request.url.query().get("period") || "30d");
    var config = ANALYTICS_PERIODS[period];
    if (!config) {
        return errorResponse(c, auth, 400, "invalid_period", "period must be one of: 24h, 7d, 30d, 90d.");
    }

    var cacheKey = "public-api-link-analytics|" + auth.user.id + "|" + link.id + "|" + period;
    var cached = utils.getAnalyticsCache(cacheKey);
    if (cached) {
        utils.applyApiResponseHeaders(c, auth);
        return c.json(200, {
            data: cached.data,
            meta: {
                generated_at: cached.generatedAt,
                request_id: auth.requestId
            }
        });
    }

    if (utils.ANALYTICS_INFLIGHT[cacheKey]) {
        return errorResponse(c, auth, 409, "request_in_progress", "This analytics result is already being generated. Retry shortly.");
    }
    utils.ANALYTICS_INFLIGHT[cacheKey] = true;
    var startedAt = new Date().getTime();

    try {
        var db = $app.db();
        var rollupState = new DynamicModel({ "status": "pending" });
        db.newQuery("SELECT status FROM analytics_rollup_state WHERE id = 'historical'").one(rollupState);
        if (rollupState.status !== "complete") {
            return errorResponse(c, auth, 503, "analytics_not_ready", "Analytics history is being optimized. Retry shortly.");
        }

        var totalRow = new DynamicModel({ "clicks": 0, "unique_clicks": 0 });
        db.newQuery(`
            SELECT
                COALESCE(sum(r.total), 0) AS clicks,
                COALESCE(sum(r.unique_count), 0) AS unique_clicks
            FROM analytics_hourly_rollup r INDEXED BY idx_analytics_rollup_lookup
            WHERE r.link_id = {:linkId}
              AND r.bucket >= ${analyticsCutoffSql(config)}
              AND r.dimension_type = 'all'
        `).bind({ linkId: link.id, cutoff: config.cutoff }).one(totalRow);

        var seriesRows = arrayOf(new DynamicModel({
            "bucket": "", "clicks": 0, "unique_clicks": 0
        }));
        var bucketSql = analyticsBucketSql(config);
        db.newQuery(`
            SELECT
                ${bucketSql} AS bucket,
                sum(r.total) AS clicks,
                sum(r.unique_count) AS unique_clicks
            FROM analytics_hourly_rollup r INDEXED BY idx_analytics_rollup_lookup
            WHERE r.link_id = {:linkId}
              AND r.bucket >= ${analyticsCutoffSql(config)}
              AND r.dimension_type = 'all'
            GROUP BY ${bucketSql}
            ORDER BY bucket ASC
        `).bind({ linkId: link.id, cutoff: config.cutoff }).all(seriesRows);

        var totalClicks = Number(totalRow.clicks || 0);
        var series = fillAnalyticsSeries(seriesRows, config);
        var breakdowns = queryAnalyticsBreakdowns(db, link.id, config, totalClicks);
        var data = {
            link: {
                id: link.id,
                title: String(link.get("title") || ""),
                slug: String(link.get("slug") || ""),
                domain: String(link.get("domain") || "linktery.com"),
                short_url: "https://" + String(link.get("domain") || "linktery.com") + "/" + String(link.get("slug") || "")
            },
            period: period,
            timezone: "UTC",
            granularity: config.granularity,
            window: {
                from: series.length > 0 ? series[0].bucket : "",
                to: series.length > 0 ? series[series.length - 1].bucket : ""
            },
            summary: {
                clicks: totalClicks,
                unique_clicks: Number(totalRow.unique_clicks || 0)
            },
            timeseries: series,
            breakdowns: breakdowns
        };
        var generatedAt = new Date().toISOString();
        utils.setAnalyticsCache(cacheKey, { data: data, generatedAt: generatedAt }, 30000);
        var queryMs = new Date().getTime() - startedAt;
        if (queryMs > 1000) {
            $app.logger().warn("Slow Public API analytics query link=" + link.id + " request_id=" + auth.requestId + " durationMs=" + queryMs);
        }
        utils.applyApiResponseHeaders(c, auth);
        return c.json(200, {
            data: data,
            meta: {
                generated_at: generatedAt,
                request_id: auth.requestId
            }
        });
    } catch (err) {
        $app.logger().error("Public API link analytics failed request_id=" + auth.requestId + ": " + err);
        return errorResponse(c, auth, 500, "internal_error", "Unable to load Link analytics.");
    } finally {
        delete utils.ANALYTICS_INFLIGHT[cacheKey];
    }
};

var listProfiles = function(c) {
    var auth = utils.authenticateApiRequest(c, "profiles:read", "read");
    if (!auth.ok) return utils.apiErrorResponse(c, auth);
    try {
        var pagination = parsePagination(c);
        var offset = (pagination.page - 1) * pagination.perPage;
        var count = new DynamicModel({ "total": 0 });
        $app.db().newQuery(
            "SELECT count(*) AS total FROM public_profiles WHERE user_id = {:userId}"
        ).bind({ userId: auth.user.id }).one(count);
        var total = Number(count.total || 0);
        var records = $app.findRecordsByFilter(
            "public_profiles",
            "user_id = {:userId}",
            "-created",
            pagination.perPage,
            offset,
            { userId: auth.user.id }
        );
        var items = [];
        for (var i = 0; i < records.length; i++) items.push(utils.serializeApiProfile(records[i]));
        utils.applyApiResponseHeaders(c, auth);
        return c.json(200, {
            data: items,
            meta: {
                page: pagination.page,
                per_page: pagination.perPage,
                total: total,
                total_pages: Math.ceil(total / pagination.perPage),
                request_id: auth.requestId
            }
        });
    } catch (err) {
        $app.logger().error("Public API profiles list failed request_id=" + auth.requestId + ": " + err);
        return errorResponse(c, auth, 500, "internal_error", "Unable to load Public Profiles.");
    }
};

var readProfile = function(c) {
    var auth = utils.authenticateApiRequest(c, "profiles:read", "read");
    if (!auth.ok) return utils.apiErrorResponse(c, auth);
    var profile = getOwnedProfile($app, auth.user.id, c.request.pathValue("id"));
    if (!profile) return errorResponse(c, auth, 404, "not_found", "Public Profile not found.");
    utils.applyApiResponseHeaders(c, auth);
    return c.json(200, { data: utils.serializeApiProfile(profile), request_id: auth.requestId });
};

var listProfileLinks = function(c) {
    var auth = utils.authenticateApiRequest(c, "profiles:read", "read");
    if (!auth.ok) return utils.apiErrorResponse(c, auth);
    // Composition rows embed the private Link API representation (destination
    // and counters), so this endpoint intentionally requires both scopes.
    if (auth.scopes.indexOf("links:read") === -1) {
        return errorResponse(c, auth, 403, "insufficient_scope", "This API key does not include the required scope.");
    }
    var profileId = String(c.request.pathValue("id") || "");
    var profile = getOwnedProfile($app, auth.user.id, profileId);
    if (!profile) return errorResponse(c, auth, 404, "not_found", "Public Profile not found.");

    try {
        var pagination = parsePagination(c);
        var offset = (pagination.page - 1) * pagination.perPage;
        var count = new DynamicModel({ "total": 0 });
        $app.db().newQuery(`
            SELECT count(*) AS total
            FROM profile_links pl
            JOIN links l ON l.id = pl.link_id AND l.user_id = pl.user_id
            WHERE pl.user_id = {:userId} AND pl.profile_id = {:profileId}
        `).bind({ userId: auth.user.id, profileId: profileId }).one(count);
        var total = Number(count.total || 0);
        var rows = arrayOf(new DynamicModel({
            "assignment_id": "",
            "order_value": 0,
            "visible": false,
            "title_override": "",
            "size": "",
            "background_image": "",
            "assignment_created": "",
            "assignment_updated": "",
            "link_id": "",
            "link_title": "",
            "link_slug": "",
            "link_domain": "",
            "link_destination_url": "",
            "link_active": false,
            "link_mode": "",
            "link_clicks_count": 0,
            "link_created": "",
            "link_updated": ""
        }));
        $app.db().newQuery(`
            SELECT
                pl.id AS assignment_id,
                pl.\`order\` AS order_value,
                pl.visible AS visible,
                pl.title_override AS title_override,
                pl.size AS size,
                pl.bg_image AS background_image,
                pl.created AS assignment_created,
                pl.updated AS assignment_updated,
                l.id AS link_id,
                l.title AS link_title,
                l.slug AS link_slug,
                l.domain AS link_domain,
                l.destination_url AS link_destination_url,
                l.active AS link_active,
                l.mode AS link_mode,
                l.clicks_count AS link_clicks_count,
                l.created AS link_created,
                l.updated AS link_updated
            FROM profile_links pl
            JOIN links l ON l.id = pl.link_id AND l.user_id = pl.user_id
            WHERE pl.user_id = {:userId} AND pl.profile_id = {:profileId}
            ORDER BY pl.\`order\`, pl.created
            LIMIT {:limit} OFFSET {:offset}
        `).bind({
            userId: auth.user.id,
            profileId: profileId,
            limit: pagination.perPage,
            offset: offset
        }).all(rows);
        var items = [];
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            items.push({
                id: String(row.assignment_id || ""),
                profile_id: profileId,
                link_id: String(row.link_id || ""),
                order: Number(row.order_value || 0),
                visible: row.visible === true || Number(row.visible) === 1,
                title_override: String(row.title_override || ""),
                size: String(row.size || "regular"),
                background_image: String(row.background_image || ""),
                link: utils.serializeApiLinkValues({
                    id: row.link_id,
                    title: row.link_title,
                    slug: row.link_slug,
                    domain: row.link_domain,
                    destination_url: row.link_destination_url,
                    active: row.link_active,
                    mode: row.link_mode,
                    clicks_count: row.link_clicks_count,
                    created: row.link_created,
                    updated: row.link_updated
                }),
                created: String(row.assignment_created || ""),
                updated: String(row.assignment_updated || "")
            });
        }
        utils.applyApiResponseHeaders(c, auth);
        return c.json(200, {
            data: items,
            meta: {
                page: pagination.page,
                per_page: pagination.perPage,
                total: total,
                total_pages: Math.ceil(total / pagination.perPage),
                request_id: auth.requestId
            }
        });
    } catch (err) {
        $app.logger().error("Public API profile links failed request_id=" + auth.requestId + ": " + err);
        return errorResponse(c, auth, 500, "internal_error", "Unable to load Public Profile links.");
    }
};

module.exports = {
    MAX_JSON_BODY_BYTES,
    LINK_MUTATION_FIELDS,
    parseStrictJsonBody,
    createLink,
    updateLink,
    readLinkAnalytics,
    listProfiles,
    readProfile,
    listProfileLinks
};
