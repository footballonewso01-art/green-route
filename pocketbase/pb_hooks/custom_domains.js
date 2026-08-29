// Server-only custom-domain helpers. Keep this as a CommonJS module rather
// than an auto-loaded *.pb.js hook: PocketBase 0.24 hook callbacks execute
// after the registration scope is released, while required modules retain
// access to the JSVM globals used for records, HTTP, environment and errors.

var MANAGED_SUFFIXES = [
    "linktery.com",
    "linktery.bio",
    "hotme.online",
    "hotmylinks.cc",
    "workers.dev",
    "pages.dev",
    "vercel.app",
    "fly.dev"
];

var MUTATION_WINDOW = {};
var MUTATION_RESET_AT = 0;
var MAX_CUSTOM_DOMAINS = 10;
var CUSTOM_DOMAIN_PROVISIONING_LIMITS = { pro: 6, agency: 30 };
var PROVISIONING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
var PROVISIONING_RETRY_MS = 15 * 60 * 1000;
var GLOBAL_PROVISIONING_LIMIT_PER_MINUTE = 10;

var featureEnabled = function() {
    return String($os.getenv("CUSTOM_DOMAINS_ENABLED") || "").trim().toLowerCase() === "true";
};

var featureEnabledForUser = function(userId) {
    if (!featureEnabled()) return false;
    var allowlist = String($os.getenv("CUSTOM_DOMAINS_ALLOWED_USER_IDS") || "").trim();
    return !allowlist || allowlist.split(",").some(function(id) { return id.trim() === String(userId); });
};

// Keep the entitlement helper local to this CommonJS module. PocketBase's
// goja runtime doesn't support requiring another CommonJS helper from inside
// an already-required module callback ("Invalid module").
var getEffectivePlanNameForUser = function(user) {
    if (user && user.get("role") === "admin") return "agency";
    var rawPlan = String(user ? (user.get("plan") || "creator") : "creator").trim().toLowerCase();
    if (rawPlan !== "pro" && rawPlan !== "agency") return "creator";
    var status = String(user.get("plan_status") || "").trim().toLowerCase();
    if (status && status !== "active" && status !== "trialing" && status !== "canceling") return "creator";
    var expiry = String(user.get("plan_expires_at") || "").trim();
    if (!expiry) return "creator";
    var expiryMs = new Date(expiry.replace(" ", "T")).getTime();
    return isFinite(expiryMs) && expiryMs > Date.now() ? rawPlan : "creator";
};

var getPlanConfigForUser = function(user) {
    var plan = getEffectivePlanNameForUser(user);
    return {
        plan: plan,
        limit: plan === "pro" ? 2 : (plan === "agency" ? 10 : 0),
        provisioningLimit: Number(CUSTOM_DOMAIN_PROVISIONING_LIMITS[plan] || 0)
    };
};

var isRecordWithinPlanLimit = function(app, owner, record) {
    var limit = getPlanConfigForUser(owner).limit;
    if (limit <= 0 || !record) return false;
    var allowed = app.findRecordsByFilter(
        "custom_domains", "user_id = {:userId}", "created,id", limit, 0, { userId: owner.id }
    );
    return allowed.some(function(candidate) { return candidate.id === record.id; });
};

var domainLimitMessage = function(config) {
    var planConfig = config || { plan: "creator", limit: 0 };
    if (planConfig.plan === "pro") return "Creator Pro includes up to 2 custom domains. Disconnect one before adding another.";
    if (planConfig.plan === "agency") return "Agency includes up to 10 custom domains. Disconnect one before adding another.";
    return "Custom Domains require an active Creator Pro or Agency plan.";
};

var getProvisioningUsageForUser = function(user, config) {
    var planConfig = config || getPlanConfigForUser(user);
    if (planConfig.provisioningLimit <= 0) {
        return { used: 0, limit: 0, remaining: 0, resetsAt: "" };
    }
    var cutoff = new Date(Date.now() - PROVISIONING_WINDOW_MS).toISOString();
    var attempts = $app.findRecordsByFilter(
        "custom_domain_provisioning_events",
        "user_id = {:userId} && created >= {:cutoff}",
        "created,id",
        planConfig.provisioningLimit + 1,
        0,
        { userId: user.id, cutoff: cutoff }
    );
    var used = Math.min(attempts.length, planConfig.provisioningLimit);
    var firstCreated = attempts.length ? String(attempts[0].get("created") || "") : "";
    var firstTime = firstCreated ? new Date(firstCreated.replace(" ", "T")).getTime() : NaN;
    return {
        used: used,
        limit: planConfig.provisioningLimit,
        remaining: Math.max(0, planConfig.provisioningLimit - used),
        resetsAt: isFinite(firstTime) ? new Date(firstTime + PROVISIONING_WINDOW_MS).toISOString() : ""
    };
};

var reserveProvisioningAttempt = function(record, owner, config) {
    var planConfig = config || getPlanConfigForUser(owner);
    if (planConfig.provisioningLimit <= 0) throw new ForbiddenError("Custom Domains require an active paid plan.");
    var event;
    var attemptedAt = new Date().toISOString();
    var userCutoff = new Date(Date.now() - PROVISIONING_WINDOW_MS).toISOString();
    var globalCutoff = new Date(Date.now() - 60000).toISOString();
    $app.runInTransaction(function(txApp) {
        var attempts = txApp.findRecordsByFilter(
            "custom_domain_provisioning_events",
            "user_id = {:userId} && created >= {:cutoff}",
            "-created",
            planConfig.provisioningLimit,
            0,
            { userId: owner.id, cutoff: userCutoff }
        );
        if (attempts.length >= planConfig.provisioningLimit) {
            throw new BadRequestError("Monthly custom domain setup allowance reached.");
        }
        var globalAttempts = txApp.findRecordsByFilter(
            "custom_domain_provisioning_events",
            "created >= {:cutoff}",
            "-created",
            GLOBAL_PROVISIONING_LIMIT_PER_MINUTE,
            0,
            { cutoff: globalCutoff }
        );
        if (globalAttempts.length >= GLOBAL_PROVISIONING_LIMIT_PER_MINUTE) {
            throw new BadRequestError("Custom domain setup is busy. Please try again in a minute.");
        }

        var current = txApp.findRecordById("custom_domains", record.id);
        if (String(current.get("operation_token") || "") !== String(record.get("operation_token") || "") ||
            String(current.get("operation_expires_at") || "") <= attemptedAt) {
            throw new Error("Custom domain operation lease expired.");
        }
        current.set("provisioning_started_at", attemptedAt);
        txApp.save(current);
        record.set("provisioning_started_at", attemptedAt);

        event = new Record(txApp.findCollectionByNameOrId("custom_domain_provisioning_events"), {
            user_id: owner.id,
            domain_record_id: record.id,
            hostname: String(record.get("hostname") || ""),
            plan: planConfig.plan,
            outcome: "attempted"
        });
        txApp.save(event);
    });
    return event;
};

var markProvisioningAllocated = function(event, providerHostnameId) {
    if (!event || !event.id) return;
    try {
        var current = $app.findRecordById("custom_domain_provisioning_events", event.id);
        current.set("outcome", "allocated");
        current.set("provider_hostname_id", String(providerHostnameId || "").substring(0, 64));
        $app.save(current);
    } catch (auditError) {
        $app.logger().error("Custom domain provisioning audit update failed event=" + event.id);
    }
};

var normalizeHostname = function(value) {
    var hostname = String(value || "").trim().toLowerCase();
    if (hostname.endsWith(".")) hostname = hostname.substring(0, hostname.length - 1);
    if (!hostname || hostname.length > 253 || hostname.indexOf("://") !== -1 || /[\/:?#@\s]/.test(hostname)) {
        throw new BadRequestError("Enter a domain name without https://, a path, or a port.");
    }
    if (("_linktery-verification." + hostname).length > 253) throw new BadRequestError("This hostname is too long for DNS ownership verification.");
    if (hostname.indexOf("*.") === 0 || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
        throw new BadRequestError("Wildcard and IP addresses cannot be connected.");
    }
    var labels = hostname.split(".");
    if (labels.length < 2) throw new BadRequestError("Enter a complete domain name.");
    for (var i = 0; i < labels.length; i++) {
        if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(labels[i])) {
            throw new BadRequestError("The domain contains an unsupported label.");
        }
    }
    var tld = labels[labels.length - 1];
    if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(tld)) {
        throw new BadRequestError("Enter a valid public domain name.");
    }
    for (var suffixIndex = 0; suffixIndex < MANAGED_SUFFIXES.length; suffixIndex++) {
        var suffix = MANAGED_SUFFIXES[suffixIndex];
        if (hostname === suffix || hostname.endsWith("." + suffix)) {
            throw new BadRequestError("This domain is reserved by the platform.");
        }
    }
    return hostname;
};

var mutationAllowed = function(userId) {
    var now = new Date().getTime();
    if (now - MUTATION_RESET_AT >= 60000) { MUTATION_WINDOW = {}; MUTATION_RESET_AT = now; }
    var entry = MUTATION_WINDOW[userId] || { start: now, count: 0 };
    if (now - entry.start >= 60000) entry = { start: now, count: 0 };
    if (entry.count >= 12) return false;
    entry.count += 1;
    MUTATION_WINDOW[userId] = entry;
    return true;
};

var getCloudflareConfig = function() {
    var token = String($os.getenv("CLOUDFLARE_SAAS_API_TOKEN") || "").trim();
    var zoneId = String($os.getenv("CLOUDFLARE_SAAS_ZONE_ID") || "").trim();
    var cnameTarget = String($os.getenv("CLOUDFLARE_SAAS_CNAME_TARGET") || "").trim().toLowerCase();
    if (!token || !/^[a-f0-9]{32}$/i.test(zoneId) || !/^[a-z0-9.-]{4,253}$/.test(cnameTarget)) {
        throw new Error("Custom domain infrastructure is not configured.");
    }
    return { token: token, zoneId: zoneId, cnameTarget: cnameTarget };
};

var cloudflareRequest = function(method, path, body, allowNotFound) {
    var config = getCloudflareConfig();
    var request = {
        url: "https://api.cloudflare.com/client/v4/zones/" + config.zoneId + path,
        method: method,
        headers: {
            "Authorization": "Bearer " + config.token,
            "Content-Type": "application/json"
        },
        timeout: 15
    };
    if (body !== undefined && body !== null) request.body = JSON.stringify(body);
    var response = $http.send(request);
    if (allowNotFound && response.statusCode === 404) return null;
    var payload = response.json || {};
    if (response.statusCode >= 400 || payload.success !== true) {
        throw new Error("Cloudflare custom hostname request failed with status " + response.statusCode);
    }
    return payload.result || {};
};

var deleteCloudflareHostname = function(hostnameId) {
    var safeId = String(hostnameId || "").trim();
    if (!safeId) return;
    var config = getCloudflareConfig();
    var response = $http.send({
        url: "https://api.cloudflare.com/client/v4/zones/" + config.zoneId + "/custom_hostnames/" + encodeURIComponent(safeId),
        method: "DELETE",
        headers: {
            "Authorization": "Bearer " + config.token,
            "Content-Type": "application/json"
        },
        timeout: 15
    });
    var payload = response.json || {};
    // DELETE is idempotent for recovery: a previous compensating attempt may
    // already have removed the provider object before the local transaction
    // was retried.
    if (response.statusCode !== 404 && (response.statusCode >= 400 || payload.success !== true)) {
        throw new Error("Cloudflare custom hostname delete failed with status " + response.statusCode);
    }
};

var firstSslValidationRecord = function(result) {
    var records = result && result.ssl && Array.isArray(result.ssl.validation_records)
        ? result.ssl.validation_records
        : [];
    return records.length > 0 ? records[0] : {};
};

var updateFromCloudflare = function(record, result) {
    if (String(result && result.hostname || "").toLowerCase() !== String(record.get("hostname") || "")) {
        throw new Error("Provider hostname did not match the reserved domain.");
    }
    var hostnameStatus = String((result && result.status) || "pending").substring(0, 32);
    var sslStatus = String((result && result.ssl && result.ssl.status) || "pending").substring(0, 32);
    var ownership = (result && result.ownership_verification) || {};
    var sslRecord = firstSslValidationRecord(result);
    var active = hostnameStatus === "active" && sslStatus === "active" && Boolean(record.get("dns_verified_at"));
    record.set("status", active ? "active" : (hostnameStatus === "blocked" ? "failed" : "pending"));
    record.set("hostname_status", hostnameStatus);
    record.set("ssl_status", sslStatus);
    record.set("ownership_type", String(ownership.type || "txt").substring(0, 16));
    record.set("ownership_name", String(ownership.name || "").substring(0, 253));
    record.set("ownership_value", String(ownership.value || "").substring(0, 512));
    record.set("ssl_txt_name", String(sslRecord.txt_name || "").substring(0, 253));
    record.set("ssl_txt_value", String(sslRecord.txt_value || "").substring(0, 512));
    var sslRecords = result && result.ssl && Array.isArray(result.ssl.validation_records) ? result.ssl.validation_records : [];
    record.set("ssl_records_json", JSON.stringify(sslRecords.slice(0, 4).map(function(item) {
        return { type: "txt", name: String(item.txt_name || "").substring(0, 253), value: String(item.txt_value || "").substring(0, 512) };
    })));
    record.set("last_checked_at", new Date().toISOString());
    if (active && !record.get("activated_at")) record.set("activated_at", new Date().toISOString());
};

var getOwnedTarget = function(user, targetType, targetId) {
    var safeType = String(targetType || "").trim().toLowerCase();
    var safeId = String(targetId || "").trim();
    if ((safeType !== "link" && safeType !== "profile") || !/^[a-z0-9]{15}$/.test(safeId)) {
        throw new BadRequestError("Select a valid Link or Public Profile.");
    }
    var collection = safeType === "link" ? "links" : "public_profiles";
    var target;
    try { target = $app.findRecordById(collection, safeId); } catch (error) {}
    if (!target || String(target.get("user_id") || "") !== user.id) {
        throw new ForbiddenError("The selected target does not belong to this account.");
    }
    if (safeType === "link" && target.get("active") !== true) {
        throw new BadRequestError("Activate the selected Link before connecting a domain.");
    }
    return { type: safeType, id: safeId, record: target };
};

var setTarget = function(record, target) {
    record.set("target_type", target.type);
    record.set("link_id", target.type === "link" ? target.id : "");
    record.set("profile_id", target.type === "profile" ? target.id : "");
};

var ownerDto = function(record, allowedIds) {
    var targetName = "";
    try {
        var target = $app.findRecordById(record.get("target_type") === "link" ? "links" : "public_profiles", record.get(record.get("target_type") === "link" ? "link_id" : "profile_id"));
        targetName = String(target.get(record.get("target_type") === "link" ? "title" : "name") || target.get("slug") || "");
    } catch (targetError) {}
    return {
        id: record.id,
        hostname: String(record.get("hostname") || ""),
        target_type: String(record.get("target_type") || ""),
        target_id: String(record.get(record.get("target_type") === "link" ? "link_id" : "profile_id") || ""),
        target_name: targetName,
        status: String(record.get("status") || "pending"),
        hostname_status: String(record.get("hostname_status") || "pending"),
        ssl_status: String(record.get("ssl_status") || "pending"),
        ownership_verified: Boolean(record.get("dns_verified_at")),
        within_plan_limit: !allowedIds || allowedIds[record.id] === true,
        cname: {
            name: String(record.get("hostname") || ""),
            value: String(record.get("cname_target") || "")
        },
        ownership: {
            type: "txt",
            name: "_linktery-verification." + String(record.get("hostname") || ""),
            value: String(record.get("ownership_token") || "")
        },
        hostname_validation: {
            type: String(record.get("ownership_type") || "txt"),
            name: String(record.get("ownership_name") || ""),
            value: String(record.get("ownership_value") || "")
        },
        ssl_validations: JSON.parse(String(record.get("ssl_records_json") || "[]")),
        ssl_validation: {
            type: "txt",
            name: String(record.get("ssl_txt_name") || ""),
            value: String(record.get("ssl_txt_value") || "")
        },
        last_checked_at: String(record.get("last_checked_at") || ""),
        activated_at: String(record.get("activated_at") || ""),
        created: String(record.get("created") || ""),
        updated: String(record.get("updated") || "")
    };
};

var withDomainLease = function(id, operation) {
    var token = $security.randomString(40);
    var record;
    $app.runInTransaction(function(txApp) {
        record = txApp.findRecordById("custom_domains", id);
        if (String(record.get("operation_expires_at") || "") > new Date().toISOString()) {
            throw new BadRequestError("This domain is being updated. Please try again shortly.");
        }
        record.set("operation_token", token);
        record.set("operation_expires_at", new Date(Date.now() + 90000).toISOString());
        txApp.save(record);
    });
    try { return operation(record); }
    finally {
        $app.db().newQuery("UPDATE custom_domains SET operation_token = '', operation_expires_at = '' WHERE id = {:id} AND operation_token = {:token}")
            .bind({ id: id, token: token }).execute();
    }
};

var saveLeasedRecord = function(record) {
    $app.runInTransaction(function(txApp) {
        var current = txApp.findRecordById("custom_domains", record.id);
        if (String(current.get("operation_token") || "") !== String(record.get("operation_token") || "") ||
            String(current.get("operation_expires_at") || "") <= new Date().toISOString()) {
            throw new Error("Custom domain operation lease expired.");
        }
        txApp.save(record);
    });
};

var verifyOwnershipDns = function(record) {
    var token = String(record.get("ownership_token") || "");
    if (!token) return false;
    var hostname = normalizeHostname(record.get("hostname"));
    // Fixed resolver URL: never fetch customer-controlled URLs or IPs.
    var response = $http.send({
        url: "https://cloudflare-dns.com/dns-query?name=" + encodeURIComponent("_linktery-verification." + hostname) + "&type=TXT",
        method: "GET", headers: { Accept: "application/dns-json" }, timeout: 5
    });
    var payload = response.json || {};
    if (response.statusCode !== 200 || (payload.Status !== 0 && payload.Status !== 3)) throw new Error("DNS lookup unavailable.");
    var answers = Array.isArray(payload.Answer) ? payload.Answer : [];
    return answers.some(function(answer) {
        return Number(answer.type) === 16 && String(answer.data || "").replace(/\"\s*\"/g, "").replace(/^\"|\"$/g, "") === token;
    });
};

var findProviderHostname = function(record) {
    var results = cloudflareRequest("GET", "/custom_hostnames?hostname=" + encodeURIComponent(record.get("hostname")) + "&per_page=1");
    if (!Array.isArray(results) || !results.length) return null;
    var result = results[0];
    if (String(result.hostname || "").toLowerCase() !== record.get("hostname")) throw new Error("Provider hostname mismatch.");
    return result;
};

var refreshRecord = function(input) {
    return withDomainLease(input.id, function(record) {
        try {
            var owner = $app.findRecordById("users", String(record.get("user_id") || ""));
            // A pending connection must not allocate provider resources after
            // its owner loses entitlement or is outside the staged rollout.
            // Keep the mapping/certificate intact so renewal can restore it.
            var planConfig = getPlanConfigForUser(owner);
            if (!featureEnabledForUser(owner.id) || planConfig.limit <= 0 ||
                !isRecordWithinPlanLimit($app, owner, record)) {
                record.set("next_check_at", new Date(Date.now() + 86400000).toISOString());
                saveLeasedRecord(record);
                return record;
            }
            if (!verifyOwnershipDns(record)) {
                record.set("dns_verified_at", "");
                record.set("status", "pending");
                record.set("hostname_status", "ownership_pending");
            } else {
                record.set("dns_verified_at", new Date().toISOString());
                // Persist before any external write so a timed-out create can
                // be recovered by hostname without losing its tenant binding.
                try {
                    saveLeasedRecord(record);
                } catch (claimError) {
                    // The partial unique index is the final arbiter if two
                    // account-specific TXT claims verify concurrently.
                    record.set("dns_verified_at", "");
                    record.set("status", "failed");
                    record.set("hostname_status", "claimed");
                    record.set("next_check_at", new Date(Date.now() + 86400000).toISOString());
                    saveLeasedRecord(record);
                    throw new BadRequestError("This domain has already been verified by another Linktery connection.");
                }
                var cloudflareId = String(record.get("cloudflare_hostname_id") || "");
                var result = cloudflareId
                    ? cloudflareRequest("GET", "/custom_hostnames/" + encodeURIComponent(cloudflareId), null, true)
                    : findProviderHostname(record);
                if (!result) {
                    var lastAttempt = new Date(String(record.get("provisioning_started_at") || "").replace(" ", "T")).getTime();
                    if (isFinite(lastAttempt) && Date.now() - lastAttempt < PROVISIONING_RETRY_MS) {
                        record.set("last_checked_at", new Date().toISOString());
                        record.set("next_check_at", new Date(lastAttempt + PROVISIONING_RETRY_MS).toISOString());
                        saveLeasedRecord(record);
                        return record;
                    }
                    // The persistent event and timestamp are committed together
                    // before the provider POST. Deleting the domain cannot erase
                    // this rolling allowance, and an ambiguous timeout cannot
                    // trigger an immediate second certificate order.
                    var provisioningEvent = reserveProvisioningAttempt(record, owner, planConfig);
                    var ssl = { method: "txt", type: "dv", settings: { min_tls_version: "1.2" } };
                    // Long names cannot fit in a certificate's common name;
                    // Cloudflare puts the customer hostname in the SAN instead.
                    if (String(record.get("hostname")).length > 64) ssl.cloudflare_branding = true;
                    result = cloudflareRequest("POST", "/custom_hostnames", {
                        hostname: record.get("hostname"),
                        ssl: ssl
                    });
                    markProvisioningAllocated(provisioningEvent, result && result.id);
                }
                if (!/^[a-zA-Z0-9-]{16,64}$/.test(String(result.id || ""))) throw new Error("Invalid provider identifier.");
                record.set("cloudflare_hostname_id", result.id);
                updateFromCloudflare(record, result);
            }
            record.set("last_checked_at", new Date().toISOString());
            // Active domains are re-verified daily. Unverified stale entries
            // back off to daily DNS checks and never allocate paid hostnames.
            var oldPending = !record.get("dns_verified_at") && Date.now() - new Date(record.get("created")).getTime() > 86400000;
            record.set("next_check_at", new Date(Date.now() + (record.get("status") === "active" || oldPending ? 86400000 : 300000)).toISOString());
            saveLeasedRecord(record);
            return record;
        } catch (error) {
            // Preserve a working mapping on temporary control-plane outages.
            record.set("next_check_at", new Date(Date.now() + 900000).toISOString());
            saveLeasedRecord(record);
            throw error;
        }
    });
};

var disconnectRecord = function(input) {
    return withDomainLease(input.id, function(record) {
        var cloudflareId = String(record.get("cloudflare_hostname_id") || "");
        if (!cloudflareId && (record.get("dns_verified_at") || record.get("provisioning_started_at"))) {
            var recovered = findProviderHostname(record);
            cloudflareId = recovered ? String(recovered.id || "") : "";
        }
        if (cloudflareId) deleteCloudflareHostname(cloudflareId);
        $app.delete(record);
    });
};

var blockTargetDelete = function(e, targetType) {
    var field = targetType === "link" ? "link_id" : "profile_id";
    var attached = (e.app || $app).findRecordsByFilter(
        "custom_domains", field + " = {:targetId}", "", 1, 0, { targetId: e.record.id }
    );
    if (attached.length > 0) {
        throw new BadRequestError("Disconnect the custom domain before deleting this " + (targetType === "link" ? "Link" : "Public Profile") + ".");
    }
    e.next();
};

var cleanupUserHostnamesBeforeDelete = function(e) {
    var records = (e.app || $app).findRecordsByFilter("custom_domains", "user_id = {:userId}", "", 1, 0, { userId: e.record.id });
    if (records.length) throw new BadRequestError("Disconnect custom domains in Settings before deleting this account.");
    e.next();
};

module.exports = {
    MAX_CUSTOM_DOMAINS: MAX_CUSTOM_DOMAINS,
    CUSTOM_DOMAIN_PROVISIONING_LIMITS: CUSTOM_DOMAIN_PROVISIONING_LIMITS,
    GLOBAL_PROVISIONING_LIMIT_PER_MINUTE: GLOBAL_PROVISIONING_LIMIT_PER_MINUTE,
    featureEnabled: featureEnabled,
    featureEnabledForUser: featureEnabledForUser,
    getPlanConfigForUser: getPlanConfigForUser,
    domainLimitMessage: domainLimitMessage,
    getProvisioningUsageForUser: getProvisioningUsageForUser,
    reserveProvisioningAttempt: reserveProvisioningAttempt,
    normalizeHostname: normalizeHostname,
    mutationAllowed: mutationAllowed,
    getCloudflareConfig: getCloudflareConfig,
    cloudflareRequest: cloudflareRequest,
    deleteCloudflareHostname: deleteCloudflareHostname,
    updateFromCloudflare: updateFromCloudflare,
    getOwnedTarget: getOwnedTarget,
    setTarget: setTarget,
    ownerDto: ownerDto,
    refreshRecord: refreshRecord,
    withDomainLease: withDomainLease,
    saveLeasedRecord: saveLeasedRecord,
    verifyOwnershipDns: verifyOwnershipDns,
    disconnectRecord: disconnectRecord,
    blockTargetDelete: blockTargetDelete,
    cleanupUserHostnamesBeforeDelete: cleanupUserHostnamesBeforeDelete
};
