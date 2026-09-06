var utils = require("./utils.js");

var requireCampaignAdmin = function(c) {
    var admin = c.auth;
    if (!admin || admin.get("role") !== "admin") {
        throw new ForbiddenError("Only admins can manage marketing campaigns.");
    }
    return admin;
};

var cleanText = function(value, maxLength) {
    return String(value || "")
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .trim()
        .substring(0, maxLength);
};

var normalizeLandingPath = function(value) {
    var path = String(value || "").split("?")[0].split("#")[0].trim();
    if (path.length > 1 && path.charAt(path.length - 1) === "/") path = path.substring(0, path.length - 1);
    if (!path) path = "/";
    if (!/^(?:\/|\/register|\/(?:features|guides|tools|templates|solutions|alternatives|compare)(?:\/[a-z0-9-]+)?|\/pricing|\/documentation)$/.test(path)) {
        throw new BadRequestError("Choose a public Linktery landing path.");
    }
    return path.substring(0, 160);
};

var normalizeCampaignStatus = function(value) {
    var status = cleanText(value, 16).toLowerCase();
    if (["draft", "active", "paused", "ended", "archived"].indexOf(status) === -1) {
        throw new BadRequestError("Campaign status must be draft, active, paused, ended, or archived.");
    }
    return status;
};

var normalizeObjective = function(value) {
    var objective = cleanText(value, 24).toLowerCase();
    if (["signups", "activation", "revenue"].indexOf(objective) === -1) {
        throw new BadRequestError("Campaign objective must be signups, activation, or revenue.");
    }
    return objective;
};

var normalizeCurrency = function(value) {
    var currency = cleanText(value || "USD", 3).toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new BadRequestError("Currency must be a three-letter code.");
    return currency;
};

var normalizeOptionalDate = function(value, label) {
    var raw = cleanText(value, 40);
    if (!raw) return "";
    var parsed = new Date(raw);
    if (!isFinite(parsed.getTime())) throw new BadRequestError(label + " is invalid.");
    return parsed.toISOString();
};

var assertDateRange = function(startsAt, endsAt) {
    if (startsAt && endsAt && new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
        throw new BadRequestError("Campaign end must be after its start.");
    }
};

var campaignIsLive = function(campaign) {
    if (!campaign || campaign.get("status") !== "active") return false;
    var now = new Date().getTime();
    var startsAt = String(campaign.get("starts_at") || "");
    var endsAt = String(campaign.get("ends_at") || "");
    if (startsAt && new Date(startsAt).getTime() > now) return false;
    if (endsAt && new Date(endsAt).getTime() <= now) return false;
    return true;
};

var promoJson = function(app, promoId) {
    if (!promoId) return null;
    try {
        var promo = app.findRecordById("promocodes", promoId);
        return {
            id: promo.id,
            code: String(promo.get("code") || ""),
            reward_enabled: promo.get("reward_enabled") === true,
            reward_plan: String(promo.get("reward_plan") || ""),
            reward_days: Number(promo.get("reward_days") || 0),
            max_uses: Number(promo.get("max_uses") || 0),
            current_uses: Number(promo.get("current_uses") || 0),
            is_active: promo.get("is_active") === true
        };
    } catch (error) {
        return null;
    }
};

var campaignJson = function(app, campaign) {
    return {
        id: campaign.id,
        name: String(campaign.get("name") || ""),
        tracking_key: String(campaign.get("tracking_key") || ""),
        objective: String(campaign.get("objective") || "signups"),
        status: String(campaign.get("status") || "draft"),
        is_live: campaignIsLive(campaign),
        landing_path: String(campaign.get("landing_path") || "/"),
        budget_cents: Number(campaign.get("budget_cents") || 0),
        currency: String(campaign.get("currency") || "USD"),
        starts_at: String(campaign.get("starts_at") || ""),
        ends_at: String(campaign.get("ends_at") || ""),
        notes: String(campaign.get("notes") || ""),
        promocode: promoJson(app, String(campaign.get("promocode_id") || "")),
        created: String(campaign.get("created") || ""),
        updated: String(campaign.get("updated") || "")
    };
};

var placementJson = function(placement) {
    return {
        id: placement.id,
        campaign_id: String(placement.get("campaign_id") || ""),
        name: String(placement.get("name") || ""),
        tracking_slug: String(placement.get("tracking_slug") || ""),
        tracking_url: "https://linktery.com/go/" + String(placement.get("tracking_slug") || ""),
        content_key: String(placement.get("content_key") || ""),
        source: String(placement.get("source") || ""),
        medium: String(placement.get("medium") || ""),
        landing_path: String(placement.get("landing_path") || ""),
        cost_cents: Number(placement.get("cost_cents") || 0),
        is_active: placement.get("is_active") === true,
        notes: String(placement.get("notes") || ""),
        created: String(placement.get("created") || ""),
        updated: String(placement.get("updated") || "")
    };
};

var loadMetrics = function(app, trackingKey, contentKey, campaignId, placementId) {
    var result = new DynamicModel({
        "visits": 0,
        "unique_visitors": 0,
        "signups": 0,
        "activated": 0,
        "paid": 0,
        "revenue": 0.0001,
        "promo_uses": 0
    });
    app.db().newQuery(`
        SELECT
          (SELECT count(*) FROM marketing_campaign_visits v
             WHERE v.campaign_id = {:campaignId} AND v.traffic_quality != 'automated'
               AND ({:placementId} = '' OR v.placement_id = {:placementId})) AS visits,
          (SELECT count(DISTINCT visitor_key) FROM marketing_campaign_visits v
             WHERE v.campaign_id = {:campaignId} AND v.traffic_quality != 'automated'
               AND ({:placementId} = '' OR v.placement_id = {:placementId})) AS unique_visitors,
          (SELECT count(DISTINCT ge.user_id) FROM growth_events ge
             WHERE ge.event_name = 'signup_completed' AND ge.user_id IS NOT NULL
               AND ge.campaign = {:trackingKey}
               AND ({:contentKey} = '' OR ge.content = {:contentKey})) AS signups,
          (SELECT count(DISTINCT ge.user_id) FROM growth_events ge
             WHERE ge.event_name = 'signup_completed' AND ge.user_id IS NOT NULL
               AND ge.campaign = {:trackingKey}
               AND ({:contentKey} = '' OR ge.content = {:contentKey})
               AND (EXISTS (SELECT 1 FROM links l WHERE l.user_id = ge.user_id)
                 OR EXISTS (SELECT 1 FROM public_profiles pp WHERE pp.user_id = ge.user_id))) AS activated,
          (SELECT count(DISTINCT ge.user_id) FROM growth_events ge
             WHERE ge.event_name = 'signup_completed' AND ge.user_id IS NOT NULL
               AND ge.campaign = {:trackingKey}
               AND ({:contentKey} = '' OR ge.content = {:contentKey})
               AND EXISTS (SELECT 1 FROM billing b WHERE b.user_id = ge.user_id
                 AND b.amount > 0 AND lower(coalesce(b.status, '')) NOT IN ('failed', 'refunded', 'cancelled')
                 AND lower(coalesce(b.payment_method, '')) NOT IN ('free trial', 'given'))) AS paid,
          (SELECT COALESCE(sum(b.amount), 0) FROM billing b
             WHERE b.amount > 0
               AND lower(coalesce(b.status, '')) NOT IN ('failed', 'refunded', 'cancelled')
               AND lower(coalesce(b.payment_method, '')) NOT IN ('free trial', 'given')
               AND EXISTS (SELECT 1 FROM growth_events ge
                 WHERE ge.event_name = 'signup_completed' AND ge.user_id = b.user_id
                   AND ge.campaign = {:trackingKey}
                   AND ({:contentKey} = '' OR ge.content = {:contentKey}))) AS revenue,
          (SELECT count(*) FROM promocode_logs pl
             JOIN promocodes p ON p.id = pl.promocode_id
             WHERE p.campaign_id = {:campaignId}) AS promo_uses
    `).bind({
        campaignId: campaignId,
        placementId: placementId || "",
        trackingKey: trackingKey,
        contentKey: contentKey || ""
    }).one(result);
    return {
        visits: Number(result.visits || 0),
        unique_visitors: Number(result.unique_visitors || 0),
        signups: Number(result.signups || 0),
        activated: Number(result.activated || 0),
        paid: Number(result.paid || 0),
        revenue: Number(result.revenue || 0),
        promo_uses: Number(result.promo_uses || 0)
    };
};

var listPlacements = function(app, campaign) {
    var records = app.findRecordsByFilter(
        "marketing_placements",
        "campaign_id = {:campaignId}",
        "created",
        200,
        0,
        { campaignId: campaign.id }
    );
    var output = [];
    for (var i = 0; i < records.length; i++) {
        var item = placementJson(records[i]);
        item.metrics = loadMetrics(
            app,
            String(campaign.get("tracking_key") || ""),
            String(records[i].get("content_key") || ""),
            campaign.id,
            records[i].id
        );
        output.push(item);
    }
    return output;
};

var fullCampaignJson = function(app, campaign) {
    var output = campaignJson(app, campaign);
    var placements = listPlacements(app, campaign);
    var spentCents = 0;
    for (var i = 0; i < placements.length; i++) spentCents += Number(placements[i].cost_cents || 0);
    output.placements = placements;
    output.spent_cents = spentCents;
    output.metrics = loadMetrics(
        app,
        String(campaign.get("tracking_key") || ""),
        "",
        campaign.id,
        ""
    );
    return output;
};

var loadRecordedHistory = function(app, campaign, placement) {
    var result = new DynamicModel({ "visits": 0, "growth_events": 0, "promo_uses": 0 });
    var placementId = placement ? placement.id : "";
    var contentKey = placement ? String(placement.get("content_key") || "") : "";
    app.db().newQuery(`
        SELECT
          (SELECT count(*) FROM marketing_campaign_visits v
             WHERE v.campaign_id = {:campaignId}
               AND ({:placementId} = '' OR v.placement_id = {:placementId})) AS visits,
          (SELECT count(*) FROM growth_events ge
             WHERE ge.campaign = {:trackingKey}
               AND ({:contentKey} = '' OR ge.content = {:contentKey})) AS growth_events,
          (SELECT count(*) FROM promocode_logs pl
             JOIN promocodes p ON p.id = pl.promocode_id
             WHERE p.campaign_id = {:campaignId}) AS promo_uses
    `).bind({
        campaignId: campaign.id,
        placementId: placementId,
        trackingKey: String(campaign.get("tracking_key") || ""),
        contentKey: contentKey
    }).one(result);
    return {
        visits: Number(result.visits || 0),
        growth_events: Number(result.growth_events || 0),
        promo_uses: Number(result.promo_uses || 0)
    };
};

var removalModeForHistory = function(history, includePromoUses) {
    return Number(history.visits || 0) > 0 ||
        Number(history.growth_events || 0) > 0 ||
        (includePromoUses === true && Number(history.promo_uses || 0) > 0)
        ? "archive" : "delete";
};

var assertCampaignEditable = function(campaign) {
    if (String(campaign.get("status") || "") === "archived") {
        throw new BadRequestError("Archived campaigns are read-only.");
    }
};

var normalizeProjectPromocode = function(data, required) {
    var code = cleanText(data.promocode_code || data.code, 32).toUpperCase();
    if (required && !code) throw new BadRequestError("Promocode is required.");
    var rewardEnabled = data.reward_enabled === true;
    var rewardPlan = cleanText(data.reward_plan, 16).toLowerCase();
    var rewardDays = Math.max(0, parseInt(data.reward_days, 10) || 0);
    var maxUses = Math.max(0, Math.min(1000000, parseInt(data.max_uses, 10) || 0));
    if (code && !/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) {
        throw new BadRequestError("Promocode must be 3-32 letters, numbers, underscores, or hyphens.");
    }
    if (code && rewardEnabled && ["pro", "agency"].indexOf(rewardPlan) === -1) {
        throw new BadRequestError("Choose Pro or Agency for the campaign reward.");
    }
    if (code && rewardEnabled && (rewardDays < 1 || rewardDays > 1095)) {
        throw new BadRequestError("Reward duration must be between 1 and 1095 days.");
    }
    return {
        code: code,
        rewardEnabled: rewardEnabled,
        rewardPlan: rewardEnabled ? rewardPlan : "creator",
        rewardDays: rewardEnabled ? rewardDays : 0,
        maxUses: maxUses
    };
};

var createProjectPromocodeRecord = function(app, campaign, input) {
    utils.assertPromocodeCodeAvailable(app, input.code, "");
    var promos = app.findCollectionByNameOrId("promocodes");
    var promo = new Record(promos, {
        code: input.code,
        internal_name: String(campaign.get("name") || "").substring(0, 120),
        partner_id: "",
        owner_type: "project",
        campaign_id: campaign.id,
        max_uses: input.maxUses,
        current_uses: 0,
        reward_enabled: input.rewardEnabled,
        reward_plan: input.rewardPlan,
        reward_months: 0,
        reward_days: input.rewardDays,
        commission_rate_bps: 0,
        is_active: true
    });
    app.save(promo);
    campaign.set("promocode_id", promo.id);
    app.save(campaign);
    return promo;
};

var createCampaign = function(c) {
    requireCampaignAdmin(c);
    var data = new DynamicModel({
        "name": "",
        "objective": "signups",
        "status": "draft",
        "landing_path": "/",
        "budget_cents": 0,
        "currency": "USD",
        "starts_at": "",
        "ends_at": "",
        "notes": "",
        "promocode_id": "",
        "promocode_code": "",
        "reward_enabled": false,
        "reward_plan": "pro",
        "reward_days": 0,
        "max_uses": 0
    });
    c.bindBody(data);

    var name = cleanText(data.name, 120);
    if (name.length < 2) throw new BadRequestError("Campaign name is required.");
    var objective = normalizeObjective(data.objective);
    var status = normalizeCampaignStatus(data.status);
    var landingPath = normalizeLandingPath(data.landing_path);
    var budgetCents = Math.max(0, Math.min(1000000000, parseInt(data.budget_cents, 10) || 0));
    var currency = normalizeCurrency(data.currency);
    var startsAt = normalizeOptionalDate(data.starts_at, "Campaign start");
    var endsAt = normalizeOptionalDate(data.ends_at, "Campaign end");
    assertDateRange(startsAt, endsAt);
    var notes = cleanText(data.notes, 1000);
    var existingPromoId = cleanText(data.promocode_id, 32);
    var promoInput = normalizeProjectPromocode(data, false);
    var promoCode = promoInput.code;
    if (existingPromoId && promoCode) throw new BadRequestError("Choose an existing promocode or create a new one, not both.");

    var createdId = "";
    $app.runInTransaction((txApp) => {
        var campaigns = txApp.findCollectionByNameOrId("marketing_campaigns");
        var trackingKey = "cmp_" + $security.randomString(20).toLowerCase();
        var campaign = new Record(campaigns, {
            name: name,
            tracking_key: trackingKey,
            objective: objective,
            status: status,
            landing_path: landingPath,
            budget_cents: budgetCents,
            currency: currency,
            starts_at: startsAt,
            ends_at: endsAt,
            notes: notes
        });
        txApp.save(campaign);
        createdId = campaign.id;

        var promo = null;
        if (existingPromoId) {
            promo = txApp.findRecordById("promocodes", existingPromoId);
            if (promo.get("partner_id")) {
                throw new BadRequestError("Partner-owned promocodes cannot be reassigned to project campaigns.");
            }
            if (promo.get("campaign_id") && promo.get("campaign_id") !== campaign.id) {
                throw new BadRequestError("This promocode already belongs to another campaign.");
            }
        } else if (promoCode) {
            promo = createProjectPromocodeRecord(txApp, campaign, promoInput);
        }
        if (promo && existingPromoId) {
            promo.set("owner_type", "project");
            promo.set("campaign_id", campaign.id);
            promo.set("commission_rate_bps", 0);
            txApp.save(promo);
            campaign.set("promocode_id", promo.id);
            txApp.save(campaign);
        }
    });

    return c.json(201, fullCampaignJson($app, $app.findRecordById("marketing_campaigns", createdId)));
};

var createCampaignPromocode = function(c) {
    requireCampaignAdmin(c);
    var campaignId = c.request.pathValue("id");
    var campaign = $app.findRecordById("marketing_campaigns", campaignId);
    assertCampaignEditable(campaign);
    if (String(campaign.get("promocode_id") || "")) {
        throw new BadRequestError("This campaign already has a promocode.");
    }
    var data = new DynamicModel({
        "code": "",
        "reward_enabled": false,
        "reward_plan": "pro",
        "reward_days": 0,
        "max_uses": 0
    });
    c.bindBody(data);
    var input = normalizeProjectPromocode(data, true);

    $app.runInTransaction((txApp) => {
        var txCampaign = txApp.findRecordById("marketing_campaigns", campaignId);
        assertCampaignEditable(txCampaign);
        if (String(txCampaign.get("promocode_id") || "")) {
            throw new BadRequestError("This campaign already has a promocode.");
        }
        createProjectPromocodeRecord(txApp, txCampaign, input);
    });

    return c.json(201, fullCampaignJson($app, $app.findRecordById("marketing_campaigns", campaignId)));
};

var listCampaigns = function(c) {
    requireCampaignAdmin(c);
    var records = $app.findAllRecords("marketing_campaigns");
    records.sort(function(left, right) {
        return String(right.get("created") || "").localeCompare(String(left.get("created") || ""));
    });
    var output = [];
    for (var i = 0; i < records.length; i++) output.push(fullCampaignJson($app, records[i]));
    c.response.header().add("Cache-Control", "no-store");
    return c.json(200, { campaigns: output });
};

var getCampaign = function(c) {
    requireCampaignAdmin(c);
    var campaign = $app.findRecordById("marketing_campaigns", c.request.pathValue("id"));
    c.response.header().add("Cache-Control", "no-store");
    return c.json(200, fullCampaignJson($app, campaign));
};

var updateCampaign = function(c) {
    requireCampaignAdmin(c);
    var id = c.request.pathValue("id");
    var current = $app.findRecordById("marketing_campaigns", id);
    assertCampaignEditable(current);
    var data = new DynamicModel({
        name: String(current.get("name") || ""),
        objective: String(current.get("objective") || "signups"),
        status: String(current.get("status") || "draft"),
        landing_path: String(current.get("landing_path") || "/"),
        budget_cents: Number(current.get("budget_cents") || 0),
        currency: String(current.get("currency") || "USD"),
        starts_at: String(current.get("starts_at") || ""),
        ends_at: String(current.get("ends_at") || ""),
        notes: String(current.get("notes") || "")
    });
    c.bindBody(data);
    var name = cleanText(data.name, 120);
    if (name.length < 2) throw new BadRequestError("Campaign name is required.");
    var startsAt = normalizeOptionalDate(data.starts_at, "Campaign start");
    var endsAt = normalizeOptionalDate(data.ends_at, "Campaign end");
    assertDateRange(startsAt, endsAt);
    current.set("name", name);
    current.set("objective", normalizeObjective(data.objective));
    current.set("status", normalizeCampaignStatus(data.status));
    current.set("landing_path", normalizeLandingPath(data.landing_path));
    current.set("budget_cents", Math.max(0, Math.min(1000000000, parseInt(data.budget_cents, 10) || 0)));
    current.set("currency", normalizeCurrency(data.currency));
    current.set("starts_at", startsAt);
    current.set("ends_at", endsAt);
    current.set("notes", cleanText(data.notes, 1000));
    $app.save(current);
    return c.json(200, fullCampaignJson($app, current));
};

var createPlacement = function(c) {
    requireCampaignAdmin(c);
    var campaign = $app.findRecordById("marketing_campaigns", c.request.pathValue("id"));
    assertCampaignEditable(campaign);
    var data = new DynamicModel({
        name: "",
        source: "",
        medium: "",
        landing_path: "",
        cost_cents: 0,
        is_active: true,
        notes: ""
    });
    c.bindBody(data);
    var name = cleanText(data.name, 120);
    var source = cleanText(data.source, 64).toLowerCase();
    var medium = cleanText(data.medium, 64).toLowerCase();
    if (name.length < 2) throw new BadRequestError("Placement name is required.");
    if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(source)) throw new BadRequestError("Add a valid source, such as telegram or newsletter.");
    if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(medium)) throw new BadRequestError("Add a valid medium, such as paid_social or email.");
    var landingPath = cleanText(data.landing_path, 160);
    if (landingPath) landingPath = normalizeLandingPath(landingPath);
    var collection = $app.findCollectionByNameOrId("marketing_placements");
    var randomPart = $security.randomString(18).toLowerCase();
    var placement = new Record(collection, {
        campaign_id: campaign.id,
        name: name,
        tracking_slug: "m_" + randomPart,
        content_key: "plc_" + $security.randomString(20).toLowerCase(),
        source: source,
        medium: medium,
        landing_path: landingPath,
        cost_cents: Math.max(0, Math.min(1000000000, parseInt(data.cost_cents, 10) || 0)),
        is_active: data.is_active !== false,
        notes: cleanText(data.notes, 500)
    });
    $app.save(placement);
    return c.json(201, fullCampaignJson($app, campaign));
};

var updatePlacement = function(c) {
    requireCampaignAdmin(c);
    var campaign = $app.findRecordById("marketing_campaigns", c.request.pathValue("id"));
    assertCampaignEditable(campaign);
    var placement = $app.findRecordById("marketing_placements", c.request.pathValue("placementId"));
    if (String(placement.get("campaign_id") || "") !== campaign.id) throw new BadRequestError("Placement not found.");
    var data = new DynamicModel({
        name: String(placement.get("name") || ""),
        source: String(placement.get("source") || ""),
        medium: String(placement.get("medium") || ""),
        landing_path: String(placement.get("landing_path") || ""),
        cost_cents: Number(placement.get("cost_cents") || 0),
        is_active: placement.get("is_active") === true,
        notes: String(placement.get("notes") || "")
    });
    c.bindBody(data);
    var name = cleanText(data.name, 120);
    var source = cleanText(data.source, 64).toLowerCase();
    var medium = cleanText(data.medium, 64).toLowerCase();
    if (name.length < 2) throw new BadRequestError("Placement name is required.");
    if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(source)) throw new BadRequestError("Add a valid source.");
    if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(medium)) throw new BadRequestError("Add a valid medium.");
    var landingPath = cleanText(data.landing_path, 160);
    if (landingPath) landingPath = normalizeLandingPath(landingPath);
    placement.set("name", name);
    placement.set("source", source);
    placement.set("medium", medium);
    placement.set("landing_path", landingPath);
    placement.set("cost_cents", Math.max(0, Math.min(1000000000, parseInt(data.cost_cents, 10) || 0)));
    placement.set("is_active", data.is_active === true);
    placement.set("notes", cleanText(data.notes, 500));
    $app.save(placement);
    return c.json(200, fullCampaignJson($app, campaign));
};

var removePlacement = function(c) {
    requireCampaignAdmin(c);
    var campaign = $app.findRecordById("marketing_campaigns", c.request.pathValue("id"));
    var placement = $app.findRecordById("marketing_placements", c.request.pathValue("placementId"));
    if (String(placement.get("campaign_id") || "") !== campaign.id) throw new BadRequestError("Placement not found.");
    var action = removalModeForHistory(loadRecordedHistory($app, campaign, placement), false);
    if (action === "archive") {
        placement.set("is_active", false);
        $app.save(placement);
    } else {
        $app.delete(placement);
    }
    return c.json(200, { action: action === "archive" ? "disabled" : "deleted", campaign: fullCampaignJson($app, campaign) });
};

var removeCampaign = function(c) {
    requireCampaignAdmin(c);
    var campaign = $app.findRecordById("marketing_campaigns", c.request.pathValue("id"));
    var action = removalModeForHistory(loadRecordedHistory($app, campaign, null), true);
    var campaignId = campaign.id;
    var promoId = String(campaign.get("promocode_id") || "");

    if (action === "archive") {
        $app.runInTransaction(function(txApp) {
            var txCampaign = txApp.findRecordById("marketing_campaigns", campaignId);
            txCampaign.set("status", "archived");
            txApp.save(txCampaign);
            var placements = txApp.findRecordsByFilter(
                "marketing_placements", "campaign_id = {:campaignId}", "created", 200, 0, { campaignId: campaignId }
            );
            for (var i = 0; i < placements.length; i++) {
                placements[i].set("is_active", false);
                txApp.save(placements[i]);
            }
            if (promoId) {
                try {
                    var promo = txApp.findRecordById("promocodes", promoId);
                    if (String(promo.get("campaign_id") || "") === campaignId &&
                        String(promo.get("owner_type") || "") === "project") {
                        promo.set("is_active", false);
                        txApp.save(promo);
                    }
                } catch (promoError) {}
            }
        });
        return c.json(200, {
            action: "archived",
            campaign: fullCampaignJson($app, $app.findRecordById("marketing_campaigns", campaignId))
        });
    }

    $app.runInTransaction(function(txApp) {
        var txCampaign = txApp.findRecordById("marketing_campaigns", campaignId);
        txCampaign.set("promocode_id", "");
        txApp.save(txCampaign);
        if (promoId) {
            try {
                var promo = txApp.findRecordById("promocodes", promoId);
                if (String(promo.get("campaign_id") || "") === campaignId &&
                    String(promo.get("owner_type") || "") === "project" &&
                    Number(promo.get("current_uses") || 0) === 0) {
                    promo.set("campaign_id", "");
                    txApp.save(promo);
                    txApp.delete(promo);
                }
            } catch (promoError) {}
        }
        var placements = txApp.findRecordsByFilter(
            "marketing_placements", "campaign_id = {:campaignId}", "created", 200, 0, { campaignId: campaignId }
        );
        for (var i = 0; i < placements.length; i++) txApp.delete(placements[i]);
        txApp.delete(txCampaign);
    });
    return c.json(200, { action: "deleted", id: campaignId });
};

var recordVisit = function(c) {
    if (!utils.isTrustedRedirectEdgeRequest(c)) return c.json(404, { message: "Not found" });
    c.response.header().add("X-Linktery-Campaign-Origin", "v1");
    c.response.header().add("Cache-Control", "no-store");
    var slug = cleanText(c.request.pathValue("slug"), 40).toLowerCase();
    if (!/^[a-z0-9_-]{8,40}$/.test(slug)) return c.json(404, { message: "Campaign link unavailable" });

    var placement = null;
    try {
        placement = $app.findFirstRecordByFilter(
            "marketing_placements",
            "tracking_slug = {:slug} && is_active = true",
            { slug: slug }
        );
    } catch (error) {
        return c.json(404, { message: "Campaign link unavailable" });
    }
    var campaign = $app.findRecordById("marketing_campaigns", placement.get("campaign_id"));
    if (!campaignIsLive(campaign)) return c.json(404, { message: "Campaign link unavailable" });

    var data = new DynamicModel({ "journey_id": "" });
    c.bindBody(data);
    var journeyId = cleanText(data.journey_id, 64);
    if (!/^[a-zA-Z0-9_-]{12,64}$/.test(journeyId)) journeyId = "";
    var requestId = cleanText(c.request.header.get("X-Linktery-Request-Id"), 128) || $security.randomString(32);
    var userAgent = cleanText(c.request.header.get("User-Agent"), 300);
    var clientIp = utils.getClientIP(c);
    var day = new Date().toISOString().substring(0, 10);
    var visitorKey = journeyId
        ? "j:" + journeyId
        : "v:" + $security.sha256(day + "|" + clientIp + "|" + userAgent + "|" + placement.id).substring(0, 40);
    var quality = utils.isTrustedAutomatedTraffic(c) ? "automated" : "human";
    $app.db().newQuery(`
        INSERT OR IGNORE INTO marketing_campaign_visits (
          id, campaign_id, placement_id, journey_id, visitor_key, traffic_quality
        ) VALUES ({:id}, {:campaignId}, {:placementId}, {:journeyId}, {:visitorKey}, {:quality})
    `).bind({
        id: "visit:" + $security.sha256(requestId + "|" + placement.id).substring(0, 48),
        campaignId: campaign.id,
        placementId: placement.id,
        journeyId: journeyId,
        visitorKey: visitorKey,
        quality: quality
    }).execute();

    var promo = promoJson($app, String(campaign.get("promocode_id") || ""));
    return c.json(200, {
        destination_path: String(placement.get("landing_path") || campaign.get("landing_path") || "/"),
        journey_id: journeyId,
        source: String(placement.get("source") || "campaign"),
        medium: String(placement.get("medium") || "campaign"),
        campaign: String(campaign.get("tracking_key") || ""),
        content: String(placement.get("content_key") || ""),
        promocode: promo && promo.is_active ? promo.code : ""
    });
};

module.exports = {
    createCampaign: createCampaign,
    listCampaigns: listCampaigns,
    getCampaign: getCampaign,
    updateCampaign: updateCampaign,
    createCampaignPromocode: createCampaignPromocode,
    removeCampaign: removeCampaign,
    createPlacement: createPlacement,
    updatePlacement: updatePlacement,
    removePlacement: removePlacement,
    recordVisit: recordVisit,
    campaignIsLive: campaignIsLive,
    normalizeLandingPath: normalizeLandingPath,
    removalModeForHistory: removalModeForHistory
};
