onRecordBeforeUpdateRequest((e) => {
    if (e.collection.name !== "users") return;

    const newUsername = e.record.get("username");
    const oldUsername = e.record.originalCopy().get("username");

    if (newUsername !== oldUsername) {
        const lastChanged = e.record.get("username_last_changed");

        if (lastChanged) {
            const lastChangedDate = new Date(lastChanged.toString());
            const now = new Date();
            const diffDays = Math.floor((now - lastChangedDate) / (1000 * 60 * 60 * 24));

            if (diffDays < 21) {
                throw new BadRequestError("You can only change your username once every 21 days. (Next change allowed in " + (21 - diffDays) + " days)");
            }
        }

        // Update the timestamp for the next check
        e.record.set("username_last_changed", new DateTime());
    }
}, "users");

// 2. Link Quota Enforcement & Slug Protection
onRecordBeforeCreateRequest((e) => {
    const slug = e.record.get("slug");
    const userId = e.record.get("user_id");

    // A. Prevent Slug-Username collisions
    let userWithSameName = null;
    try {
        userWithSameName = $app.dao().findFirstRecordByFilter("users", "username = {:slug}", { slug: slug });
    } catch (err) {
        // Safe to ignore sql: no rows in result set
    }

    if (userWithSameName) {
        throw new BadRequestError("This slug is already taken by a user profile.");
    }

    // B. Enforce Plan Limits
    const user = $app.dao().findRecordById("users", userId);
    const plan = user.get("plan") || "creator";
    const limits = {
        "creator": 4,
        "pro": 15,
        "agency": -1
    };

    const maxLinks = limits[plan];

    // Only query count if there is a limit
    if (maxLinks !== -1) {
        let linksCount = 0;
        try {
            const records = $app.dao().findRecordsByFilter("links", "user_id = {:userId}", "-created", maxLinks + 1, 0, { userId: userId });
            linksCount = records.length;
        } catch (err) {
            // Ignore if no records found
        }

        if (linksCount >= maxLinks) {
            throw new BadRequestError("You have reached the link limit for your " + plan + " plan. Please upgrade to create more.");
        }
    }
}, "links");

// 3. Username Protection against existing Slugs
onRecordBeforeUpdateRequest((e) => {
    if (e.collection.name !== "users") return;

    const newUsername = e.record.get("username");
    const oldUsername = e.record.originalCopy().get("username");

    if (newUsername !== oldUsername) {
        let linkWithSameSlug = null;
        try {
            linkWithSameSlug = $app.dao().findFirstRecordByFilter("links", "slug = {:username}", { username: newUsername });
        } catch (err) {
            // Safe to ignore sql: no rows
        }

        if (linkWithSameSlug) {
            throw new BadRequestError("This username matches an existing link slug.");
        }
    }
}, "users");

// 4. Hourly Cron Job: Check and downgrade expired plans
cronAdd("check_expired_plans", "0 * * * *", () => {
    const now = new DateTime();
    const nowStr = now.format("Y-m-d H:i:s");

    try {
        const records = $app.dao().findRecordsByFilter(
            "users",
            "plan != 'creator' && plan_expires_at != '' && plan_expires_at <= {:now}",
            "-created",
            0,
            0,
            { now: nowStr }
        );

        for (let i = 0; i < records.length; i++) {
            const user = records[i];
            user.set("plan", "creator");
            user.set("plan_expires_at", "");
            $app.dao().saveRecord(user);
        }

        if (records.length > 0) {
            $app.logger().info("Automatically downgraded " + records.length + " expired user plans to 'creator'.");
        }
    } catch (err) {
        $app.logger().error("Error checking expired plans: " + err);
    }
});

// 5. Analytics: Track Signup
onRecordAfterCreateRequest((e) => {
    if (e.collection.name !== "users") return;

    try {
        const analyticsColl = $app.dao().findCollectionByNameOrId("analytics_events");
        const event = new Record(analyticsColl, {
            "event_name": "signup",
            "user_id": e.record.id,
            "metadata": JSON.stringify({
                "email": e.record.get("email"),
                "source": "backend_hook"
            })
        });
        $app.dao().saveRecord(event);
    } catch (err) {
        $app.logger().error("Error tracking signup event: " + err);
    }
}, "users");

// 6. Analytics: Track Login
onRecordAfterAuthWithPasswordRequest((e) => {
    if (e.collection.name !== "users") return;

    try {
        const analyticsColl = $app.dao().findCollectionByNameOrId("analytics_events");
        const event = new Record(analyticsColl, {
            "event_name": "login",
            "user_id": e.record.id,
            "metadata": JSON.stringify({
                "time": new DateTime().format("Y-m-d H:i:s"),
                "ua": e.httpContext.request().header.get("User-Agent")
            })
        });
        $app.dao().saveRecord(event);
    } catch (err) {
        $app.logger().error("Error tracking login event: " + err);
    }
}, "users");

// ==========================================
// STRIPE INTEGRATION
// ==========================================

const STRIPE_SECRET_KEY = $os.getenv("STRIPE_SECRET_KEY");
const HOST_URL = $os.getenv("HOST_URL") || "https://linktery.com";

// Helper for Stripe REST API calls
function stripeRequest(method, endpoint, data) {
    let url = "https://api.stripe.com/v1" + endpoint;
    let body = null;
    let headers = {
        "Authorization": "Bearer " + STRIPE_SECRET_KEY,
        "Content-Type": "application/x-www-form-urlencoded"
    };

    if (data) {
        // Convert JS object to URL encoded string
        const params = new URLSearchParams();
        for (const key in data) {
            if (typeof data[key] === 'object' && data[key] !== null) {
                for (const subKey in data[key]) {
                    params.append(`${key}[${subKey}]`, data[key][subKey]);
                }
            } else {
                params.append(key, data[key]);
            }
        }
        body = params.toString();

        if (method === "GET") {
            url += "?" + body;
            body = null;
        }
    }

    const res = $http.send({
        url: url,
        method: method,
        body: body,
        headers: headers,
        timeout: 10 // seconds
    });

    if (res.statusCode >= 400) {
        throw new Error("Stripe Error " + res.statusCode + ": " + res.raw);
    }

    return res.json;
}

// Stripe: Create Checkout Session
routerAdd("POST", "/api/stripe/create-checkout", (c) => {
    const user = c.get("authRecord");
    if (!user || user.collection().name !== "users") {
        return c.json(401, { error: "Unauthorized" });
    }

    const body = $apis.requestInfo(c).data;
    const priceId = body.priceId;

    if (!priceId) {
        return c.json(400, { error: "priceId is required" });
    }

    if (!STRIPE_SECRET_KEY) {
        return c.json(500, { error: "Stripe is not configured on the server" });
    }

    try {
        const sessionData = {
            "payment_method_types[0]": "card",
            "line_items[0][price]": priceId,
            "line_items[0][quantity]": "1",
            "mode": "subscription",
            "success_url": `${HOST_URL}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`,
            "cancel_url": `${HOST_URL}/dashboard/pricing`,
            "client_reference_id": user.id,
            "customer_email": user.get("email"),
            "metadata[userId]": user.id
        };

        const session = stripeRequest("POST", "/checkout/sessions", sessionData);

        return c.json(200, { url: session.url });
    } catch (err) {
        $app.logger().error("Create checkout error: " + err);
        return c.json(500, { error: err.message });
    }
}, $apis.requireRecordAuth("users"));

// Stripe: Create Customer Portal Session
routerAdd("POST", "/api/stripe/create-portal", (c) => {
    const user = c.get("authRecord");
    if (!user || user.collection().name !== "users") {
        return c.json(401, { error: "Unauthorized" });
    }

    if (!STRIPE_SECRET_KEY) {
        return c.json(500, { error: "Stripe is not configured" });
    }

    try {
        // Find billing record to get stripe_customer_id
        const records = $app.dao().findRecordsByFilter(
            "billing",
            "user_id = {:userId} && stripe_customer_id != ''",
            "-created",
            1,
            0,
            { userId: user.id }
        );

        if (records.length === 0) {
            return c.json(400, { error: "No active Stripe customer found for this user." });
        }

        const customerId = records[0].get("stripe_customer_id");

        const portalData = {
            "customer": customerId,
            "return_url": `${HOST_URL}/dashboard/billing`
        };

        const portal = stripeRequest("POST", "/billing_portal/sessions", portalData);

        return c.json(200, { url: portal.url });
    } catch (err) {
        $app.logger().error("Create portal error: " + err);
        return c.json(500, { error: err.message });
    }
}, $apis.requireRecordAuth("users"));

// Stripe: Webhook Handler
routerAdd("POST", "/api/stripe/webhook", (c) => {
    // NOTE: This endpoint receives unauthenticated POSTs from Stripe.

    let eventId;
    try {
        const payload = $apis.requestInfo(c).data;
        eventId = payload.id;

        if (!eventId || !eventId.startsWith('evt_')) {
            return c.json(400, { error: "Invalid event id" });
        }
    } catch (e) {
        return c.json(400, { error: "Failed to parse webhook JSON" });
    }

    try {
        // Refetch the event directly from Stripe to verify it's authentic and not spoofed
        const verifiedEvent = stripeRequest("GET", `/events/${eventId}`);

        if (verifiedEvent.type === "checkout.session.completed") {
            const session = verifiedEvent.data.object;
            const userId = session.client_reference_id || (session.metadata ? session.metadata.userId : null);
            const customerId = session.customer;
            const subscriptionId = session.subscription || "";

            if (!userId) {
                $app.logger().warn("Stripe webhook: Checkout completed but missing userId");
                return c.json(200, { received: true, note: "missing userid" });
            }

            // We need to fetch the line items to know which plan they bought
            const lineItems = stripeRequest("GET", `/checkout/sessions/${session.id}/line_items`);
            let planName = "pro"; // default fallback
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

            $app.dao().runInTransaction((txDao) => {
                // Update user's plan
                const user = txDao.findRecordById("users", userId);
                user.set("plan", planName);

                // Set expiry 32 days from now to give padding
                const now = new DateTime();
                const expiry = now.addDate(0, 1, 2);
                user.set("plan_expires_at", expiry.format("Y-m-d H:i:sP"));
                txDao.saveRecord(user);

                // Check for existing billing record
                const existingBilling = txDao.findRecordsByFilter(
                    "billing",
                    "user_id = {:userId}",
                    "-created",
                    1,
                    0,
                    { userId: userId }
                );

                if (existingBilling.length > 0) {
                    const bRecord = existingBilling[0];
                    bRecord.set("plan", planName);
                    bRecord.set("amount", amount);
                    bRecord.set("status", "active");
                    bRecord.set("payment_method", "Stripe");
                    bRecord.set("stripe_customer_id", customerId);
                    bRecord.set("stripe_subscription_id", subscriptionId);
                    txDao.saveRecord(bRecord);
                } else {
                    const billingColl = txDao.findCollectionByNameOrId("billing");
                    const billingRecord = new Record(billingColl, {
                        "user_id": userId,
                        "plan": planName,
                        "amount": amount,
                        "status": "active",
                        "payment_method": "Stripe",
                        "stripe_customer_id": customerId,
                        "stripe_subscription_id": subscriptionId
                    });
                    txDao.saveRecord(billingRecord);
                }

                // Analytics
                const analyticsColl = txDao.findCollectionByNameOrId("analytics_events");
                const event = new Record(analyticsColl, {
                    "event_name": "billing_upgrade",
                    "user_id": userId,
                    "metadata": JSON.stringify({
                        "plan": planName,
                        "amount": amount,
                        "method": "Stripe Checkout"
                    })
                });
                txDao.saveRecord(event);
            });

            $app.logger().info(`Stripe webhook processed: upgraded user ${userId} to ${planName}`);
        } else if (verifiedEvent.type === "customer.subscription.deleted") {
            const subscription = verifiedEvent.data.object;
            const customerId = subscription.customer;

            const records = $app.dao().findRecordsByFilter(
                "billing",
                "stripe_customer_id = {:custId}",
                "-created",
                1,
                0,
                { custId: customerId }
            );

            if (records.length > 0) {
                const bRecord = records[0];
                bRecord.set("status", "canceled");
                $app.dao().saveRecord(bRecord);

                // Downgrade user
                const userId = bRecord.get("user_id");
                const user = $app.dao().findRecordById("users", userId);
                user.set("plan", "creator");
                user.set("plan_expires_at", "");
                $app.dao().saveRecord(user);

                $app.logger().info(`Stripe webhook processed: downgraded user ${userId} due to cancelation`);
            }
        }

        return c.json(200, { received: true });
    } catch (err) {
        $app.logger().error("Webhook processing error: " + err);
        return c.json(500, { error: err.message });
    }
});

// 7. Analytics: Track Link Creation
onRecordAfterCreateRequest((e) => {
    try {
        const analyticsColl = $app.dao().findCollectionByNameOrId("analytics_events");
        const event = new Record(analyticsColl, {
            "event_name": "link_create",
            "user_id": e.record.get("user_id"),
            "metadata": JSON.stringify({
                "slug": e.record.get("slug"),
                "type": e.record.get("type")
            })
        });
        $app.dao().saveRecord(event);
    } catch (err) {
        $app.logger().error("Error tracking link_create event: " + err);
    }
}, "links");

// 8. Analytics: Track Billing/Revenue
onRecordAfterCreateRequest((e) => {
    try {
        const analyticsColl = $app.dao().findCollectionByNameOrId("analytics_events");
        const event = new Record(analyticsColl, {
            "event_name": "billing_success",
            "user_id": e.record.get("user_id"),
            "metadata": JSON.stringify({
                "plan": e.record.get("plan"),
                "amount": e.record.get("amount")
            })
        });
        $app.dao().saveRecord(event);
    } catch (err) {
        $app.logger().error("Error tracking billing event: " + err);
    }
}, "billing");

// 9. Extreme Optimization: High-Performance Server-Side Redirects
// This handles simple redirects directly at the server level, bypassing the React frontend for maximum speed.
routerAdd("GET", "/{slug}", (c) => {
    const slug = c.pathParam("slug");

    // Skip known static files and frontend routes
    const reserved = ["dashboard", "login", "register", "privacy", "terms", "api", "_", "logo.png", "favicon.ico", "assets"];
    if (reserved.some(r => slug.startsWith(r)) || slug.includes(".")) {
        return c.next();
    }

    try {
        // Try to find an active link with this slug
        const link = $app.dao().findFirstRecordByFilter("links", "slug = {:slug} && active = true", { slug: slug });

        // Check if there is complex logic involved
        // If geo-targeting, device-targeting, split testing, interstitial, or deeplinks is enabled,
        // we let the React frontend handle it for full feature support (browser detection, etc.)
        const hasComplexLogic =
            link.get("geo_targeting") ||
            link.get("device_targeting") ||
            link.get("ab_split") ||
            link.get("interstitial_enabled") ||
            link.get("mode") === "direct";

        if (!hasComplexLogic) {
            // HIGH-PERFORMANCE ANALYTICS TRACKING
            try {
                const request = c.request();
                const uaStr = request.header.get("User-Agent") || "";

                // Bot detection
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

                    const clicksColl = $app.dao().findCollectionByNameOrId("clicks");
                    const clickRecord = new Record(clicksColl, {
                        "link_id": link.id,
                        "country": country,
                        "device": device,
                        "os": os,
                        "browser": browser,
                        "referrer": referrer,
                        "is_unique": isUnique,
                        "user_agent": uaStr.length > 200 ? uaStr.substring(0, 200) : uaStr,
                        "ip": "masked" // Masked IP for privacy
                    });
                    $app.dao().saveRecord(clickRecord);

                    // Increment clicks_count manually to match what frontend used to do
                    link.set("clicks_count", link.get("clicks_count") + 1);
                    $app.dao().saveRecord(link);
                }
            } catch (err) {
                $app.logger().error("Fast tracking error: " + err);
            }

            // Perform instant 302 redirect
            return c.redirect(302, link.get("destination_url"));
        }
    } catch (e) {
        // Slug not found in links, fall through to SPA (might be a user profile)
    }

    return c.next();
});

routerAdd("POST", "/api/admin/update-plan", (c) => {
    try {
        const adminUser = c.get("authRecord");
        if (!adminUser || adminUser.get("role") !== "admin") {
            throw new ForbiddenError("Only admins can update plans.");
        }

        const data = new DynamicModel({
            "userId": "",
            "plan": "",
            "days": 0
        });
        c.bind(data);

        const userId = data.userId;
        const newPlan = data.plan;

        const targetUser = $app.dao().findRecordById("users", userId);
        targetUser.set("plan", newPlan);

        if (newPlan !== "creator") {
            const expires = new Date();
            const days = Math.max(1, data.days || 30);
            expires.setDate(expires.getDate() + days);
            targetUser.set("plan_expires_at", new DateTime(expires));

            // create billing record
            const billingColl = $app.dao().findCollectionByNameOrId("billing");
            const billingRecord = new Record(billingColl, {
                "user_id": userId,
                "plan": newPlan,
                "amount": newPlan === "pro" ? 11 : 29,
                "status": "active",
                "payment_method": "Given"
            });
            $app.dao().saveRecord(billingRecord);
        } else {
            targetUser.set("plan_expires_at", "");
        }

        $app.dao().saveRecord(targetUser);

        return c.json(200, { "success": true });
    } catch (err) {
        $app.logger().error("Admin plan update error: " + err);
        throw new BadRequestError(err.message);
    }
}, $apis.requireRecordAuth("users"));
