// Custom Domains are a server-owned Cloudflare for SaaS lifecycle. The
// browser never receives Cloudflare credentials or internal hostname ids.
// Public traffic resolves an indexed hostname mapping and never guesses a
// target from a slug.

// Field-limited, owner-scoped destinations for the Custom Domain picker.
// Keeping this on a purpose-built route avoids coupling a critical account
// workflow to the public Records API filters used by public slug lookups.
routerAdd("GET", "/api/domains/targets", (c) => {
    c.response.header().add("Cache-Control", "private, no-store");
    var user = c.auth;
    if (!user || user.collection().name !== "users") return c.json(401, { message: "Sign in to manage custom domains." });

    var targetType = String(c.request.url.query().get("type") || "").trim().toLowerCase();
    if (targetType && targetType !== "link" && targetType !== "profile") {
        return c.json(400, { message: "Select a valid Link or Public Profile." });
    }
    var search = String(c.request.url.query().get("query") || "").trim().slice(0, 100);
    var perType = Math.max(1, Math.min(50, parseInt(c.request.url.query().get("per_page") || "30", 10) || 30));

    var loadTargets = function(kind) {
        var collectionName = kind === "link" ? "links" : "public_profiles";
        var labelField = kind === "link" ? "title" : "name";
        var filter = "user_id = {:userId}" + (kind === "link" ? " && active = true" : "");
        var params = { userId: user.id };
        if (search) {
            filter += " && (" + labelField + " ~ {:search} || slug ~ {:search})";
            params.search = search;
        }
        var records = $app.findRecordsByFilter(collectionName, filter, "-created,-id", perType + 1, 0, params);
        return {
            hasMore: records.length > perType,
            items: records.slice(0, perType).map(function(record) {
                var slug = String(record.get("slug") || "");
                return {
                    id: record.id,
                    type: kind,
                    name: String(record.get(labelField) || slug),
                    slug: slug
                };
            })
        };
    };

    var kinds = targetType ? [targetType] : ["profile", "link"];
    var items = [];
    var hasMore = false;
    kinds.forEach(function(kind) {
        var result = loadTargets(kind);
        items = items.concat(result.items);
        hasMore = hasMore || result.hasMore;
    });
    return c.json(200, { items: items, has_more: hasMore });
});

routerAdd("GET", "/api/domains", (c) => {
    c.response.header().add("Cache-Control", "private, no-store");
    var user = c.auth;
    if (!user || user.collection().name !== "users") return c.json(401, { message: "Sign in to manage custom domains." });
    var domains = require(__hooks + "/custom_domains.js");
    var utils = require(__hooks + "/utils.js");
    var page = Math.max(1, Math.min(10000, parseInt(c.request.url.query().get("page") || "1", 10) || 1));
    var targetType = String(c.request.url.query().get("target_type") || "").trim().toLowerCase();
    var targetId = String(c.request.url.query().get("target_id") || "").trim().toLowerCase();
    if ((targetType || targetId) && ((targetType !== "link" && targetType !== "profile") || !/^[a-z0-9]{15}$/.test(targetId))) {
        return c.json(400, { message: "Select a valid Link or Public Profile." });
    }
    var filter = "user_id = {:userId}";
    var filterParams = { userId: user.id };
    if (targetType) {
        filter += targetType === "link" ? " && link_id = {:targetId}" : " && profile_id = {:targetId}";
        filterParams.targetId = targetId;
    }
    var records = $app.findRecordsByFilter(
        "custom_domains", filter, "-created,-id", 51, (page - 1) * 50, filterParams
    );
    var planConfig = domains.getPlanConfigForUser(user);
    var domainCount = new DynamicModel({ total: 0 });
    $app.db().newQuery("SELECT count(*) AS total FROM custom_domains WHERE user_id = {:userId}")
        .bind({ userId: user.id }).one(domainCount);
    var provisioning = planConfig.limit > 0
        ? domains.getProvisioningUsageForUser(user, planConfig)
        : { used: 0, limit: 0, remaining: 0, resetsAt: "" };
    var allowedIds = {};
    if (planConfig.limit > 0) {
        var allowedRecords = $app.findRecordsByFilter(
            "custom_domains", "user_id = {:userId}", "created,id", planConfig.limit, 0, { userId: user.id }
        );
        allowedRecords.forEach(function(record) { allowedIds[record.id] = true; });
    }
    var entitled = planConfig.limit > 0;
    var available = domains.featureEnabledForUser(user.id);
    return c.json(200, {
        available: available,
        entitled: entitled,
        enabled: available && entitled,
        limit: planConfig.limit,
        total: Number(domainCount.total || 0),
        provisioning_limit: provisioning.limit,
        provisioning_used: provisioning.used,
        provisioning_remaining: provisioning.remaining,
        provisioning_resets_at: provisioning.resetsAt,
        has_more: records.length > 50,
        page: page,
        domains: records.slice(0, 50).map(function(record) { return domains.ownerDto(record, allowedIds); })
    });
});

routerAdd("POST", "/api/domains", (c) => {
    c.response.header().add("Cache-Control", "private, no-store");
    var user = c.auth;
    if (!user || user.collection().name !== "users") return c.json(401, { message: "Sign in to manage custom domains." });
    var domains = require(__hooks + "/custom_domains.js");
    var utils = require(__hooks + "/utils.js");
    if (!domains.featureEnabled()) return c.json(503, { message: "Custom Domains are temporarily unavailable. Please try again later." });
    if (!domains.featureEnabledForUser(user.id)) return c.json(503, { message: "Custom Domains are not available for this account yet." });
    var planConfig = domains.getPlanConfigForUser(user);
    if (planConfig.limit <= 0) return c.json(403, { message: "Custom Domains require an active Creator Pro or Agency plan." });
    if (!domains.mutationAllowed(user.id)) return c.json(429, { message: "Please wait before changing domains again." });

    var data = new DynamicModel({ hostname: "", target_type: "", target_id: "" });
    c.bindBody(data);
    var hostname;
    var target;
    try {
        hostname = domains.normalizeHostname(data.hostname);
        target = domains.getOwnedTarget(user, data.target_type, data.target_id);
        if (target.type === "link") utils.validateTargetingUrls(target.record, $app, hostname);
    } catch (validationError) {
        var validationMessage = String(validationError && validationError.message || "The domain or destination is invalid.");
        var validationStatus = validationMessage.indexOf("does not belong") !== -1 ? 403 : 400;
        return c.json(validationStatus, { message: validationMessage });
    }

    var existing = null;
    try {
        existing = $app.findFirstRecordByFilter(
            "custom_domains",
            "hostname = {:hostname} && (user_id = {:userId} || dns_verified_at != '' || provisioning_started_at != '' || cloudflare_hostname_id != '')",
            { hostname: hostname, userId: c.auth.id }
        );
    }
    catch (lookupError) {}
    if (existing) return c.json(409, { message: "This domain is already connected to Linktery." });

    var config;
    try {
        config = domains.getCloudflareConfig();
    } catch (provisionError) {
        $app.logger().error("Custom domain provisioning failed for " + hostname);
        return c.json(503, { message: "Domain provisioning is temporarily unavailable. No DNS changes were made." });
    }

    var collection = $app.findCollectionByNameOrId("custom_domains");
    var record = new Record(collection, {
        user_id: user.id,
        hostname: hostname,
        status: "pending",
        hostname_status: "ownership_pending",
        ownership_token: "linktery-domain-" + $security.randomString(48),
        next_check_at: new Date().toISOString(),
        cname_target: config.cnameTarget
    });
    domains.setTarget(record, target);
    try {
        // Reserve the unique hostname BEFORE any external API call. Two
        // concurrent requests cannot provision/delete each other's hostname.
        $app.runInTransaction(function(txApp) {
            var currentUser = txApp.findRecordById("users", user.id);
            var currentPlanConfig = domains.getPlanConfigForUser(currentUser);
            if (currentPlanConfig.limit <= 0) throw new ForbiddenError("Custom Domains require an active Creator Pro or Agency plan.");
            var accountDomains = txApp.findRecordsByFilter("custom_domains", "user_id = {:userId}", "", currentPlanConfig.limit, 0, { userId: user.id });
            if (accountDomains.length >= currentPlanConfig.limit) {
                throw new BadRequestError(domains.domainLimitMessage(currentPlanConfig));
            }
            var pending = txApp.findRecordsByFilter("custom_domains", "user_id = {:userId} && dns_verified_at = ''", "", 20, 0, { userId: user.id });
            if (pending.length >= 20) throw new BadRequestError("Finish or remove pending domains before adding more.");
            txApp.save(record);
        });
    } catch (saveError) {
        var saveMessage = String(saveError && saveError.message || "");
        if (saveMessage.indexOf("includes up to") !== -1) {
            return c.json(409, { message: domains.domainLimitMessage(planConfig) });
        }
        if (saveMessage.indexOf("require an active Creator Pro or Agency") !== -1) {
            return c.json(403, { message: "Custom Domains require an active Creator Pro or Agency plan." });
        }
        return c.json(409, { message: "This domain is already connected, or you have too many pending domains. Complete or remove pending connections, then try again." });
    }
    return c.json(201, { domain: domains.ownerDto(record) });
});

routerAdd("PATCH", "/api/domains/{id}", (c) => {
    c.response.header().add("Cache-Control", "private, no-store");
    var user = c.auth;
    if (!user || user.collection().name !== "users") return c.json(401, { message: "Sign in to manage custom domains." });
    var domains = require(__hooks + "/custom_domains.js");
    var utils = require(__hooks + "/utils.js");
    if (!domains.featureEnabled()) return c.json(503, { message: "Custom Domains are temporarily unavailable. Please try again later." });
    if (!domains.featureEnabledForUser(user.id)) return c.json(503, { message: "Custom Domains are not available for this account yet." });
    if (domains.getPlanConfigForUser(user).limit <= 0) return c.json(403, { message: "Custom Domains require an active Creator Pro or Agency plan." });
    if (!domains.mutationAllowed(user.id)) return c.json(429, { message: "Please wait before changing domains again." });
    var id = String(c.request.pathValue("id") || "");
    var record;
    try { record = $app.findRecordById("custom_domains", id); } catch (lookupError) {}
    if (!record || String(record.get("user_id") || "") !== user.id) return c.json(404, { message: "Domain not found." });
    var data = new DynamicModel({ target_type: "", target_id: "" });
    c.bindBody(data);
    var target;
    try {
        target = domains.getOwnedTarget(user, data.target_type, data.target_id);
        if (target.type === "link") utils.validateTargetingUrls(target.record, $app, record.get("hostname"));
    } catch (validationError) {
        var validationMessage = String(validationError && validationError.message || "The selected destination is invalid.");
        return c.json(validationMessage.indexOf("does not belong") !== -1 ? 403 : 400, { message: validationMessage });
    }
    try {
        record = domains.withDomainLease(record.id, function(current) {
            domains.setTarget(current, target);
            domains.saveLeasedRecord(current);
            return current;
        });
    } catch (saveError) {
        return c.json(409, { message: "This domain could not be updated. Check that the destination still exists and try again shortly." });
    }
    return c.json(200, { domain: domains.ownerDto(record) });
});

routerAdd("POST", "/api/domains/{id}/verify", (c) => {
    c.response.header().add("Cache-Control", "private, no-store");
    var user = c.auth;
    if (!user || user.collection().name !== "users") return c.json(401, { message: "Sign in to manage custom domains." });
    var domains = require(__hooks + "/custom_domains.js");
    if (!domains.featureEnabled()) return c.json(503, { message: "Custom Domains are temporarily unavailable. Please try again later." });
    if (!domains.featureEnabledForUser(user.id)) return c.json(503, { message: "Custom Domains are not available for this account yet." });
    var planConfig = domains.getPlanConfigForUser(user);
    if (planConfig.limit <= 0) return c.json(403, { message: "Custom Domains require an active Creator Pro or Agency plan." });
    if (!domains.mutationAllowed(user.id)) return c.json(429, { message: "Please wait before checking again." });
    var id = String(c.request.pathValue("id") || "");
    var record;
    try { record = $app.findRecordById("custom_domains", id); } catch (lookupError) {}
    if (!record || String(record.get("user_id") || "") !== user.id) return c.json(404, { message: "Domain not found." });
    if (!require(__hooks + "/utils.js").isCustomDomainRecordWithinPlanLimit($app, user, record)) {
        return c.json(409, { message: "This domain is outside your current plan limit. Disconnect another domain or upgrade your plan." });
    }
    try {
        record = domains.refreshRecord(record);
    } catch (verifyError) {
        var verifyMessage = String(verifyError && verifyError.message || "");
        if (verifyMessage.indexOf("Monthly custom domain setup allowance reached") !== -1) {
            return c.json(429, { message: "Monthly custom domain setup allowance reached. Reassign an existing domain or try again after the rolling window resets." });
        }
        if (verifyMessage.indexOf("Custom domain setup is busy") !== -1) {
            return c.json(429, { message: "Custom domain setup is busy. Please try again in a minute." });
        }
        if (verifyMessage.indexOf("already been verified by another Linktery connection") !== -1) {
            return c.json(409, { message: "This domain has already been verified by another Linktery connection." });
        }
        $app.logger().error("Custom domain verification failed for id=" + id);
        return c.json(503, { message: "We couldn't check DNS yet. Your current domain configuration was not changed." });
    }
    return c.json(200, { domain: domains.ownerDto(record) });
});

routerAdd("DELETE", "/api/domains/{id}", (c) => {
    c.response.header().add("Cache-Control", "private, no-store");
    var user = c.auth;
    if (!user || user.collection().name !== "users") return c.json(401, { message: "Sign in to manage custom domains." });
    var domains = require(__hooks + "/custom_domains.js");
    if (!domains.mutationAllowed(user.id)) return c.json(429, { message: "Please wait before changing domains again." });
    var id = String(c.request.pathValue("id") || "");
    var record;
    try { record = $app.findRecordById("custom_domains", id); } catch (lookupError) {}
    if (!record || String(record.get("user_id") || "") !== user.id) return c.json(404, { message: "Domain not found." });
    try {
        domains.disconnectRecord(record);
    } catch (removeError) {
        $app.logger().error("Custom domain removal failed for id=" + id);
        return c.json(503, { message: "The domain could not be disconnected yet. Nothing was removed." });
    }
    return c.json(200, { success: true });
});

// The edge uses this field-limited mapping for root-domain routing. Direct
// origin calls never receive an attestation or target information.
routerAdd("GET", "/api/public/custom-domain", (c) => {
    var domains = require(__hooks + "/custom_domains.js");
    var utils = require(__hooks + "/utils.js");
    c.response.header().add("Cache-Control", "private, no-store");
    c.response.header().add("X-Robots-Tag", "noindex, nofollow");
    if (!utils.isTrustedRedirectEdgeRequest(c)) return c.json(404, { message: "Not found" });
    c.response.header().add("X-Linktery-Custom-Domain-Origin", "v1");
    if (!domains.featureEnabled()) return c.json(404, { message: "Not found" });
    try {
        var hostname = domains.normalizeHostname(c.request.header.get("X-Linktery-Public-Host"));
        var mapping = $app.findFirstRecordByFilter(
            "custom_domains", "hostname = {:hostname} && status = 'active' && dns_verified_at != ''", { hostname: hostname }
        );
        var owner = $app.findRecordById("users", String(mapping.get("user_id") || ""));
        if (!domains.featureEnabledForUser(owner.id)) return c.json(404, { message: "Not found" });
        if (!utils.isCustomDomainRecordWithinPlanLimit($app, owner, mapping)) return c.json(404, { message: "Not found" });
        var targetType = String(mapping.get("target_type") || "");
        if (targetType !== "link" && targetType !== "profile") return c.json(404, { message: "Not found" });
        var targetId = String(mapping.get(targetType === "link" ? "link_id" : "profile_id") || "");
        var target = $app.findRecordById(targetType === "link" ? "links" : "public_profiles", targetId);
        if (String(target.get("user_id") || "") !== owner.id || (targetType === "link" && target.get("active") !== true)) {
            return c.json(404, { message: "Not found" });
        }
        return c.json(200, { type: targetType, id: target.id, slug: String(target.get("slug") || "") });
    } catch (lookupError) {
        if (/no rows in result set|record not found/i.test(String(lookupError))) {
            return c.json(404, { message: "Not found" });
        }
        $app.logger().error("Custom domain root lookup unavailable");
        return c.json(503, { message: "Domain resolution is temporarily unavailable." });
    }
});

// Prevent orphaned Cloudflare hostnames. Disconnecting a domain is an explicit
// operation with compensating error handling; deleting its target first is not.
onRecordDelete((e) => require(__hooks + "/custom_domains.js").blockTargetDelete(e, "link"), "links");
onRecordDelete((e) => require(__hooks + "/custom_domains.js").blockTargetDelete(e, "profile"), "public_profiles");
onRecordDelete((e) => require(__hooks + "/custom_domains.js").cleanupUserHostnamesBeforeDelete(e), "users");

// Pending validation is reconciled in bounded batches. Public requests never
// call Cloudflare's control plane, so traffic remains fast at large scale.
cronAdd("reconcile_custom_domains", "* * * * *", () => {
    var domains = require(__hooks + "/custom_domains.js");
    if (!domains.featureEnabled()) return;
    var pending = [];
    try {
        pending = $app.findRecordsByFilter(
            "custom_domains", "next_check_at <= {:now}", "next_check_at", 200, 0, { now: new Date().toISOString() }
        );
    } catch (lookupError) { return; }
    var deadline = Date.now() + 45000;
    for (var i = 0; i < pending.length && Date.now() < deadline; i++) {
        try { domains.refreshRecord(pending[i]); }
        catch (refreshError) { $app.logger().error("Pending custom domain reconciliation failed for id=" + pending[i].id); }
    }
});
