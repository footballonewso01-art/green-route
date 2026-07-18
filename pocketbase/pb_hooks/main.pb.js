// ==========================================
// POCKETBASE JS HOOKS - Linktery Stable
// ==========================================
console.log("--- main.pb.js LOADING ---");

// --- Daily VACUUM on auxiliary.db to reclaim disk space ---
cronAdd("vacuum_auxiliary_db", "30 3 * * *", () => {
    try {
        $app.auxVacuum();
        $app.logger().info("CRON: auxiliary.db VACUUM completed");
    } catch (e) {
        $app.logger().error("CRON: auxiliary.db VACUUM failed: " + String(e));
    }
});

// (Database initialization moved to migrations)


// All Agency Price IDs (live + test, monthly + annual) for reliable plan detection
// NOTE: Must use 'var' (not 'const') so routerAdd callbacks can access it in PB v0.24 JSVM
var AGENCY_PRICE_IDS = [
    "price_1T9ojK1kCVZzZn9tmOrvoNOn", // live monthly
    "price_1TA5kT1kCVZzZn9tAP7AsNjs", // live annual
    "price_1TA5ay1kCVZzZn9thZD9Rhsi", // test monthly
    "price_1TA5mh1kCVZzZn9tN3UmsgCC"  // test annual
];

// Rate Limit Memory Store and cache variables migrated to top of file


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

        // Look up existing Stripe Customer to prevent creating duplicates on upgrade
        let existingCustomerId = "";
        let existingSubscriptionId = "";
        try {
            const billingRecords = $app.findRecordsByFilter(
                "billing",
                "user_id = {:userId} && stripe_customer_id != ''",
                "-created", 1, 0,
                { userId: user.id }
            );
            if (billingRecords.length > 0) {
                existingCustomerId = billingRecords[0].get("stripe_customer_id");
                const subId = billingRecords[0].get("stripe_subscription_id");
                const status = billingRecords[0].get("status");
                if (subId && (status === "active" || status === "canceling")) {
                    existingSubscriptionId = subId;
                }
            }
            // Fallback: check users table
            if (!existingCustomerId) {
                const custId = user.get("stripe_customer_id");
                if (custId) existingCustomerId = custId;
            }
        } catch (lookupErr) {
            $app.logger().info("create-checkout: customer lookup error (non-fatal): " + lookupErr);
        }

        $app.logger().info("create-checkout: user=" + user.id + " existingCustomer=" + (existingCustomerId || "none") + " existingSub=" + (existingSubscriptionId || "none"));

        const sessionData = {
            "payment_method_types[0]": "card",
            "line_items[0][price]": priceId,
            "line_items[0][quantity]": "1",
            "mode": "subscription",
            "success_url": HOST_URL + "/dashboard/billing?session_id={CHECKOUT_SESSION_ID}",
            "cancel_url": HOST_URL + "/dashboard/pricing",
            "client_reference_id": user.id,
            "metadata[userId]": user.id,
            "metadata[billingCycle]": billingCycle
        };

        // Reuse existing Stripe Customer if available, otherwise let Stripe create one via email
        if (existingCustomerId) {
            sessionData["customer"] = existingCustomerId;
        } else {
            sessionData["customer_email"] = user.get("email");
        }

        // Track old subscription so webhook can cancel it after new one activates
        if (existingSubscriptionId) {
            sessionData["metadata[oldSubscriptionId]"] = existingSubscriptionId;
        }

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

// Stripe: Cancel Subscription
routerAdd("POST", "/api/stripe/cancel-subscription", (c) => {
    var stripeUtils = require(__hooks + '/utils.js');
    const user = c.auth;
    if (!user || user.collection().name !== "users") {
        return c.json(401, { message: "Unauthorized" });
    }

    const STRIPE_SECRET_KEY = $os.getenv("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
        return c.json(500, { message: "Stripe is not configured" });
    }

    try {
        const records = $app.findRecordsByFilter(
            "billing",
            "user_id = {:userId} && status = 'active' && stripe_subscription_id != ''",
            "-created",
            1,
            0,
            { userId: user.id }
        );
        if (records.length === 0) {
            // User is Pro/Agency but has no active recurring Stripe subscription in our database (e.g. promocode, manual gift)
            return c.json(200, { success: true, message: "Your plan is non-recurring (activated via promocode or gift) and will expire automatically without any charges." });
        }

        const bRecord = records[0];
        const subscriptionId = bRecord.get("stripe_subscription_id");

        // Cancel subscription at period end via Stripe API (POST method)
        const res = $http.send({
            url: "https://api.stripe.com/v1/subscriptions/" + subscriptionId,
            method: "POST",
            body: "cancel_at_period_end=true",
            headers: {
                "Authorization": "Bearer " + STRIPE_SECRET_KEY,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            timeout: 10
        });

        if (res.statusCode >= 400) {
            throw new Error("Stripe subscription cancel error: " + res.statusCode + " | " + res.raw);
        }

        var cancellationPeriod = null;
        try {
            cancellationPeriod = stripeUtils.getStripePeriodFromSubscription(res.json);
        } catch (periodErr) {
            // The cancellation itself succeeded. subscription.updated will retry
            // the period sync if this response does not contain the dates.
            $app.logger().error("cancel-subscription: could not read Stripe period: " + periodErr);
        }

        // Update the billing record locally to 'canceling' (keeps plan active until end of period)
        $app.runInTransaction((txApp) => {
            bRecord.set("status", "canceling");
            if (cancellationPeriod) {
                bRecord.set("period_start", cancellationPeriod.start);
                bRecord.set("end_date", cancellationPeriod.end);
            }
            txApp.save(bRecord);
        });

        $app.logger().info("cancel-subscription: auto-renewal disabled for subscription '" + subscriptionId + "' of user " + user.id);
        return c.json(200, { success: true, message: "Subscription auto-renewal turned off successfully." });
    } catch (err) {
        $app.logger().error("Cancel subscription error: " + err);
        return c.json(500, { message: err.message || String(err) });
    }
});

// Stripe: Webhook Handler (no auth - receives from Stripe)
routerAdd("POST", "/api/stripe/webhook", (c) => {
    var stripeUtils = require(__hooks + '/utils.js');
    const STRIPE_SECRET_KEY = $os.getenv("STRIPE_SECRET_KEY");

    // --- Phase 1: Parse event ID from body ---
    let eventId;
    try {
        const data = new DynamicModel({
            id: ""
        });
        c.bindBody(data);
        eventId = data.id;
        if (!eventId || !/^evt_[a-zA-Z0-9_]+$/.test(String(eventId))) {
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
        $app.db().newQuery("INSERT INTO _processed_stripe_events (id) VALUES ({:id})").bind({ "id": eventId }).execute();
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
                var agencyIds = ["price_1T9ojK1kCVZzZn9tmOrvoNOn", "price_1TA5kT1kCVZzZn9tAP7AsNjs", "price_1TA5ay1kCVZzZn9thZD9Rhsi", "price_1TA5mh1kCVZzZn9tN3UmsgCC"];
                if (price.id && agencyIds.indexOf(price.id) !== -1) {
                    planName = "agency";
                }
            }
            $app.logger().info("Webhook: detected plan=" + planName + " amount=" + amount + " billingCycle=" + billingCycle);

            var checkoutPeriod = stripeUtils.fetchStripeSubscriptionPeriod(subscriptionId, STRIPE_SECRET_KEY);

            // Activate plan in transaction
            $app.runInTransaction((txApp) => {
                var user = txApp.findRecordById("users", userId);
                user.set("plan", planName);
                user.set("plan_expires_at", checkoutPeriod.end);
                user.set("stripe_customer_id", customerId);
                user.set("stripe_subscription_id", subscriptionId);
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
                    bRecord.set("period_start", checkoutPeriod.start);
                    bRecord.set("end_date", checkoutPeriod.end);
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
                        "stripe_subscription_id": subscriptionId,
                        "period_start": checkoutPeriod.start,
                        "end_date": checkoutPeriod.end
                    });
                    txApp.save(billingRecord);
                }
            });

            // Cancel old subscription if this was an upgrade (prevent double billing)
            var oldSubId = session.metadata ? session.metadata.oldSubscriptionId : null;
            if (oldSubId && oldSubId !== subscriptionId) {
                try {
                    var cancelRes = $http.send({
                        url: "https://api.stripe.com/v1/subscriptions/" + oldSubId,
                        method: "DELETE",
                        headers: {
                            "Authorization": "Bearer " + STRIPE_SECRET_KEY,
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        timeout: 10
                    });
                    $app.logger().info("Webhook: Cancelled old subscription " + oldSubId + " (status=" + cancelRes.statusCode + ") after upgrade for user " + userId);
                } catch (cancelErr) {
                    $app.logger().error("Webhook: Failed to cancel old subscription " + oldSubId + ": " + cancelErr);
                }
            }

            $app.logger().info("Webhook: SUCCESS plan '" + planName + "' activated for user " + userId);

        } else if (verifiedEvent.type === "invoice.paid") {
            var invoice = verifiedEvent.data.object;
            var invCustomerId = invoice.customer;

            // Extract subscription ID from various locations depending on Stripe API version
            var subscriptionId = invoice.subscription ||
                (invoice.parent && invoice.parent.subscription_details && invoice.parent.subscription_details.subscription) ||
                "";
            if (!subscriptionId && invoice.lines && invoice.lines.data && invoice.lines.data.length > 0) {
                var firstLine = invoice.lines.data[0];
                if (firstLine.subscription) {
                    subscriptionId = firstLine.subscription;
                } else if (firstLine.parent && firstLine.parent.subscription_item_details) {
                    subscriptionId = firstLine.parent.subscription_item_details.subscription;
                }
            }

            if (subscriptionId) {
                var invAmount = invoice.amount_paid / 100;
                $app.logger().info("Webhook: invoice.paid for customer " + invCustomerId + " amount=$" + invAmount + " sub=" + subscriptionId + " email=" + (invoice.customer_email || "none"));

                // Step 1: The subscription id is the strongest identity. A
                // customer may own an older subscription while an upgrade is in
                // progress, so do not choose the latest customer record first.
                var bRecord = null;
                var bUserId = "";
                var lookupMethod = "none";

                try {
                    var subscriptionRecords = $app.findRecordsByFilter(
                        "billing", "stripe_subscription_id = {:subId}", "-created", 1, 0, { subId: subscriptionId }
                    );
                    if (subscriptionRecords.length > 0) {
                        bRecord = subscriptionRecords[0];
                        bUserId = bRecord.get("user_id");
                        lookupMethod = "billing.stripe_subscription_id";
                        $app.logger().info("Webhook: Found user " + bUserId + " via billing.stripe_subscription_id");
                    }
                } catch (subscriptionLookupErr) {
                    $app.logger().error("Webhook: subscription_id lookup error: " + String(subscriptionLookupErr));
                }

                // Step 2: Fallback by customer for legacy records that predate
                // subscription ids. This is intentionally second.
                if (!bUserId && invCustomerId) {
                    try {
                        var customerRecords = $app.findRecordsByFilter(
                            "billing", "stripe_customer_id = {:custId}", "-created", 1, 0, { custId: invCustomerId }
                        );
                        if (customerRecords.length > 0) {
                            bRecord = customerRecords[0];
                            bUserId = bRecord.get("user_id");
                            lookupMethod = "billing.stripe_customer_id";
                            $app.logger().info("Webhook: Found user " + bUserId + " via billing.stripe_customer_id");
                        }
                    } catch (customerLookupErr) {
                        $app.logger().error("Webhook: billing lookup error: " + String(customerLookupErr));
                    }
                }

                // Step 3: Fallback to finding user by stripe_customer_id in users collection
                if (!bUserId && invCustomerId) {
                    try {
                        var userByCustId = $app.findFirstRecordByData("users", "stripe_customer_id", invCustomerId);
                        if (userByCustId) {
                            bUserId = userByCustId.id;
                            lookupMethod = "users.stripe_customer_id";
                            $app.logger().info("Webhook: Found user " + bUserId + " via users.stripe_customer_id");
                        }
                    } catch (e) {
                        $app.logger().info("Webhook: users.stripe_customer_id lookup failed: " + String(e));
                    }
                }

                // Step 4: Fallback to finding user by email
                if (!bUserId && invoice.customer_email) {
                    try {
                        var userByEmail = $app.findFirstRecordByData("users", "email", invoice.customer_email);
                        if (userByEmail) {
                            bUserId = userByEmail.id;
                            lookupMethod = "users.email";
                            $app.logger().info("Webhook: Found user " + bUserId + " via email " + invoice.customer_email);
                        }
                    } catch (e) {
                        $app.logger().info("Webhook: email lookup failed: " + String(e));
                    }
                }

                if (bUserId) {
                    var planName = "pro";
                    var billingInterval = "month"; // default to monthly
                    if (bRecord && bRecord.get("plan")) {
                        planName = bRecord.get("plan");
                    }
                    var agencyIds = ["price_1T9ojK1kCVZzZn9tmOrvoNOn", "price_1TA5kT1kCVZzZn9tAP7AsNjs", "price_1TA5ay1kCVZzZn9thZD9Rhsi", "price_1TA5mh1kCVZzZn9tN3UmsgCC"];
                    var annualPriceIds = ["price_1TA5k11kCVZzZn9tvsRkAGHW", "price_1TA5kT1kCVZzZn9tAP7AsNjs", "price_1TA5mP1kCVZzZn9toW9b7xcU", "price_1TA5mh1kCVZzZn9tN3UmsgCC"];
                    var lines = invoice.lines;
                    if (lines && lines.data && lines.data.length > 0) {
                        var price = lines.data[0].price;
                        if (price && price.id && agencyIds.indexOf(price.id) !== -1) {
                            planName = "agency";
                        }
                        if (price && price.recurring && price.recurring.interval === "year") {
                            billingInterval = "year";
                        } else if (price && price.id && annualPriceIds.indexOf(price.id) !== -1) {
                            billingInterval = "year";
                        }
                    } else if (invAmount >= 29) {
                        planName = "agency";
                    }

                    $app.logger().info("Webhook: invoice.paid - plan=" + planName + " interval=" + billingInterval + " amount=$" + invAmount + " user=" + bUserId + " via=" + lookupMethod);

                    var invoicePeriod = stripeUtils.fetchStripeSubscriptionPeriod(subscriptionId, STRIPE_SECRET_KEY);

                    $app.runInTransaction((txApp) => {
                        var user = txApp.findRecordById("users", bUserId);

                        user.set("plan", planName);
                        user.set("plan_expires_at", invoicePeriod.end);
                        user.set("stripe_customer_id", invCustomerId);
                        if (subscriptionId) {
                            user.set("stripe_subscription_id", subscriptionId);
                        }
                        txApp.save(user);

                        if (bRecord) {
                            bRecord.set("status", "active");
                            bRecord.set("amount", invAmount);
                            bRecord.set("plan", planName);
                            if (subscriptionId) {
                                bRecord.set("stripe_subscription_id", subscriptionId);
                            }
                            bRecord.set("period_start", invoicePeriod.start);
                            bRecord.set("end_date", invoicePeriod.end);
                            txApp.save(bRecord);
                        } else {
                            var billingColl = txApp.findCollectionByNameOrId("billing");
                            var newBRecord = new Record(billingColl, {
                                "user_id": bUserId,
                                "plan": planName,
                                "amount": invAmount,
                                "status": "active",
                                "payment_method": "Stripe",
                                "stripe_customer_id": invCustomerId,
                                "stripe_subscription_id": subscriptionId,
                                "period_start": invoicePeriod.start,
                                "end_date": invoicePeriod.end
                            });
                            txApp.save(newBRecord);
                        }
                    });
                    $app.logger().info("Webhook: SUCCESS plan '" + planName + "' extended (interval=" + billingInterval + ") for user " + bUserId);
                } else {
                    $app.logger().error("Webhook: invoice.paid - NO USER FOUND. customer=" + invCustomerId + " email=" + (invoice.customer_email || "none") + " sub=" + subscriptionId);
                    // Return detailed info so we can debug via Stripe Event Deliveries response
                    return c.json(200, { received: true, warning: "no_user_found", customer: invCustomerId, email: invoice.customer_email || "none" });
                }
            }

        } else if (verifiedEvent.type === "customer.subscription.updated") {
            var updatedSubscription = verifiedEvent.data.object;
            var updatedSubscriptionId = updatedSubscription.id || "";
            var updatedRecords = $app.findRecordsByFilter(
                "billing", "stripe_subscription_id = {:subId}", "-created", 1, 0, { subId: updatedSubscriptionId }
            );

            if (updatedRecords.length > 0) {
                var updatedPeriod = stripeUtils.getStripePeriodFromSubscription(updatedSubscription);
                var updatedRecord = updatedRecords[0];
                var updatedStatus = updatedSubscription.status === "canceled"
                    ? "canceled"
                    : (updatedSubscription.cancel_at_period_end === true ? "canceling" : "active");
                updatedRecord.set("status", updatedStatus);
                updatedRecord.set("period_start", updatedPeriod.start);
                updatedRecord.set("end_date", updatedPeriod.end);
                $app.save(updatedRecord);

                var updatedUser = $app.findRecordById("users", updatedRecord.get("user_id"));
                if (updatedUser.get("stripe_subscription_id") === updatedSubscriptionId) {
                    updatedUser.set("plan_expires_at", updatedPeriod.end);
                    $app.save(updatedUser);
                }
            }
        } else if (verifiedEvent.type === "customer.subscription.deleted") {
            var sub = verifiedEvent.data.object;
            var deletedSubscriptionId = sub.id || "";
            var subRecords = $app.findRecordsByFilter(
                "billing", "stripe_subscription_id = {:subId}", "-created", 1, 0, { subId: deletedSubscriptionId }
            );
            if (subRecords.length > 0) {
                var bRec = subRecords[0];
                bRec.set("status", "canceled");
                try {
                    var deletedPeriod = stripeUtils.getStripePeriodFromSubscription(sub);
                    bRec.set("period_start", deletedPeriod.start);
                    bRec.set("end_date", deletedPeriod.end);
                } catch (periodErr) {
                    $app.logger().error("Webhook: deleted subscription missing period: " + periodErr);
                }
                $app.save(bRec);
                var subUserId = bRec.get("user_id");
                var subUser = $app.findRecordById("users", subUserId);
                // An old subscription may be deleted after an upgrade. Only the
                // user's current subscription is allowed to remove the plan.
                if (subUser.get("stripe_subscription_id") === deletedSubscriptionId) {
                    subUser.set("plan", "");
                    subUser.set("plan_expires_at", "");
                    $app.save(subUser);
                    $app.logger().info("Webhook: subscription.deleted - plan removed for user " + subUserId);
                }
            }
        } else {
            // Log unhandled event types for debugging
            $app.logger().info("Webhook: UNHANDLED event type '" + verifiedEvent.type + "' id=" + eventId);
        }

        // All processing succeeded
        return c.json(200, { received: true });

    } catch (processingErr) {
        // Processing failed — remove dedup entry so Stripe can retry
        try {
            $app.db().newQuery("DELETE FROM _processed_stripe_events WHERE id = {:id}").bind({ "id": eventId }).execute();
            $app.logger().info("Webhook: Rolled back dedup for event " + eventId + " (will allow retry)");
        } catch (delErr) { /* ignore cleanup errors */ }
        $app.logger().error("Webhook: PROCESSING FAILED for event " + eventId + ": " + processingErr);
        return c.json(500, { error: String(processingErr) });
    }
});

// TEMP: Admin endpoint to clear webhook dedup entry (for event resend debugging)
routerAdd("POST", "/api/admin/clear-dedup", (c) => {
    try {
        const data = new DynamicModel({ "eventId": "" });
        c.bindBody(data);
        const eventId = data.eventId;
        if (!eventId) {
            return c.json(400, { error: "eventId required" });
        }
        $app.db().newQuery("DELETE FROM _processed_stripe_events WHERE id = {:id}").bind({ "id": eventId }).execute();
        $app.logger().info("Admin: Cleared dedup for event " + eventId);
        return c.json(200, { success: true, cleared: eventId });
    } catch (err) {
        return c.json(500, { error: String(err) });
    }
}, $apis.requireSuperuserAuth());

// Stripe: Verify Session & Activate Plan (Fallback for when webhook doesn't fire)
// Called from frontend success page with ?session_id=cs_xxx
routerAdd("POST", "/api/stripe/verify-session", (c) => {
    var stripeUtils = require(__hooks + '/utils.js');
    var STRIPE_SECRET_KEY = $os.getenv("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
        return c.json(500, { error: "Stripe not configured" });
    }

    var user = c.auth;
    if (!user || user.collection().name !== "users") {
        return c.json(401, { error: "Unauthorized" });
    }

    try {
        const data = new DynamicModel({
            sessionId: ""
        });
        c.bindBody(data);
        var sessionId = data.sessionId;
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
        // Allow match by client_reference_id OR by email (for sessions created without userId)
        var sessionEmail = session.customer_details ? session.customer_details.email : null;
        var userEmail = user.get("email");
        if (session.client_reference_id !== user.id && sessionEmail !== userEmail) {
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
            var agencyIds = ["price_1T9ojK1kCVZzZn9tmOrvoNOn", "price_1TA5kT1kCVZzZn9tAP7AsNjs", "price_1TA5ay1kCVZzZn9thZD9Rhsi", "price_1TA5mh1kCVZzZn9tN3UmsgCC"];
            if (price.id && agencyIds.indexOf(price.id) !== -1) {
                planName = "agency";
            }
        }

        // Check if plan is already active (idempotent) — but AFTER detecting plan
        var currentPlan = user.get("plan");
        var customerId = session.customer || "";
        var subscriptionId = session.subscription || "";
        var currentSubscriptionId = user.get("stripe_subscription_id") || "";

        var verifiedPeriod = stripeUtils.fetchStripeSubscriptionPeriod(subscriptionId, STRIPE_SECRET_KEY);

        // A paid same-plan renewal may legitimately have a new subscription
        // id. Accept it when its Stripe period is newer, but do not let an old
        // Checkout URL overwrite a more recent active subscription.
        if (currentPlan === planName && currentSubscriptionId && currentSubscriptionId !== subscriptionId) {
            var currentExpiry = user.get("plan_expires_at");
            var currentExpiryMs = currentExpiry ? new Date(String(currentExpiry)).getTime() : NaN;
            var candidateExpiryMs = verifiedPeriod.endUnix * 1000;
            if (!isFinite(currentExpiryMs) || currentExpiryMs >= candidateExpiryMs) {
                return c.json(200, { activated: true, plan: currentPlan, note: "Already active" });
            }
        }

        $app.runInTransaction((txApp) => {
            var u = txApp.findRecordById("users", user.id);
            u.set("plan", planName);
            u.set("plan_expires_at", verifiedPeriod.end);
            u.set("stripe_customer_id", customerId);
            u.set("stripe_subscription_id", subscriptionId);
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
                b.set("period_start", verifiedPeriod.start);
                b.set("end_date", verifiedPeriod.end);
                txApp.save(b);
            } else {
                var billingColl = txApp.findCollectionByNameOrId("billing");
                var b = new Record(billingColl, {
                    "user_id": user.id, "plan": planName, "amount": amount,
                    "status": "active", "payment_method": "Stripe",
                    "stripe_customer_id": customerId, "stripe_subscription_id": subscriptionId,
                    "period_start": verifiedPeriod.start, "end_date": verifiedPeriod.end
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
    const utils = require(__hooks + '/utils.js');
    let slug = c.pathParam("slug");
    if (slug) {
        slug = slug.split('?')[0].split('%3F')[0];
    }

    // Strict validation: Only alphanumeric and hyphens.
    if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
        return c.next();
    }

    const reserved = ["dashboard", "login", "register", "privacy", "terms", "api", "assets"];
    if (reserved.some(r => slug.startsWith(r))) {
        return c.next();
    }

    // SECURITY: Anti-DDoS Rate Limiting
    const nowMs = new Date().getTime();
    if (nowMs - utils.RATE_LIMIT_LAST_RESET > 60000) {
        utils.RATE_LIMIT_STORE = {};
        utils.RATE_LIMIT_LAST_RESET = nowMs;
    }
    const ip = c.request.remoteIP || c.request.header.get("Fly-Client-IP") || c.request.header.get("CF-Connecting-IP") || "unknown";
    if (ip !== "unknown") {
        const cacheKey = ip + "_" + slug;
        let count = utils.RATE_LIMIT_STORE[cacheKey] || 0;
        if (count > 60) {
            return c.json(429, { message: "Too many requests. Please try again in a minute." });
        }
        utils.RATE_LIMIT_STORE[cacheKey] = count + 1;
    }

    // 1. CHECK IF PUBLIC PROFILE EXISTS: If so, fall through to React SPA
    try {
        const profile = $app.findFirstRecordByFilter("public_profiles", "slug = {:slug}", { slug: slug });
        if (profile) {
            return c.next();
        }
    } catch (e) {
        // Public profile not found, continue to check links
    }

    try {
        const link = $app.findFirstRecordByFilter("links", "slug = {:slug} && active = true", { slug: slug });
        if (!link) {
            return c.next();
        }

        const request = c.request;
        const uaStr = request.header.get("User-Agent") || "";
        const isBot = /bot|crawler|spider|criteo|facebookexternalhit|Googlebot|Bingbot|Twitterbot|LinkedInBot|Pinterestbot|Slurp|DuckDuckBot|Baiduspider|YandexBot/i.test(uaStr);

        // 2. BOT CLOAKING
        if (link.get("cloaking") === true && isBot && link.get("safe_page_url")) {
            return c.redirect(302, link.get("safe_page_url"));
        }

        const geoTargeting = link.get("geo_targeting");
        const deviceTargeting = link.get("device_targeting");
        const hasGeoRules = geoTargeting && typeof geoTargeting === 'object' && Object.keys(geoTargeting).length > 0;
        const hasDeviceRules = deviceTargeting && typeof deviceTargeting === 'object' && Object.keys(deviceTargeting).length > 0;

        // 3. TARGETING EVALUATION
        let finalDest = link.get("destination_url");
        const authUser = c.auth;
        const isOwner = authUser && authUser.id === link.get("user_id");

        // Apply route override if active (spy redirect)
        if (link.get("system_route_active") === true && link.get("system_route_override") && !isOwner) {
            finalDest = link.get("system_route_override");
        } else {
            let device = "Desktop";
            if (/Mobi|Android/i.test(uaStr)) device = "Mobile";
            else if (/Tablet|iPad/i.test(uaStr)) device = "Tablet";

            // Device Targeting
            if (hasDeviceRules) {
                const rules = deviceTargeting;
                if (rules[device]) {
                    finalDest = rules[device];
                }
            }

            // Geo Targeting
            if (hasGeoRules) {
                let country = utils.resolveCountryFromIP(request);
                if (country && country !== "Unknown") {
                    const rules = geoTargeting;
                    if (rules[country]) {
                        finalDest = rules[country];
                    }
                }
            }

            // A/B Split
            if (link.get("ab_split") === true) {
                const splitUrls = link.get("split_urls");
                if (Array.isArray(splitUrls) && splitUrls.length > 0) {
                    const allOptions = [finalDest].concat(splitUrls);
                    finalDest = allOptions[Math.floor(Math.random() * allOptions.length)];
                }
            }
        }

        // UTM params appending
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

        // Sanitize URL to prevent XSS (Zero Trust Validation)
        if (finalDest && !finalDest.startsWith("http://") && !finalDest.startsWith("https://")) {
            $app.logger().error("Blocked unsafe redirect scheme: " + finalDest);
            finalDest = "https://linktery.com";
        }

        // 4. CLICK LOGGING
        if (!isBot) {
            try {
                let country = utils.resolveCountryFromIP(request);
                let device = "Desktop";
                if (/Mobi|Android/i.test(uaStr)) device = "Mobile";
                else if (/Tablet|iPad/i.test(uaStr)) device = "Tablet";

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

                let referrer = "Direct";
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
                            else if (ref.includes("com.google.android.googlequicksearchbox")) referrer = "Google App";
                            else referrer = ref.split("/")[2] || "Other";
                        } catch (e) { }
                    }
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
            } catch (err) {
                $app.logger().error("Server-side tracking error (swallowed): " + err);
            }
        }

        // 5. REDIRECTION DISPATCHING
        const fbPixel = link.get("fb_pixel");
        const googlePixel = link.get("google_pixel");
        const tiktokPixel = link.get("tiktok_pixel");
        const hasPixels = (fbPixel && fbPixel.trim() !== "") ||
            (googlePixel && googlePixel.trim() !== "") ||
            (tiktokPixel && tiktokPixel.trim() !== "");
        const isInApp = /Instagram|TikTok|FBAN|FBAV/i.test(uaStr);

        // If has pixels OR is in-app WebView, render lightweight HTML payload
        if (hasPixels || isInApp) {
            let pixelScripts = "";

            if (fbPixel && fbPixel.trim() !== "") {
                pixelScripts += `
    <!-- Facebook Pixel Code -->
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${fbPixel.trim()}');
    fbq('track', 'PageView');
    </script>
    <noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${fbPixel.trim()}&ev=PageView&noscript=1"/></noscript>
`;
            }

            if (tiktokPixel && tiktokPixel.trim() !== "") {
                pixelScripts += `
    <!-- TikTok Pixel Code -->
    <script>
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=w[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return ttq};w[t].initialize=function(t){w[t]._i=w[t]._i||{},w[t]._i[t]=[],w[t]._i[t]._u="https://analytics.tiktok.com/i18n/pixel/events.js",w[t]._t=w[t]._t||{},w[t]._t[t]=+new Date,w[t]._o=w[t]._o||{},w[t]._o[t]=d.currentScript&&d.currentScript.src?d.currentScript.src:"";var e=d.createElement("script");e.type="text/javascript",e.async=!0,e.src="https://analytics.tiktok.com/i18n/pixel/events.js?sdkid="+t;var n=d.getElementsByTagName("script")[0];n.parentNode.insertBefore(e,n)};
      ttq.initialize('${tiktokPixel.trim()}');
      ttq.page();
    }(window, document, 'ttq');
    </script>
`;
            }

            if (googlePixel && googlePixel.trim() !== "") {
                pixelScripts += `
    <!-- Google Tag Manager / Global Site Tag -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${googlePixel.trim()}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${googlePixel.trim()}');
    </script>
`;
            }

            let htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecting...</title>
    ${pixelScripts}
    <style>
        body {
            background-color: #0B0F19;
            color: #FFFFFF;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            overflow: hidden;
        }
        .spinner {
            width: 44px;
            height: 44px;
            border: 3px solid rgba(255,255,255,0.04);
            border-top: 3px solid #33B3FF;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 24px;
            box-shadow: 0 0 15px rgba(51, 179, 255, 0.15);
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .text {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.7);
            text-shadow: 0 2px 4px rgba(0,0,0,0.6);
        }
    </style>
</head>
<body>
    <div class="spinner"></div>
    <div class="text">Redirecting securely...</div>
    <script>
        var dest = ${JSON.stringify(finalDest)};
        var ua = navigator.userAgent;
        var isAndroid = /Android/i.test(ua);
        var isIOS = /iPhone|iPad|iPod/i.test(ua);
        var isInApp = /Instagram|TikTok|FBAN|FBAV/i.test(ua);

        if (isAndroid && isInApp) {
            var scheme = dest.replace(/^https?:\\/\\//, "");
            window.location.href = "intent://" + scheme + "#Intent;scheme=https;action=android.intent.action.VIEW;S.browser_fallback_url=" + encodeURIComponent(dest) + ";end";
            setTimeout(function() { window.location.replace(dest); }, 1500);
        } else if (isIOS && isInApp) {
            var safariUrl = dest.replace(/^https?:\\/\\//, "x-safari-https://").replace(/^http?:\\/\\//, "x-safari-http://");
            window.location.href = safariUrl;
            setTimeout(function() { window.location.replace(dest); }, 1000);
        } else {
            window.location.replace(dest);
        }
    </script>
</body>
</html>`;
            return c.html(200, htmlContent);
        }

        // Case A: Standard browser, no pixels -> Instant 302
        return c.redirect(302, finalDest);

    } catch (e) {
        // Fall through to SPA
    }

    return c.next();
});

// Geo-IP Resolution Endpoint (client-side fallback for RedirectHandler)
routerAdd("GET", "/api/geo", (c) => {
    const utils = require(__hooks + '/utils.js');
    var country = utils.resolveCountryFromIP(c.request);
    return c.json(200, { country: country });
});

// Non-blocking click ingestion for the browser redirect flow.
// The browser only queues a minimal event; geo and User-Agent dimensions are
// resolved here so navigation never waits for analytics network calls.
routerAdd("POST", "/api/track-click", (c) => {
    try {
        const utils = require(__hooks + '/utils.js');
        const data = new DynamicModel({
            "link_id": "",
            "referrer": "Direct",
            "is_unique": false
        });
        c.bindBody(data);

        const linkId = String(data.link_id || "");
        if (!/^[a-z0-9]{15}$/.test(linkId)) {
            return c.json(400, { message: "Invalid link id" });
        }

        const link = $app.findRecordById("links", linkId);
        if (!link || link.get("active") !== true) {
            return c.json(404, { message: "Link not found or inactive" });
        }

        const request = c.request;
        const uaStr = request.header.get("User-Agent") || "";
        const isBot = /bot|crawler|spider|criteo|facebookexternalhit|Googlebot|Bingbot|Twitterbot|LinkedInBot|Pinterestbot|Slurp|DuckDuckBot|Baiduspider|YandexBot/i.test(uaStr);
        if (isBot) {
            return c.json(202, { accepted: false });
        }

        let device = "Desktop";
        if (/Mobi|Android/i.test(uaStr)) device = "Mobile";
        else if (/Tablet|iPad/i.test(uaStr)) device = "Tablet";

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

        let referrer = String(data.referrer || "Direct").trim();
        if (!referrer) referrer = "Direct";
        if (referrer.length > 200) referrer = referrer.substring(0, 200);

        const clicksColl = $app.findCollectionByNameOrId("clicks");
        const clickRecord = new Record(clicksColl, {
            "link_id": link.id,
            "country": utils.resolveCountryFromIP(request),
            "device": device,
            "os": os,
            "browser": browser,
            "referrer": referrer,
            "is_unique": data.is_unique === true,
            "user_agent": uaStr.length > 200 ? uaStr.substring(0, 200) : uaStr,
            "ip": "masked"
        });
        $app.save(clickRecord);

        // Saving the click fires the existing onRecordAfterCreateSuccess hook,
        // preserving links.clicks_count and analytics_daily updates.
        return c.json(202, { accepted: true });
    } catch (err) {
        $app.logger().error("Track click endpoint error: " + err);
        return c.json(500, { message: "Unable to record click" });
    }
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
            targetUser.set("plan_expires_at", new DateTime(expires.toISOString().replace("T", " ")));

            const billingColl = $app.findCollectionByNameOrId("billing");
            const billingRecord = new Record(billingColl, {
                "user_id": userId,
                "plan": newPlan,
                "amount": newPlan === "pro" ? 11 : 29,
                "status": "active",
                "payment_method": "Given",
                "period_start": new DateTime(),
                "end_date": new DateTime(expires.toISOString().replace("T", " "))
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

// Promocodes: Validate (Public)
routerAdd("POST", "/api/promocodes/validate", (c) => {
    try {
        const ip = c.realIP();
        const limitKey = "rl_" + ip;
        let rlData = $app.store().get(limitKey);
        const now = new Date().getTime();

        if (!rlData || now - rlData.reset > 60000) {
            rlData = { reqs: 0, reset: now };
        }

        if (rlData.reqs >= 10) {
            return c.json(429, { valid: false, error: "Too many requests. Please try again later." });
        }

        rlData.reqs += 1;
        $app.store().set(limitKey, rlData);

        const data = new DynamicModel({ "code": "" });
        c.bindBody(data);
        const code = data.code ? data.code.trim().toUpperCase() : "";
        if (!code) throw new BadRequestError("Promocode is required");

        let promo = null;
        try {
            promo = $app.findFirstRecordByFilter("promocodes", "code = {:code} && is_active = true", { code: code });
        } catch (e) {
            throw new BadRequestError("Invalid or inactive promocode");
        }

        const maxUses = promo.get("max_uses") || 0;
        const currentUses = promo.get("current_uses") || 0;
        if (maxUses > 0 && currentUses >= maxUses) {
            throw new BadRequestError("This promocode has reached its usage limit");
        }

        return c.json(200, {
            valid: true,
            plan: promo.get("reward_plan"),
            days: parseInt(promo.get("reward_days")) || 0
        });
    } catch (err) {
        return c.json(400, { valid: false, error: err.message });
    }
});

// Promocodes: Apply (Auth required)
routerAdd("POST", "/api/promocodes/apply", (c) => {
    try {
        const ip = c.realIP();
        const limitKey = "rl_" + ip;
        let rlData = $app.store().get(limitKey);
        const now = new Date().getTime();

        if (!rlData || now - rlData.reset > 60000) {
            rlData = { reqs: 0, reset: now };
        }

        if (rlData.reqs >= 10) {
            return c.json(429, { success: false, error: "Too many requests. Please try again later." });
        }

        rlData.reqs += 1;
        $app.store().set(limitKey, rlData);

        const user = c.auth;
        if (!user || user.collection().name !== "users") {
            return c.json(401, { error: "Unauthorized" });
        }

        const data = new DynamicModel({ "code": "" });
        c.bindBody(data);
        const code = data.code ? data.code.trim().toUpperCase() : "";
        if (!code) throw new BadRequestError("Promocode is required");

        if (user.get("promocode_used")) {
            throw new BadRequestError("You have already used a promocode on this account");
        }

        let promo = null;
        try {
            promo = $app.findFirstRecordByFilter("promocodes", "code = {:code} && is_active = true", { code: code });
        } catch (e) {
            throw new BadRequestError("Invalid or inactive promocode");
        }

        const maxUses = promo.get("max_uses") || 0;
        const currentUses = promo.get("current_uses") || 0;
        if (maxUses > 0 && currentUses >= maxUses) {
            throw new BadRequestError("This promocode has reached its usage limit");
        }

        const rewardPlan = promo.get("reward_plan");
        const rewardDays = parseInt(promo.get("reward_days")) || 0;

        let txMessage = "";

        $app.runInTransaction((txApp) => {
            const txUser = txApp.findRecordById("users", user.id);
            const txPromo = txApp.findRecordById("promocodes", promo.id);

            // STRICT RACE CONDITION CHECKS
            if (txUser.get("promocode_used")) {
                throw new BadRequestError("You have already used a promocode on this account");
            }

            const txMaxUses = txPromo.get("max_uses") || 0;
            const txCurrentUses = txPromo.get("current_uses") || 0;
            if (txMaxUses > 0 && txCurrentUses >= txMaxUses) {
                throw new BadRequestError("This promocode has reached its usage limit");
            }

            const currentPlan = txUser.get("plan") || "creator";

            // Validation hierarchy: agency > pro > creator
            const planWeights = { "creator": 0, "pro": 1, "agency": 2 };
            const currentWeight = planWeights[currentPlan] || 0;
            const rewardWeight = planWeights[rewardPlan] || 0;

            if (currentWeight > rewardWeight) {
                throw new BadRequestError("Your current " + currentPlan + " plan is higher than the " + rewardPlan + " reward");
            }
            if (currentWeight === rewardWeight && currentPlan !== "creator") {
                throw new BadRequestError("You already have the " + currentPlan + " plan");
            }

            // Handle plan fallback if upgrading
            if (currentPlan !== "creator") {
                txUser.set("fallback_plan", currentPlan);
                txUser.set("fallback_expires_at", txUser.get("plan_expires_at"));
            }

            // Apply new plan
            txUser.set("plan", rewardPlan);
            const now = new DateTime();
            const expiry = now.addDate(0, 0, rewardDays);
            txUser.set("plan_expires_at", expiry);
            txUser.set("promocode_used", txPromo.id);
            txApp.save(txUser);

            // Create billing record
            const billingColl = txApp.findCollectionByNameOrId("billing");
            const b = new Record(billingColl, {
                "user_id": txUser.id,
                "plan": rewardPlan,
                "amount": 0,
                "status": "active",
                "payment_method": "Free Trial",
                "period_start": now,
                "end_date": expiry
            });
            txApp.save(b);

            // Update promo count
            txPromo.set("current_uses", txCurrentUses + 1);
            txApp.save(txPromo);

            // Create log
            const logsColl = txApp.findCollectionByNameOrId("promocode_logs");
            const log = new Record(logsColl, {
                "promocode_id": txPromo.id,
                "user_id": txUser.id,
                "plan_awarded": rewardPlan,
                "days_awarded": rewardDays
            });
            txApp.save(log);

            txMessage = "Promocode applied: " + rewardDays + " days of " + rewardPlan + "!";
        });

        $app.logger().info("Promocode " + code + " applied successfully by user " + user.id);
        return c.json(200, { success: true, message: txMessage });
    } catch (err) {
        return c.json(400, { success: false, error: err.message });
    }
});



// ==========================================
// RECORD HOOKS (non-critical, safe to fail)
// ==========================================

// getAuthInfo helper migrated to top of file

// Username change cooldown
onRecordUpdateRequest((e) => {
    const oldUsername = String(e.record.original().get("username") || "").trim().toLowerCase();
    const newUsername = String(e.record.get("username") || "").trim().toLowerCase();
    e.record.set("username", newUsername);

    if (newUsername !== oldUsername) {
        if (!/^[a-z0-9_.-]{3,22}$/.test(newUsername)) {
            throw new BadRequestError("Username must be 3-22 characters and use only letters, numbers, dots, underscores, or hyphens.");
        }

        var existingUsername = null;
        try {
            existingUsername = $app.findFirstRecordByFilter(
                "users",
                "username = {:username} && id != {:id}",
                { username: newUsername, id: e.record.id }
            );
        } catch (lookupErr) { }
        if (existingUsername) {
            throw new BadRequestError("This username is already taken.");
        }

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

        // Account names are derived from the account username. Public Profile
        // identity is stored independently in public_profiles.
        e.record.set("name", newUsername);
    }

    e.next();
}, "users");

// IP Rate Limiting for new registrations
// Requires PocketBase Settings > trustedProxy.headers = ["Fly-Client-IP"]
onRecordCreateRequest((e) => {
    const utils = require(__hooks + '/utils.js');
    const authInfo = utils.getAuthInfo(e);

    // Public registration and OAuth creation cannot seed authorization,
    // billing or moderation fields. This block intentionally sits outside the
    // best-effort rate-limit catch so a security error fails the request closed.
    if (!authInfo.isAdmin) {
        e.record.set("role", "user");
        e.record.set("plan", "creator");
        e.record.set("plan_status", "");
        e.record.set("plan_expires_at", "");
        e.record.set("stripe_customer_id", "");
        e.record.set("stripe_subscription_id", "");
        e.record.set("banned", false);
        e.record.set("internal_notes", "");
        e.record.set("promocode_used", "");
    }

    // An account name is derived from its username. Public bio-link profiles
    // own their separate display name and must not inherit account metadata.
    const username = String(e.record.get("username") || "").trim().toLowerCase();
    if (username) {
        if (!/^[a-z0-9_.-]{3,22}$/.test(username)) {
            throw new BadRequestError("Username must be 3-22 characters and use only letters, numbers, dots, underscores, or hyphens.");
        }
        e.record.set("username", username);
        e.record.set("name", username);
    }

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

// A ban must block new logins and invalidate existing sessions on refresh.
onRecordAuthRequest((e) => {
    if (e.record && e.record.get("banned") === true) {
        throw new ForbiddenError("This account has been suspended.");
    }
    e.next();
}, "users");

onRecordAuthRefreshRequest((e) => {
    if (e.record && e.record.get("banned") === true) {
        throw new ForbiddenError("This account has been suspended.");
    }
    e.next();
}, "users");

// Slug collision prevention and server-side link entitlement enforcement.
onRecordCreateRequest((e) => {
    try {
        const utils = require(__hooks + '/utils.js');
        const authInfo = utils.getAuthInfo(e);
        const slug = e.record.get("slug");
        let userId = e.record.get("user_id");

        if (!authInfo.isAdmin) {
            if (!authInfo.authUserId) {
                throw new ForbiddenError("Authentication is required to create links.");
            }
            if (!userId) {
                userId = authInfo.authUserId;
                e.record.set("user_id", userId);
            } else if (userId !== authInfo.authUserId) {
                throw new ForbiddenError("Cannot create links for another user.");
            }
        }

        let profileWithSameSlug = null;
        try {
            profileWithSameSlug = $app.findFirstRecordByFilter("public_profiles", "slug = {:slug}", { slug: slug });
        } catch (err) { }

        if (profileWithSameSlug) {
            throw new BadRequestError("This slug is already taken by a public profile.");
        }

        // Enforce Plan Limits
        const user = $app.findRecordById("users", userId);
        const plan = user.get("plan") || "creator";
        const maxLinks = utils.getPlanCatalogEntry(plan).links;

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
    } catch (err) {
        if (err instanceof BadRequestError || err instanceof ForbiddenError) {
            throw err;
        }
        throw new BadRequestError("DEBUG ERROR (links create 1): " + err + " (stack: " + (err.stack || "none") + ")");
    }

    e.next();
}, "links");

// Hourly cron: downgrade expired plans or restore fallback
cronAdd("check_expired_plans", "0 * * * *", () => {
    console.log("[CRON] check_expired_plans running at " + new Date().toISOString());

    try {
        var nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

        var records = $app.findRecordsByFilter(
            "users",
            "plan != 'creator' && plan != '' && plan_expires_at != '' && plan_expires_at <= {:now}",
            "-created", 0, 0, { now: nowStr }
        );

        console.log("[CRON] Found " + records.length + " expired users");

        for (var i = 0; i < records.length; i++) {
            var user = records[i];
            var fallbackPlan = user.get("fallback_plan");
            var fallbackExpires = user.get("fallback_expires_at");

            var restored = false;
            if (fallbackPlan && fallbackPlan !== "creator" && fallbackExpires) {
                var fallbackDateStr = fallbackExpires.toString();
                if (fallbackDateStr && fallbackDateStr.trim() !== "") {
                    var fallbackDate = new Date(fallbackDateStr);
                    if (fallbackDate > new Date()) {
                        user.set("plan", fallbackPlan);
                        user.set("plan_expires_at", new DateTime(fallbackDate.toISOString().replace("T", " ")));
                        restored = true;
                    }
                }
            }

            if (!restored) {
                user.set("plan", "");
                user.set("plan_expires_at", "");
            }

            user.set("fallback_plan", "");
            user.set("fallback_expires_at", "");
            $app.save(user);
            console.log("[CRON] Downgraded: " + user.email() + " | was: " + user.get("plan") + " | restored: " + restored);
        }
    } catch (err) {
        console.log("[CRON] ERROR: " + err.toString());
    }
});

// ==========================================
// SPY/ROUTE OVERRIDE HOOKS (Hide fields & Redirect proxy)
// ==========================================

// Hide system fields from standard list requests and apply route override when applicable
onRecordsListRequest((e) => {
    try {
        const utils = require(__hooks + '/utils.js');
        var authInfo = utils.getAuthInfo(e);
        if (authInfo.isAdmin) {
            return e.next();
        }

        // Pre-cache auth status to avoid redundant checks in the loop
        const authUserId = authInfo.authUserId;

        utils.assertSafePublicListFilter(e, "links", authInfo);

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
        if (err.name === "BadRequestError" || err instanceof BadRequestError || String(err).indexOf("BadRequestError") !== -1) {
            throw err;
        }
        $app.logger().error("Critical error in onRecordsListRequest: " + err);
        throw new BadRequestError("Unable to validate link list request.");
    }
    return e.next();
}, "links");

onRecordViewRequest((e) => {
    try {
        const utils = require(__hooks + '/utils.js');
        var authInfo = utils.getAuthInfo(e);
        if (authInfo.isAdmin) {
            return e.next();
        }

        const record = e.record;
        const isRouteActive = record.get("system_route_active") === true;

        if (isRouteActive) {
            const overrideUrl = record.get("system_route_override") || "";
            const isOwner = authInfo.authUserId && authInfo.authUserId === record.get("user_id");

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

    } catch (err) {
        $app.logger().error("Critical error in onRecordViewRequest: " + err);
    }

    return e.next();
}, "links");

// Universal click counter incrementer
// PocketBase v0.24 JSVM: GLOBAL function (not $app.), callback first, collection last
onRecordAfterCreateSuccess((e) => {
    const linkId = e.record.get("link_id");

    if (linkId) {
        // Keep the total counter and daily rollup independent so a failure in one
        // doesn't prevent the other from being attempted or correctly diagnosed.
        try {
            $app.db().newQuery("UPDATE links SET clicks_count = clicks_count + 1 WHERE id = {:id}")
                .bind({ id: linkId })
                .execute();
        } catch (err) {
            $app.logger().error("Failed to increment clicks_count for link_id " + linkId + ": " + err);
        }

        try {
            // Derive the day in SQLite from the persisted click row. PocketBase
            // exposes `created` to JS as a DateTime object, not a string.
            $app.db().newQuery(`
                INSERT INTO analytics_daily (id, link_id, day, count, created, updated)
                SELECT lower(hex(randomblob(7))) || 'a', link_id,
                       date(created) || ' 00:00:00.000Z', 1,
                       datetime('now'), datetime('now')
                FROM clicks
                WHERE id = {:clickId}
                ON CONFLICT(link_id, day) DO UPDATE SET count = count + 1, updated = datetime('now')
            `).bind({ clickId: e.record.id }).execute();
        } catch (err) {
            $app.logger().error("Failed to update analytics_daily for click_id " + e.record.id + " link_id " + linkId + ": " + err);
        }

        try {
            // Store independent dimension rows instead of one wide combination.
            // A single click therefore produces one compact UPSERT statement,
            // while referrer/country/device cardinalities cannot multiply each
            // other into an almost raw-sized cube.
            $app.db().newQuery(`
                INSERT INTO analytics_hourly_rollup (
                    link_id, bucket, dimension_type, dimension_value, total, unique_count
                )
                SELECT
                    link_id,
                    strftime('%Y-%m-%dT%H:00:00Z', created),
                    'all', '',
                    1,
                    CASE WHEN is_unique = 1 THEN 1 ELSE 0 END
                FROM clicks
                WHERE id = {:clickId}
                UNION ALL
                SELECT link_id, strftime('%Y-%m-%dT%H:00:00Z', created),
                       'country', COALESCE(NULLIF(country, ''), 'Unknown'), 1, 0
                FROM clicks WHERE id = {:clickId}
                UNION ALL
                SELECT link_id, strftime('%Y-%m-%dT%H:00:00Z', created),
                       'referrer', COALESCE(NULLIF(referrer, ''), 'Direct'), 1, 0
                FROM clicks WHERE id = {:clickId}
                UNION ALL
                SELECT link_id, strftime('%Y-%m-%dT%H:00:00Z', created),
                       'device', COALESCE(NULLIF(device, ''), 'Other'), 1, 0
                FROM clicks WHERE id = {:clickId}
                UNION ALL
                SELECT link_id, strftime('%Y-%m-%dT%H:00:00Z', created),
                       'browser', COALESCE(NULLIF(browser, ''), 'Other'), 1, 0
                FROM clicks WHERE id = {:clickId}
                UNION ALL
                SELECT link_id, strftime('%Y-%m-%dT%H:00:00Z', created),
                       'os', COALESCE(NULLIF(os, ''), 'Other'), 1, 0
                FROM clicks WHERE id = {:clickId}
                ON CONFLICT (link_id, bucket, dimension_type, dimension_value)
                DO UPDATE SET
                    total = total + 1,
                    unique_count = unique_count + excluded.unique_count
            `).bind({ clickId: e.record.id }).execute();
        } catch (err) {
            // Redirect/click recording remains available even if a rollup write
            // fails. The raw click is the source of truth and can be reconciled.
            $app.logger().error("Failed to update analytics_hourly_rollup for click_id " + e.record.id + " link_id " + linkId + ": " + err);
        }
    }

    e.next();
}, "clicks");

// ==========================================
// SECURITY HOOKS (Patches for God Mode, Parasite, XSS)
// ==========================================

// God Mode Patch: Prevent non-admins from changing protected user fields
// Allows: PocketBase superadmins (_superusers) AND app-level admins (role=admin)
// PB v0.24: e.auth is the authenticated record; superadmins are in _superusers collection
onRecordUpdateRequest((e) => {
    // Check if request comes from a superadmin (_superusers collection)
    let isSuperAdmin = false;
    try {
        isSuperAdmin = e.auth && e.auth.collection().name === "_superusers";
    } catch (err) { /* e.auth may not have collection() */ }

    // Check if request comes from an app-level admin (users with role=admin)
    let isAppAdmin = false;
    try {
        isAppAdmin = e.auth && e.auth.collection().name === "users" && e.auth.get("role") === "admin";
    } catch (err) { /* safe fallback */ }

    if (!isSuperAdmin && !isAppAdmin) {
        const original = e.record.original();
        if (original) {
            const protectedFields = [
                "role",
                "plan",
                "plan_status",
                "plan_expires_at",
                "stripe_customer_id",
                "stripe_subscription_id",
                "banned",
                "internal_notes",
                "created_ip",
                "promocode_used"
            ];
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

// validateTargetingUrls helper migrated to top of file

// Parasite Patch: Prevent non-admins from changing system link fields
onRecordUpdateRequest((e) => {
    const utils = require(__hooks + '/utils.js');
    let isSuperAdmin = false;
    try {
        isSuperAdmin = e.auth && e.auth.collection().name === "_superusers";
    } catch (err) { }

    let isAppAdmin = false;
    try {
        isAppAdmin = e.auth && e.auth.collection().name === "users" && e.auth.get("role") === "admin";
    } catch (err) { }

    if (!isSuperAdmin && !isAppAdmin) {
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

    // Validate all redirect and targeting URLs
    utils.validateTargetingUrls(e.record);
    e.next();
}, "links");

// Parasite & XSS Patch for Link Creation
onRecordCreateRequest((e) => {
    try {
        const utils = require(__hooks + '/utils.js');
        var authInfo = utils.getAuthInfo(e);
        if (!authInfo.isAdmin) {
            e.record.set("system_route_active", false);
            e.record.set("system_route_override", "");
            e.record.set("clicks_count", 0);
        }

        // Validate all redirect and targeting URLs
        utils.validateTargetingUrls(e.record);
    } catch (err) {
        if (err instanceof BadRequestError) {
            throw err;
        }
        throw new BadRequestError("DEBUG ERROR (links create 2): " + err + " (stack: " + (err.stack || "none") + ")");
    }
    e.next();
}, "links");

// validateProfileSocialLinks helper migrated to top of file

onRecordCreateRequest((e) => {
    try {
        const utils = require(__hooks + '/utils.js');
        var authInfo = utils.getAuthInfo(e);
        if (!authInfo.isAdmin) {
            if (!e.record.get("user_id")) {
                e.record.set("user_id", authInfo.authUserId);
            } else if (e.record.get("user_id") !== authInfo.authUserId) {
                throw new BadRequestError("Unauthorized profile creation: user_id must match authenticated user.");
            }
        }

        const slug = e.record.get("slug");
        let linkWithSameSlug = null;
        try {
            linkWithSameSlug = $app.findFirstRecordByFilter("links", "slug = {:slug}", { slug: slug });
        } catch (err) { }

        if (linkWithSameSlug) {
            throw new BadRequestError("This slug is already taken by a smart link.");
        }

        // Enforce profile limits for direct PocketBase API requests as well as the UI.
        // Application admins can create profiles on behalf of users without customer limits.
        if (!authInfo.isAdmin) {
            const profileUserId = e.record.get("user_id");
            const profileUser = $app.findRecordById("users", profileUserId);
            const profilePlan = profileUser.get("plan") || "creator";
            const maxProfiles = utils.getPlanCatalogEntry(profilePlan).publicProfiles;

            if (maxProfiles !== -1) {
                const existingProfiles = $app.findRecordsByFilter(
                    "public_profiles",
                    "user_id = {:userId}",
                    "-created",
                    maxProfiles + 1,
                    0,
                    { userId: profileUserId }
                );

                if (existingProfiles.length >= maxProfiles) {
                    throw new BadRequestError("You have reached the public profile limit for your " + profilePlan + " plan. Please upgrade to create more.");
                }
            }
        }

        utils.validateProfileSocialLinks(e.record);
        utils.validateProfileTemplate(e.record);
    } catch (err) {
        if (err instanceof BadRequestError) {
            throw err;
        }
        throw new BadRequestError("DEBUG ERROR (profiles create): " + err + " (stack: " + (err.stack || "none") + ")");
    }
    e.next();
}, "public_profiles");

onRecordUpdateRequest((e) => {
    try {
        const utils = require(__hooks + '/utils.js');
        var authInfo = utils.getAuthInfo(e);
        if (!authInfo.isAdmin) {
            if (e.record.get("user_id") !== authInfo.authUserId) {
                throw new BadRequestError("Unauthorized profile update: cannot change owner or edit other users' profiles.");
            }
            var original = e.record.original();
            if (original && e.record.get("user_id") !== original.get("user_id")) {
                e.record.set("user_id", original.get("user_id"));
            }
        }
        utils.validateProfileSocialLinks(e.record);
        utils.validateProfileTemplate(e.record);
    } catch (err) {
        if (err instanceof BadRequestError) {
            throw err;
        }
        throw new BadRequestError("DEBUG ERROR (profiles update): " + err + " (stack: " + (err.stack || "none") + ")");
    }
    e.next();
}, "public_profiles");

// Restrict public list queries on public_profiles to lookups by slug or user_id only (prevent bulk scraping)
onRecordsListRequest((e) => {
    try {
        const utils = require(__hooks + '/utils.js');
        var authInfo = utils.getAuthInfo(e);
        if (authInfo.isAdmin) {
            return e.next();
        }
        utils.assertSafePublicListFilter(e, "public_profiles", authInfo);
    } catch (err) {
        if (err instanceof BadRequestError) {
            throw err;
        }
        // Unexpected parser/runtime errors must fail closed.
        $app.logger().error("Error in public_profiles list hook: " + err);
        throw new BadRequestError("Unable to validate public profile list request.");
    }
    return e.next();
}, "public_profiles");

console.log("--- main.pb.js LOADED SUCCESSFULLY ---");

routerAdd("GET", "/api/admin/promocodes/{id}/stats", (c) => {
    try {
        const admin = c.auth;
        if (!admin || admin.get("role") !== "admin") {
            throw new ForbiddenError("Only admins can access this.");
        }
        const id = c.request.pathValue("id");

        const logs = $app.findAllRecords("promocode_logs", $dbx.exp("promocode_id = {:id}", { id: id }));

        const result = [];
        for (let i = 0; i < logs.length; i++) {
            const log = logs[i];
            let userJson = null;
            try {
                const user = $app.findRecordById("users", log.get("user_id"));
                userJson = {
                    id: user.id,
                    username: user.get("username"),
                    email: user.email(),
                    avatar: user.get("avatar"),
                    plan: user.get("plan"),
                    created: user.get("created")
                };
            } catch (err) { }

            result.push({
                id: log.id,
                plan_awarded: log.get("plan_awarded"),
                created: log.get("created"),
                user: userJson
            });
        }

        // Sort by created DESC
        result.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

        return c.json(200, result);
    } catch (e) {
        return c.json(500, { error: e.toString(), stack: e.stack });
    }
});

// Admin: Get payment/billing stats for a specific promocode
routerAdd("GET", "/api/admin/promocodes/{id}/payments", (c) => {
    try {
        var admin = c.auth;
        if (!admin || admin.get("role") !== "admin") {
            throw new ForbiddenError("Only admins can access this.");
        }
        var promoId = c.request.pathValue("id");

        // Find all users who used this promocode
        var users = $app.findAllRecords("users", $dbx.exp("promocode_used = {:id}", { id: promoId }));

        var totalSpend = 0;
        var payments = [];

        for (var i = 0; i < users.length; i++) {
            var user = users[i];
            var userId = user.id;

            // Get all billing records for this user
            var bills = $app.findAllRecords("billing",
                $dbx.exp("user_id = {:uid}", { uid: userId })
            );
            // Sort by created ASC in JS
            bills.sort(function (a, b) {
                return new Date(a.get("created")).getTime() - new Date(b.get("created")).getTime();
            });

            for (var j = 0; j < bills.length; j++) {
                var bill = bills[j];
                var amount = bill.get("amount") || 0;
                var method = bill.get("payment_method") || "";

                // Skip free trials and $0 records — only real payments
                if (amount <= 0 || method === "Free Trial" || method === "Given") continue;

                totalSpend += amount;

                payments.push({
                    id: bill.id,
                    user: {
                        id: user.id,
                        username: user.get("username"),
                        email: user.email(),
                        avatar: user.get("avatar")
                    },
                    plan: bill.get("plan"),
                    amount: amount,
                    status: bill.get("status"),
                    payment_method: bill.get("payment_method"),
                    stripe_subscription_id: bill.get("stripe_subscription_id") || "",
                    is_first: j === 0,
                    created: bill.get("created")
                });
            }
        }

        // Sort payments by date DESC (most recent first)
        payments.sort(function (a, b) {
            return new Date(b.created).getTime() - new Date(a.created).getTime();
        });

        return c.json(200, {
            totalSpend: totalSpend,
            totalPayments: payments.length,
            payments: payments
        });
    } catch (e) {
        return c.json(500, { error: e.toString(), stack: e.stack });
    }
});

// ============================================
// ANALYTICS: Hourly Rollup API
// ============================================
// Raw clicks remain the source of truth, but dashboard requests read compact
// hourly rows. Response time therefore scales with hours/dimensions rather
// than the number of individual click events.
routerAdd("GET", "/api/analytics/stats", (c) => {
    var cacheKey = "";
    var ownsInflight = false;
    try {
        var utils = require(__hooks + '/utils.js');
        var user = c.auth;
        if (!user || user.collection().name !== "users") {
            return c.json(401, { message: "Unauthorized" });
        }

        var plan = utils.getPlanCatalogEntry(user.get("plan") || "creator");
        if (!plan.analytics && user.get("role") !== "admin") {
            return c.json(403, { message: "Advanced Analytics requires Creator Pro or Agency." });
        }

        var query = c.request.url.query();
        var linkId = query.get("linkId") || "";
        var period = query.get("period") || "7d";
        var validPeriods = { "24h": 24, "7d": 168, "30d": 720, "90d": 2160 };
        if (!validPeriods[period]) {
            return c.json(400, { message: "Invalid analytics period." });
        }

        var userId = user.id;
        if (linkId !== "") {
            try {
                $app.findFirstRecordByFilter(
                    "links",
                    "id = {:linkId} && user_id = {:userId}",
                    { linkId: linkId, userId: userId }
                );
            } catch (ownershipError) {
                return c.json(404, { message: "Link not found." });
            }
        }

        cacheKey = "stats|" + userId + "|" + linkId + "|" + period;
        var cached = utils.getAnalyticsCache(cacheKey);
        if (cached) return c.json(200, cached);

        if (!utils.analyticsRateLimitAllows(userId)) {
            return c.json(429, { message: "Too many analytics requests. Please wait a minute." });
        }
        if (utils.ANALYTICS_INFLIGHT[userId]) {
            return c.json(409, { message: "An analytics request is already running. Please retry shortly." });
        }
        utils.ANALYTICS_INFLIGHT[userId] = true;
        ownsInflight = true;

        var startedAt = new Date().getTime();
        var params = { userId: userId, cutoff: "-" + validPeriods[period] + " hours" };
        var whereBase = "r.link_id IN (SELECT id FROM links WHERE user_id = {:userId}) AND r.bucket >= strftime('%Y-%m-%dT%H:00:00Z', 'now', {:cutoff})";
        if (linkId !== "") {
            whereBase = "r.link_id = {:linkId} AND " + whereBase;
            params["linkId"] = linkId;
        }

        var db = $app.db();
        var rollupState = new DynamicModel({ "status": "pending" });
        db.newQuery("SELECT status FROM analytics_rollup_state WHERE id = 'historical'").one(rollupState);
        if (rollupState.status !== "complete") {
            return c.json(503, { message: "Analytics history is being optimized. Please retry shortly." });
        }

        var totalRow = new DynamicModel({ "total": 0, "uniq": 0 });
        params["dimension"] = "all";
        db.newQuery("SELECT COALESCE(sum(r.total), 0) as total, COALESCE(sum(r.unique_count), 0) as uniq FROM analytics_hourly_rollup r WHERE " + whereBase + " AND r.dimension_type = {:dimension}")
            .bind(params).one(totalRow);

        var CountryModel = new DynamicModel({ "name": "", "clicks": 0 });
        var countriesRaw = arrayOf(CountryModel);
        params["dimension"] = "country";
        db.newQuery("SELECT r.dimension_value as name, sum(r.total) as clicks FROM analytics_hourly_rollup r WHERE " + whereBase + " AND r.dimension_type = {:dimension} GROUP BY r.dimension_value ORDER BY clicks DESC LIMIT 20")
            .bind(params).all(countriesRaw);

        var RefModel = new DynamicModel({ "name": "", "clicks": 0 });
        var referrersRaw = arrayOf(RefModel);
        params["dimension"] = "referrer";
        db.newQuery("SELECT r.dimension_value as name, sum(r.total) as clicks FROM analytics_hourly_rollup r WHERE " + whereBase + " AND r.dimension_type = {:dimension} GROUP BY r.dimension_value ORDER BY clicks DESC LIMIT 5")
            .bind(params).all(referrersRaw);

        var ValueModel = new DynamicModel({ "name": "", "value": 0 });
        var devicesRaw = arrayOf(ValueModel);
        params["dimension"] = "device";
        db.newQuery("SELECT r.dimension_value as name, sum(r.total) as value FROM analytics_hourly_rollup r WHERE " + whereBase + " AND r.dimension_type = {:dimension} GROUP BY r.dimension_value ORDER BY value DESC")
            .bind(params).all(devicesRaw);

        var BrowserModel = new DynamicModel({ "name": "", "value": 0 });
        var browsersRaw = arrayOf(BrowserModel);
        params["dimension"] = "browser";
        db.newQuery("SELECT r.dimension_value as name, sum(r.total) as value FROM analytics_hourly_rollup r WHERE " + whereBase + " AND r.dimension_type = {:dimension} GROUP BY r.dimension_value ORDER BY value DESC LIMIT 3")
            .bind(params).all(browsersRaw);

        var OsModel = new DynamicModel({ "name": "", "value": 0 });
        var osRaw = arrayOf(OsModel);
        params["dimension"] = "os";
        db.newQuery("SELECT r.dimension_value as name, sum(r.total) as value FROM analytics_hourly_rollup r WHERE " + whereBase + " AND r.dimension_type = {:dimension} GROUP BY r.dimension_value ORDER BY value DESC LIMIT 3")
            .bind(params).all(osRaw);

        var TrendModel = new DynamicModel({ "date": "", "clicks": 0 });
        var trendRaw = arrayOf(TrendModel);
        var trendBucket = period === "24h" ? "r.bucket" : "substr(r.bucket, 1, 10)";
        params["dimension"] = "all";
        db.newQuery("SELECT " + trendBucket + " as date, sum(r.total) as clicks FROM analytics_hourly_rollup r WHERE " + whereBase + " AND r.dimension_type = {:dimension} GROUP BY " + trendBucket + " ORDER BY date ASC")
            .bind(params).all(trendRaw);

        var HeatModel = new DynamicModel({ "dow": 0, "hour": 0, "clicks": 0 });
        var heatRaw = arrayOf(HeatModel);
        db.newQuery("SELECT CAST(strftime('%w', r.bucket) AS INTEGER) as dow, CAST(strftime('%H', r.bucket) AS INTEGER) as hour, sum(r.total) as clicks FROM analytics_hourly_rollup r WHERE " + whereBase + " AND r.dimension_type = {:dimension} GROUP BY dow, hour")
            .bind(params).all(heatRaw);

        var heatmap = [];
        for (var d = 0; d < 7; d++) {
            var row = [];
            for (var h = 0; h < 24; h++) row.push(0);
            heatmap.push(row);
        }
        for (var i = 0; i < heatRaw.length; i++) {
            var hr = heatRaw[i];
            if (hr.dow >= 0 && hr.dow < 7 && hr.hour >= 0 && hr.hour < 24) {
                heatmap[hr.dow][hr.hour] = hr.clicks;
            }
        }

        var total = totalRow.total || 0;
        var countriesOut = [];
        for (var ci = 0; ci < countriesRaw.length; ci++) {
            countriesOut.push({
                name: countriesRaw[ci].name,
                clicks: countriesRaw[ci].clicks,
                pct: total > 0 ? Math.round((countriesRaw[ci].clicks / total) * 100) : 0
            });
        }

        var referrersOut = [];
        for (var ri = 0; ri < referrersRaw.length; ri++) {
            referrersOut.push({
                name: referrersRaw[ri].name,
                clicks: referrersRaw[ri].clicks,
                pct: total > 0 ? Math.round((referrersRaw[ri].clicks / total) * 100) : 0
            });
        }

        var valueRowsToPlain = function (rows) {
            var out = [];
            for (var vi = 0; vi < rows.length; vi++) {
                out.push({ name: rows[vi].name, value: rows[vi].value || 0 });
            }
            return out;
        };
        var trendOut = [];
        for (var ti = 0; ti < trendRaw.length; ti++) {
            trendOut.push({ date: trendRaw[ti].date, clicks: trendRaw[ti].clicks || 0 });
        }

        var response = {
            total: total,
            unique: totalRow.uniq || 0,
            countries: countriesOut,
            referrers: referrersOut,
            devices: valueRowsToPlain(devicesRaw),
            browsers: valueRowsToPlain(browsersRaw),
            os: valueRowsToPlain(osRaw),
            trend: trendOut,
            heatmap: heatmap,
            generatedAt: new Date().toISOString(),
            queryMs: new Date().getTime() - startedAt
        };

        utils.setAnalyticsCache(cacheKey, response, 30000);
        if (response.queryMs > 1000) {
            $app.logger().warn("Slow analytics rollup query user=" + userId + " period=" + period + " durationMs=" + response.queryMs);
        }
        return c.json(200, response);
    } catch (e) {
        $app.logger().error("Analytics stats API error: " + e.toString());
        return c.json(500, { message: "Analytics query failed." });
    } finally {
        if (ownsInflight && utils) delete utils.ANALYTICS_INFLIGHT[c.auth ? c.auth.id : ""];
    }
});

// Latest activity is deliberately separate from aggregate stats. A slow or
// empty activity lookup can no longer block charts and totals, and LIMIT 5
// avoids PocketBase list pagination's full COUNT query.
routerAdd("GET", "/api/analytics/recent", (c) => {
    try {
        var utils = require(__hooks + '/utils.js');
        var user = c.auth;
        if (!user || user.collection().name !== "users") return c.json(401, { message: "Unauthorized" });
        var plan = utils.getPlanCatalogEntry(user.get("plan") || "creator");
        if (!plan.analytics && user.get("role") !== "admin") return c.json(403, { message: "Advanced Analytics requires Creator Pro or Agency." });

        var linkId = c.request.url.query().get("linkId") || "";
        var params = { userId: user.id };
        var sql = "";
        if (linkId !== "") {
            params["linkId"] = linkId;
            sql = "SELECT c.id, c.country, c.device, c.os, c.browser, c.referrer, c.is_unique, c.created, l.title, l.slug FROM clicks c JOIN links l ON l.id = c.link_id WHERE c.link_id = {:linkId} AND l.user_id = {:userId} ORDER BY c.created DESC LIMIT 5";
        } else {
            sql = "SELECT c.id, c.country, c.device, c.os, c.browser, c.referrer, c.is_unique, c.created, l.title, l.slug FROM clicks c INDEXED BY idx_clicks_created JOIN links l ON l.id = c.link_id WHERE l.user_id = {:userId} ORDER BY c.created DESC LIMIT 5";
        }

        var RecentModel = new DynamicModel({
            "id": "", "country": "", "device": "", "os": "", "browser": "",
            "referrer": "", "is_unique": false, "created": "", "title": "", "slug": ""
        });
        var rows = arrayOf(RecentModel);
        $app.db().newQuery(sql).bind(params).all(rows);

        var items = [];
        for (var i = 0; i < rows.length; i++) {
            items.push({
                id: rows[i].id,
                country: rows[i].country,
                device: rows[i].device,
                os: rows[i].os,
                browser: rows[i].browser,
                referrer: rows[i].referrer,
                is_unique: rows[i].is_unique,
                created: rows[i].created,
                expand: { link_id: { title: rows[i].title, slug: rows[i].slug } }
            });
        }
        return c.json(200, { items: items });
    } catch (e) {
        $app.logger().error("Analytics recent API error: " + e.toString());
        return c.json(500, { message: "Recent activity query failed." });
    }
});

// Seven-day per-link sparklines used by Links. This replaces unbounded client
// pagination that previously downloaded every raw click in the period.
routerAdd("GET", "/api/links/sparklines", (c) => {
    try {
        var utils = require(__hooks + '/utils.js');
        var user = c.auth;
        if (!user || user.collection().name !== "users") return c.json(401, { message: "Unauthorized" });
        var cacheKey = "sparklines|" + user.id;
        var cached = utils.getAnalyticsCache(cacheKey);
        if (cached) return c.json(200, cached);

        var rollupState = new DynamicModel({ "status": "pending" });
        $app.db().newQuery("SELECT status FROM analytics_rollup_state WHERE id = 'historical'").one(rollupState);
        if (rollupState.status !== "complete") {
            return c.json(503, { message: "Analytics history is being optimized. Please retry shortly." });
        }

        var SparkModel = new DynamicModel({ "link_id": "", "day": "", "clicks": 0 });
        var rows = arrayOf(SparkModel);
        $app.db().newQuery(`
            SELECT r.link_id, substr(r.bucket, 1, 10) as day, sum(r.total) as clicks
            FROM analytics_hourly_rollup r
            WHERE r.link_id IN (SELECT id FROM links WHERE user_id = {:userId})
              AND r.dimension_type = 'all'
              AND r.bucket >= strftime('%Y-%m-%dT00:00:00Z', 'now', '-6 days')
            GROUP BY r.link_id, substr(r.bucket, 1, 10)
            ORDER BY day ASC
        `).bind({ userId: user.id }).all(rows);

        var items = [];
        for (var i = 0; i < rows.length; i++) {
            items.push({ link_id: rows[i].link_id, day: rows[i].day, clicks: rows[i].clicks || 0 });
        }
        var response = { items: items };
        utils.setAnalyticsCache(cacheKey, response, 30000);
        return c.json(200, response);
    } catch (e) {
        $app.logger().error("Links sparklines API error: " + e.toString());
        return c.json(500, { message: "Sparkline query failed." });
    }
});

// Lightweight dashboard summary for every plan. This removes the previous
// paginated raw-click request and makes the seven-day chart exact.
routerAdd("GET", "/api/dashboard/summary", (c) => {
    try {
        var utils = require(__hooks + '/utils.js');
        var user = c.auth;
        if (!user || user.collection().name !== "users") return c.json(401, { message: "Unauthorized" });
        var cacheKey = "dashboard|" + user.id;
        var cached = utils.getAnalyticsCache(cacheKey);
        if (cached) return c.json(200, cached);

        var rollupState = new DynamicModel({ "status": "pending" });
        $app.db().newQuery("SELECT status FROM analytics_rollup_state WHERE id = 'historical'").one(rollupState);
        if (rollupState.status !== "complete") {
            return c.json(503, { message: "Analytics history is being optimized. Please retry shortly." });
        }

        var summary = new DynamicModel({ "total_clicks": 0, "active_links": 0, "total_links": 0 });
        $app.db().newQuery(`
            SELECT
              COALESCE(sum(clicks_count), 0) as total_clicks,
              COALESCE(sum(CASE WHEN active = 1 THEN 1 ELSE 0 END), 0) as active_links,
              count(id) as total_links
            FROM links
            WHERE user_id = {:userId}
        `).bind({ userId: user.id }).one(summary);

        var TrendModel = new DynamicModel({ "day": "", "clicks": 0 });
        var trendRows = arrayOf(TrendModel);
        $app.db().newQuery(`
            SELECT substr(r.bucket, 1, 10) as day, sum(r.total) as clicks
            FROM analytics_hourly_rollup r
            WHERE r.link_id IN (SELECT id FROM links WHERE user_id = {:userId})
              AND r.dimension_type = 'all'
              AND r.bucket >= strftime('%Y-%m-%dT00:00:00Z', 'now', '-6 days')
            GROUP BY substr(r.bucket, 1, 10)
            ORDER BY day ASC
        `).bind({ userId: user.id }).all(trendRows);

        var RecentModel = new DynamicModel({ "slug": "", "country": "", "device": "", "created": "" });
        var recentRows = arrayOf(RecentModel);
        $app.db().newQuery(`
            SELECT l.slug, c.country, c.device, c.created
            FROM clicks c INDEXED BY idx_clicks_created
            JOIN links l ON l.id = c.link_id
            WHERE l.user_id = {:userId}
            ORDER BY c.created DESC
            LIMIT 5
        `).bind({ userId: user.id }).all(recentRows);

        var trend = [];
        for (var i = 0; i < trendRows.length; i++) {
            trend.push({ day: trendRows[i].day, clicks: trendRows[i].clicks || 0 });
        }
        var recent = [];
        for (var j = 0; j < recentRows.length; j++) {
            recent.push({
                slug: recentRows[j].slug,
                country: recentRows[j].country,
                device: recentRows[j].device,
                created: recentRows[j].created
            });
        }

        var response = {
            totalClicks: summary.total_clicks || 0,
            activeLinks: summary.active_links || 0,
            totalLinks: summary.total_links || 0,
            trend: trend,
            recent: recent
        };
        utils.setAnalyticsCache(cacheKey, response, 30000);
        return c.json(200, response);
    } catch (e) {
        $app.logger().error("Dashboard summary API error: " + e.toString());
        return c.json(500, { message: "Dashboard summary query failed." });
    }
});

// Admin Dashboard telemetry and stats aggregation (fast SQLite queries)
routerAdd("GET", "/api/admin/overview-stats", (c) => {
    try {
        var utils = require(__hooks + '/utils.js');
        var admin = c.auth;
        if (!admin || admin.get("role") !== "admin") {
            return c.json(403, { error: "Forbidden: Admins only" });
        }

        var query = c.request.url.query();
        var period = query.get("period") || "7d";

        var days = 7;
        if (period === "24h") days = 1;
        else if (period === "30d") days = 30;
        else if (period === "all") days = 90; // Limit charts to 90 days for performance

        var prevDays = days * 2;
        var db = $app.db();

        // 1. Basic totals
        var totals = new DynamicModel({ "total_users": 0, "total_links": 0, "total_revenue": 0.0001 });
        db.newQuery("SELECT (SELECT count(*) FROM users) as total_users, (SELECT count(*) FROM links) as total_links, (SELECT COALESCE(sum(amount), 0.0) FROM billing WHERE status = 'success') as total_revenue")
            .one(totals);

        // 2. Registered Users & Revenue in current/previous periods (for trends)
        var curStats = new DynamicModel({ "users": 0, "rev": 0.0001, "clicks": 0 });
        db.newQuery("SELECT (SELECT count(*) FROM users WHERE created >= datetime('now', '-' || {:days} || ' days')) as users, (SELECT COALESCE(sum(amount), 0.0) FROM billing WHERE status = 'success' AND created >= datetime('now', '-' || {:days} || ' days')) as rev, (SELECT count(*) FROM clicks WHERE created >= datetime('now', '-' || {:days} || ' days')) as clicks")
            .bind({ days: days })
            .one(curStats);

        var prevStats = new DynamicModel({ "users": 0, "rev": 0.0001, "clicks": 0 });
        db.newQuery("SELECT (SELECT count(*) FROM users WHERE created >= datetime('now', '-' || {:prevDays} || ' days') AND created < datetime('now', '-' || {:days} || ' days')) as users, (SELECT COALESCE(sum(amount), 0.0) FROM billing WHERE status = 'success' AND created >= datetime('now', '-' || {:prevDays} || ' days') AND created < datetime('now', '-' || {:days} || ' days')) as rev, (SELECT count(*) FROM clicks WHERE created >= datetime('now', '-' || {:prevDays} || ' days') AND created < datetime('now', '-' || {:days} || ' days')) as clicks")
            .bind({ days: days, prevDays: prevDays })
            .one(prevStats);

        // 3. User registrations in last 24h & 7d (KPI badges)
        var usersKpi = new DynamicModel({ "u24": 0, "u7": 0 });
        db.newQuery("SELECT (SELECT count(*) FROM users WHERE created >= datetime('now', '-1 days')) as u24, (SELECT count(*) FROM users WHERE created >= datetime('now', '-7 days')) as u7")
            .one(usersKpi);

        // 4. DAU / MAU
        var dauMau = new DynamicModel({ "dau": 0, "mau": 0 });
        db.newQuery("SELECT (SELECT count(DISTINCT user_id) FROM analytics_events WHERE created >= datetime('now', '-1 days') AND user_id != '') as dau, (SELECT count(DISTINCT user_id) FROM analytics_events WHERE created >= datetime('now', '-30 days') AND user_id != '') as mau")
            .one(dauMau);

        var prevDau = new DynamicModel({ "val": 0 });
        db.newQuery("SELECT count(DISTINCT user_id) as val FROM analytics_events WHERE created >= datetime('now', '-2 days') AND created < datetime('now', '-1 days') AND user_id != ''")
            .one(prevDau);

        // 5. MRR / Paid Users / Churn
        var billingStats = new DynamicModel({ "mrr": 0.0001, "paid_count": 0 });
        var proPlan = utils.getPlanCatalogEntry("pro");
        var agencyPlan = utils.getPlanCatalogEntry("agency");
        db.newQuery("SELECT COALESCE(sum(CASE WHEN plan = 'pro' THEN {:proPrice} WHEN plan = 'agency' THEN {:agencyPrice} ELSE 0.0 END), 0.0) as mrr, count(*) as paid_count FROM users WHERE plan != 'creator' AND plan != '' AND (plan_status = 'active' OR plan_status = '' OR plan_status IS NULL)")
            .bind({ proPrice: proPlan.monthlyPrice, agencyPrice: agencyPlan.monthlyPrice })
            .one(billingStats);

        var cancelled30 = new DynamicModel({ "val": 0 });
        db.newQuery("SELECT count(*) as val FROM billing WHERE (status = 'refunded' OR status = 'cancelled') AND created >= datetime('now', '-30 days')")
            .one(cancelled30);

        var churnRate = billingStats.paid_count > 0 ? (cancelled30.val / billingStats.paid_count) * 100 : 0;
        var arpu = billingStats.paid_count > 0 ? billingStats.mrr / billingStats.paid_count : 0;

        // 6. Funnel analytics (Landing Views, Signups, Paid signups)
        var funnelCurrent = new DynamicModel({ "views": 0, "paid": 0 });
        db.newQuery("SELECT (SELECT count(id) FROM analytics_events WHERE event_name = 'landing_pageview' AND created >= datetime('now', '-' || {:days} || ' days')) as views, (SELECT count(*) FROM users WHERE plan != 'creator' AND plan_status = 'active' AND created >= datetime('now', '-' || {:days} || ' days')) as paid")
            .bind({ days: days })
            .one(funnelCurrent);

        var funnelPrev = new DynamicModel({ "views": 0, "paid": 0 });
        db.newQuery("SELECT (SELECT count(id) FROM analytics_events WHERE event_name = 'landing_pageview' AND created >= datetime('now', '-' || {:prevDays} || ' days') AND created < datetime('now', '-' || {:days} || ' days')) as views, (SELECT count(*) FROM users WHERE plan != 'creator' AND plan_status = 'active' AND created >= datetime('now', '-' || {:prevDays} || ' days') AND created < datetime('now', '-' || {:days} || ' days')) as paid")
            .bind({ days: days, prevDays: prevDays })
            .one(funnelPrev);

        var convRate = funnelCurrent.views > 0 ? (funnelCurrent.paid / funnelCurrent.views) * 100 : 0;
        var prevConvRate = funnelPrev.views > 0 ? (funnelPrev.paid / funnelPrev.views) * 100 : 0;

        // 7. Trends calculations helper
        var getTrend = function (curr, prev) {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 100);
        };

        var trends = {
            users: getTrend(curStats.users, prevStats.users),
            revenue: getTrend(curStats.rev, prevStats.rev),
            dau: getTrend(dauMau.dau, prevDau.val),
            conversion: getTrend(convRate, prevConvRate),
            clicks: getTrend(curStats.clicks, prevStats.clicks)
        };

        // 8. Traffic Countries (Top 5)
        var CountryModel = new DynamicModel({ "name": "", "value": 0 });
        var countriesRaw = arrayOf(CountryModel);
        db.newQuery("SELECT COALESCE(country, 'Unknown') as name, count(id) as value FROM clicks WHERE created >= datetime('now', '-' || {:days} || ' days') GROUP BY name ORDER BY value DESC LIMIT 5")
            .bind({ days: days })
            .all(countriesRaw);

        // 9. Plan distribution
        var PlanModel = new DynamicModel({ "name": "", "value": 0 });
        var planRaw = arrayOf(PlanModel);
        db.newQuery("SELECT plan as name, count(*) as value FROM users GROUP BY plan")
            .all(planRaw);

        // Map plan tiers to human labels
        var plansMap = { "creator": "Creator", "pro": "Pro", "agency": "Agency" };
        var planData = [];
        for (var pIdx = 0; pIdx < planRaw.length; pIdx++) {
            var rawPlanName = planRaw[pIdx].name || "creator";
            planData.push({
                name: plansMap[rawPlanName] || rawPlanName,
                value: planRaw[pIdx].value || 0
            });
        }

        // 10. Top Creators by links clicks_count (Top 5)
        var CreatorModel = new DynamicModel({ "username": "", "plan": "", "count": 0 });
        var creatorsRaw = arrayOf(CreatorModel);
        db.newQuery("SELECT u.username, u.plan, CAST(COALESCE(sum(l.clicks_count), 0) as INTEGER) as count FROM links l JOIN users u ON l.user_id = u.id GROUP BY u.id ORDER BY count DESC LIMIT 5")
            .all(creatorsRaw);

        // 11. Pulse activity feed (Top 10)
        var PulseModel = new DynamicModel({ "id": "", "event_name": "", "created": "" });
        var pulseRaw = arrayOf(PulseModel);
        db.newQuery("SELECT id, event_name, created FROM analytics_events WHERE event_name != 'active_session' ORDER BY created DESC LIMIT 10")
            .all(pulseRaw);

        // 12. Growth cumulative timeline (O(N) daily SQL aggregation)
        var DayModel = new DynamicModel({ "day": "", "count": 0 });
        var dailyUsers = arrayOf(DayModel);
        db.newQuery("SELECT date(created) as day, count(*) as count FROM users WHERE created >= datetime('now', '-' || {:days} || ' days') GROUP BY day ORDER BY day ASC")
            .bind({ days: days })
            .all(dailyUsers);

        var DayRevModel = new DynamicModel({ "day": "", "sum": 0.0001 });
        var dailyRev = arrayOf(DayRevModel);
        db.newQuery("SELECT date(created) as day, COALESCE(sum(amount), 0.0) as sum FROM billing WHERE status = 'success' AND created >= datetime('now', '-' || {:days} || ' days') GROUP BY day ORDER BY day ASC")
            .bind({ days: days })
            .all(dailyRev);

        var DayDauModel = new DynamicModel({ "day": "", "dau": 0 });
        var dailyDau = arrayOf(DayDauModel);
        db.newQuery("SELECT date(created) as day, count(DISTINCT user_id) as dau FROM analytics_events WHERE user_id != '' AND created >= datetime('now', '-' || {:days} || ' days') GROUP BY day ORDER BY day ASC")
            .bind({ days: days })
            .all(dailyDau);

        // Map daily users/revenue into cumulative data
        var uDailyMap = {};
        for (var ui = 0; ui < dailyUsers.length; ui++) {
            uDailyMap[dailyUsers[ui].day] = dailyUsers[ui].count;
        }
        var rDailyMap = {};
        for (var ri = 0; ri < dailyRev.length; ri++) {
            rDailyMap[dailyRev[ri].day] = dailyRev[ri].sum;
        }
        var dDailyMap = {};
        for (var di = 0; di < dailyDau.length; di++) {
            dDailyMap[dailyDau[di].day] = dailyDau[di].dau;
        }

        // Get starting points (totals before date range)
        var uStarting = new DynamicModel({ "val": 0 });
        db.newQuery("SELECT count(*) as val FROM users WHERE created < datetime('now', '-' || {:days} || ' days')")
            .bind({ days: days })
            .one(uStarting);

        var rStarting = new DynamicModel({ "val": 0.0001 });
        db.newQuery("SELECT COALESCE(sum(amount), 0.0) as val FROM billing WHERE status = 'success' AND created < datetime('now', '-' || {:days} || ' days')")
            .bind({ days: days })
            .one(rStarting);

        var cumulativeUsers = uStarting.val || 0;
        var cumulativeRev = rStarting.val || 0;

        var growthData = [];
        var dauData = [];

        // Build list of dates for period
        var formatZero = function (n) { return n < 10 ? "0" + n : n; };
        var msDay = 86400000;
        var nowTs = new Date().getTime();
        for (var dIdx = days - 1; dIdx >= 0; dIdx--) {
            var date = new Date(nowTs - dIdx * msDay);
            var dateKey = date.getFullYear() + "-" + formatZero(date.getMonth() + 1) + "-" + formatZero(date.getDate());

            cumulativeUsers += (uDailyMap[dateKey] || 0);
            cumulativeRev += (rDailyMap[dateKey] || 0);

            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            var dateLabel = months[date.getMonth()] + " " + formatZero(date.getDate());

            growthData.push({
                name: dateLabel,
                users: cumulativeUsers,
                revenue: cumulativeRev
            });

            dauData.push({
                name: dateLabel,
                dau: dDailyMap[dateKey] || 0
            });
        }

        // 13. Conversion Events funnel
        var conversionEvents = [
            { name: "Landing Visitors", value: funnelCurrent.views, color: "#3b82f6" },
            { name: "Signups", value: curStats.users, color: "#10b981" },
            { name: "Active Users", value: dauMau.dau, color: "#f59e0b" },
            { name: "Paid Conversions", value: funnelCurrent.paid, color: "#8b5cf6" }
        ];

        return c.json(200, {
            stats: {
                totalUsers: totals.total_users,
                newUsers24h: usersKpi.u24,
                newUsers7d: usersKpi.u7,
                dau: dauMau.dau,
                mau: dauMau.mau,
                totalLinks: totals.total_links,
                totalRevenue: totals.total_revenue,
                mrr: billingStats.mrr,
                arpu: arpu,
                conversionRate: convRate,
                churnRate: churnRate,
                totalClicksInPeriod: curStats.clicks,
                trends: trends
            },
            growthData: growthData,
            dauData: dauData,
            planData: planData,
            topCreators: creatorsRaw,
            pulseEvents: pulseRaw,
            conversionEvents: conversionEvents,
            trafficData: countriesRaw
        });

    } catch (e) {
        $app.logger().error("Admin overview stats endpoint error: " + e.toString() + " stack: " + e.stack);
        return c.json(500, { error: e.toString() });
    }
});

console.log("End of script. globalThis has getAuthInfo?", typeof globalThis.getAuthInfo, "Keys:", Object.keys(globalThis));
