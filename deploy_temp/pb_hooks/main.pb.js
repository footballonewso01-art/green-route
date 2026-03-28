// ==========================================
// MINIMAL HOOKS - Routes Only (for testing)
// ==========================================

// Helper for Stripe REST API calls

// (Diagnostic code removed)


// (Inlined stripeRequest due to PocketBase Engine Scope restrictions)

// Stripe: Create Checkout Session
routerAdd("POST", "/api/stripe/create-checkout", (c) => {
    try {
        const user = c.auth;
        if (!user || user.collection().name !== "users") {
            return c.json(401, { message: "Unauthorized" });
        }

        const data = new DynamicModel({ "priceId": "", "billingCycle": "" });
        c.bindBody(data);
        const priceId = data.priceId;
        const billingCycle = data.billingCycle || "monthly";

        if (!priceId) {
            return c.json(400, { message: "priceId is required" });
        }

        const STRIPE_SECRET_KEY = $os.getenv("STRIPE_SECRET_KEY");
        const HOST_URL = $os.getenv("HOST_URL") || "https://linktery.com";

        const sessionData = {
            "payment_method_types[0]": "card",
            "line_items[0][price]": priceId,
            "line_items[0][quantity]": "1",
            "mode": "subscription",
            "success_url": HOST_URL + "/dashboard/billing?session_id={CHECKOUT_SESSION_ID}",
            "cancel_url": HOST_URL + "/dashboard/pricing",
            "client_reference_id": user.id,
            "customer_email": user.get("email"),
            "metadata[userId]": user.id,
            "metadata[billingCycle]": billingCycle
        };

        const parts = [];
        for (const key in sessionData) {
            parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(sessionData[key]));
        }
        const body = parts.join("&");

        const res = $http.send({
            url: "https://api.stripe.com/v1/checkout/sessions",
            method: "POST",
            body: body,
            headers: {
                "Authorization": "Bearer " + STRIPE_SECRET_KEY,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            timeout: 10
        });

        if (res.statusCode >= 400) {
            throw new Error("Stripe Error " + res.statusCode + ": " + res.raw);
        }
        const session = res.json;

        return c.json(200, { url: session.url });
    } catch (err) {
        let errStr = String(err);
        $app.logger().error("Create checkout error: " + errStr);
        return c.json(500, { message: "Stripe Checkout failed: " + errStr });
    }
}, $apis.requireAuth());

// Stripe: Create Customer Portal Session
routerAdd("POST", "/api/stripe/create-portal", (c) => {
    const user = c.auth;
    if (!user || user.collection().name !== "users") {
        return c.json(401, { message: "Unauthorized" });
    }

    const STRIPE_SECRET_KEY = $os.getenv("STRIPE_SECRET_KEY");
    const HOST_URL = $os.getenv("HOST_URL") || "https://linktery.com";

    if (!STRIPE_SECRET_KEY) {
        return c.json(500, { message: "Stripe is not configured" });
    }

    try {
        const records = $app.findRecordsByFilter(
            "billing",
            "user_id = {:userId} && stripe_customer_id != ''",
            "-created",
            1,
            0,
            { userId: user.id }
        );

        if (records.length === 0) {
            return c.json(400, { message: "No active Stripe customer found for this user." });
        }

        const customerId = records[0].get("stripe_customer_id");

        const portalData = {
            "customer": customerId,
            "return_url": HOST_URL + "/dashboard/billing"
        };
        
        const parts = [];
        for (const key in portalData) {
            parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(portalData[key]));
        }
        const body = parts.join("&");

        const res = $http.send({
            url: "https://api.stripe.com/v1/billing_portal/sessions",
            method: "POST",
            body: body,
            headers: {
                "Authorization": "Bearer " + STRIPE_SECRET_KEY,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            timeout: 10
        });
        if (res.statusCode >= 400) {
            throw new Error("Stripe Error " + res.statusCode + ": " + res.raw);
        }
        const portal = res.json;

        return c.json(200, { url: portal.url });
    } catch (err) {
        $app.logger().error("Create portal error: " + err);
        return c.json(500, { message: err.message });
    }
}, $apis.requireAuth());

// Stripe: Webhook Handler (no auth - receives from Stripe)
routerAdd("POST", "/api/stripe/webhook", (c) => {
    const STRIPE_SECRET_KEY = $os.getenv("STRIPE_SECRET_KEY");

    let eventId;
    try {
        const payload = new DynamicModel({ "id": "" });
        c.bindBody(payload);
        eventId = payload.id;

        if (!eventId || !eventId.startsWith('evt_')) {
            return c.json(400, { error: "Invalid event id" });
        }
    } catch (e) {
        return c.json(400, { error: "Failed to parse webhook JSON" });
    }

    if (!STRIPE_SECRET_KEY) {
        return c.json(500, { error: "Stripe secret key missing" });
    }

    try {
        const res = $http.send({
            url: "https://api.stripe.com/v1/events/" + eventId,
            method: "GET",
            headers: {
                "Authorization": "Bearer " + STRIPE_SECRET_KEY,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            timeout: 10
        });
        if (res.statusCode >= 400) {
            throw new Error("Stripe Error " + res.statusCode + ": " + res.raw);
        }
        const verifiedEvent = res.json;

        if (verifiedEvent.type === "checkout.session.completed") {
            const session = verifiedEvent.data.object;
            const userId = session.client_reference_id || (session.metadata ? session.metadata.userId : null);
            const billingCycle = (session.metadata ? session.metadata.billingCycle : "monthly");
            const customerId = session.customer;
            const subscriptionId = session.subscription || "";

            if (!userId) {
                return c.json(200, { received: true, note: "missing userid" });
            }

            const lineItemsRes = $http.send({
                url: "https://api.stripe.com/v1/checkout/sessions/" + session.id + "/line_items",
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + STRIPE_SECRET_KEY,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                timeout: 10
            });
            if (lineItemsRes.statusCode >= 400) throw new Error("Stripe Items Error " + lineItemsRes.statusCode);
            const lineItems = lineItemsRes.json;
            let planName = "pro";
            let amount = 0;

            if (lineItems.data && lineItems.data.length > 0) {
                const price = lineItems.data[0].price;
                amount = price.unit_amount / 100;
                if (amount >= 29) {
                    planName = "agency";
                } else if (amount >= 11) {
                    planName = "pro";
                }
            }

            $app.runInTransaction((txApp) => {
                const user = txApp.findRecordById("users", userId);
                user.set("plan", planName);
                const now = new DateTime();
                
                // Add 1 year or 1 month based on metadata
                const expiry = billingCycle === "annual" 
                    ? now.addDate(1, 0, 2) 
                    : now.addDate(0, 1, 2);
                    
                user.set("plan_expires_at", expiry.format("Y-m-d H:i:sP"));
                txApp.save(user);

                const existingBilling = txApp.findRecordsByFilter(
                    "billing", "user_id = {:userId}", "-created", 1, 0, { userId: userId }
                );

                if (existingBilling.length > 0) {
                    const bRecord = existingBilling[0];
                    bRecord.set("plan", planName);
                    bRecord.set("amount", amount);
                    bRecord.set("status", "active");
                    bRecord.set("payment_method", "Stripe");
                    bRecord.set("stripe_customer_id", customerId);
                    bRecord.set("stripe_subscription_id", subscriptionId);
                    txApp.save(bRecord);
                } else {
                    const billingColl = txApp.findCollectionByNameOrId("billing");
                    const billingRecord = new Record(billingColl, {
                        "user_id": userId,
                        "plan": planName,
                        "amount": amount,
                        "status": "active",
                        "payment_method": "Stripe",
                        "stripe_customer_id": customerId,
                        "stripe_subscription_id": subscriptionId
                    });
                    txApp.save(billingRecord);
                }
            });
        } else if (verifiedEvent.type === "customer.subscription.deleted") {
            const subscription = verifiedEvent.data.object;
            const customerId = subscription.customer;

            const records = $app.findRecordsByFilter(
                "billing", "stripe_customer_id = {:custId}", "-created", 1, 0, { custId: customerId }
            );

            if (records.length > 0) {
                const bRecord = records[0];
                bRecord.set("status", "canceled");
                $app.save(bRecord);

                const userId = bRecord.get("user_id");
                const user = $app.findRecordById("users", userId);
                user.set("plan", "creator");
                user.set("plan_expires_at", "");
                $app.save(user);
            }
        }

        return c.json(200, { received: true });
    } catch (err) {
        $app.logger().error("Webhook processing error: " + err);
        return c.json(500, { error: err.message });
    }
});

// Server-Side Redirects
routerAdd("GET", "/{slug}", (c) => {
    const slug = c.pathParam("slug");

    const reserved = ["dashboard", "login", "register", "privacy", "terms", "api", "_", "logo.png", "favicon.ico", "assets"];
    if (reserved.some(r => slug.startsWith(r)) || slug.includes(".")) {
        return c.next();
    }

    try {
        const link = $app.findFirstRecordByFilter("links", "slug = {:slug} && active = true", { slug: slug });

        const hasComplexLogic =
            link.get("geo_targeting") ||
            link.get("device_targeting") ||
            link.get("ab_split") ||
            link.get("interstitial_enabled") ||
            link.get("mode") === "direct";

        if (!hasComplexLogic) {
            try {
                const request = c.request();
                const uaStr = request.header.get("User-Agent") || "";
                const isBot = /bot|crawler|spider|criteo|facebookexternalhit/i.test(uaStr);

                if (!isBot) {
                    let os = "Other";
                    if (/Windows/i.test(uaStr)) os = "Windows";
                    else if (/iPhone|iPad|iPod/i.test(uaStr)) os = "iOS";
                    else if (/Android/i.test(uaStr)) os = "Android";
                    else if (/Macintosh/i.test(uaStr)) os = "macOS";
                    else if (/Linux/i.test(uaStr)) os = "Linux";

                    let browser = "Other";
                    if (/Instagram/i.test(uaStr)) browser = "Instagram";
                    else if (/TikTok/i.test(uaStr)) browser = "TikTok";
                    else if (/FBAN|FBAV/i.test(uaStr)) browser = "Facebook";
                    else if (/Chrome/i.test(uaStr)) browser = "Chrome";
                    else if (/Safari/i.test(uaStr)) browser = "Safari";
                    else if (/Firefox/i.test(uaStr)) browser = "Firefox";
                    else if (/Edg/i.test(uaStr)) browser = "Edge";

                    let device = "Desktop";
                    if (/Mobi|Android/i.test(uaStr)) device = "Mobile";
                    else if (/Tablet|iPad/i.test(uaStr)) device = "Tablet";

                    let referrer = "Direct";
                    const ref = request.header.get("Referer") || "";
                    if (ref) {
                        try {
                            if (ref.includes("instagram.com")) referrer = "Instagram";
                            else if (ref.includes("t.co") || ref.includes("twitter.com")) referrer = "Twitter";
                            else if (ref.includes("facebook.com")) referrer = "Facebook";
                            else if (ref.includes("tiktok.com")) referrer = "TikTok";
                            else if (ref.includes("google.com")) referrer = "Google";
                            else referrer = ref.split("/")[2] || "Other";
                        } catch (e) { }
                    }

                    let country = request.header.get("CF-IPCountry") || "Unknown";

                    const cookieHeader = request.header.get("Cookie") || "";
                    const cookieName = "gr_visit_" + link.id;
                    const isUnique = !cookieHeader.includes(cookieName);

                    if (isUnique) {
                        c.response().header().add("Set-Cookie", cookieName + "=1; Path=/; Max-Age=86400; HttpOnly");
                    }

                    const clicksColl = $app.findCollectionByNameOrId("clicks");
                    const clickRecord = new Record(clicksColl, {
                        "link_id": link.id,
                        "country": country,
                        "device": device,
                        "os": os,
                        "browser": browser,
                        "referrer": referrer,
                        "is_unique": isUnique,
                        "user_agent": uaStr.length > 200 ? uaStr.substring(0, 200) : uaStr,
                        "ip": "masked"
                    });
                    $app.save(clickRecord);

                    link.set("clicks_count", link.get("clicks_count") + 1);
                    $app.save(link);
                }
            } catch (err) {
                $app.logger().error("Fast tracking error: " + err);
            }

            return c.redirect(302, link.get("destination_url"));
        }
    } catch (e) {
        // Slug not found, fall through to SPA
    }

    return c.next();
});

// Admin: Update Plan
routerAdd("POST", "/api/admin/update-plan", (c) => {
    try {
        const adminUser = c.auth;
        if (!adminUser || adminUser.get("role") !== "admin") {
            throw new ForbiddenError("Only admins can update plans.");
        }

        const data = new DynamicModel({
            "userId": "",
            "plan": "",
            "days": 0
        });
        c.bindBody(data);

        const userId = data.userId;
        const newPlan = data.plan;

        const targetUser = $app.findRecordById("users", userId);
        targetUser.set("plan", newPlan);

        if (newPlan !== "creator") {
            const expires = new Date();
            const days = Math.max(1, data.days || 30);
            expires.setDate(expires.getDate() + days);
            targetUser.set("plan_expires_at", new DateTime(expires));

            const billingColl = $app.findCollectionByNameOrId("billing");
            const billingRecord = new Record(billingColl, {
                "user_id": userId,
                "plan": newPlan,
                "amount": newPlan === "pro" ? 11 : 29,
                "status": "active",
                "payment_method": "Given"
            });
            $app.save(billingRecord);
        } else {
            targetUser.set("plan_expires_at", "");
        }

        $app.save(targetUser);

        return c.json(200, { "success": true });
    } catch (err) {
        $app.logger().error("Admin plan update error: " + err);
        throw new BadRequestError(err.message);
    }
}, $apis.requireSuperuserAuth());

// Track Profile Views - MOVED to track_profile.pb.js for reliability


// ==========================================
// RECORD HOOKS (non-critical, safe to fail)
// ==========================================

// Username change cooldown
onRecordUpdateRequest((e) => {
    const newUsername = e.record.get("username");
    const oldUsername = e.record.original().get("username");

    if (newUsername !== oldUsername) {
        const lastChanged = e.record.get("username_last_changed");
        if (lastChanged && lastChanged.toString().trim() !== "") {
            const lastChangedDate = new Date(lastChanged.toString());
            const now = new Date();
            const diffDays = Math.floor((now - lastChangedDate) / (1000 * 60 * 60 * 24));
            if (!isNaN(diffDays) && diffDays < 21) {
                throw new BadRequestError("You can only change your username once every 21 days. (Next change allowed in " + (21 - diffDays) + " days)");
            }
        }
        e.record.set("username_last_changed", new DateTime());
    }

    e.next();
}, "users");

// Slug-Username collision prevention on link create
onRecordCreateRequest((e) => {
    const slug = e.record.get("slug");
    const userId = e.record.get("user_id");

    let userWithSameName = null;
    try {
        userWithSameName = $app.findFirstRecordByFilter("users", "username = {:slug}", { slug: slug });
    } catch (err) { }

    if (userWithSameName) {
        throw new BadRequestError("This slug is already taken by a user profile.");
    }

    // Enforce Plan Limits
    const user = $app.findRecordById("users", userId);
    const plan = user.get("plan") || "creator";
    const limits = { "creator": 4, "pro": 15, "agency": 110 };
    const maxLinks = limits[plan];

    if (maxLinks !== -1) {
        let linksCount = 0;
        try {
            const records = $app.findRecordsByFilter("links", "user_id = {:userId}", "-created", maxLinks + 1, 0, { userId: userId });
            linksCount = records.length;
        } catch (err) { }

        if (linksCount >= maxLinks) {
            throw new BadRequestError("You have reached the link limit for your " + plan + " plan. Please upgrade to create more.");
        }
    }

    e.next();
}, "links");

// Username-Slug collision prevention on user update
onRecordUpdateRequest((e) => {
    const newUsername = e.record.get("username");
    const oldUsername = e.record.original().get("username");

    if (newUsername !== oldUsername) {
        let linkWithSameSlug = null;
        try {
            linkWithSameSlug = $app.findFirstRecordByFilter("links", "slug = {:username}", { username: newUsername });
        } catch (err) { }

        if (linkWithSameSlug) {
            throw new BadRequestError("This username matches an existing link slug.");
        }
    }

    e.next();
}, "users");

// Hourly cron: downgrade expired plans
cronAdd("check_expired_plans", "0 * * * *", () => {
    const now = new DateTime();
    const nowStr = now.format("Y-m-d H:i:s");

    try {
        const records = $app.findRecordsByFilter(
            "users",
            "plan != 'creator' && plan_expires_at != '' && plan_expires_at <= {:now}",
            "-created", 0, 0, { now: nowStr }
        );

        for (let i = 0; i < records.length; i++) {
            const user = records[i];
            user.set("plan", "creator");
            user.set("plan_expires_at", "");
            $app.save(user);
        }
    } catch (err) {
        $app.logger().error("Error checking expired plans: " + err);
    }
});
