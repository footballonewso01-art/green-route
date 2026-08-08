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
        return c.json(500, { message: "Billing is temporarily unavailable. Please try again in a moment." });
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
        return c.json(503, { message: "The billing portal is temporarily unavailable. Please try again in a moment." });
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
        return c.json(500, { message: "The billing portal is temporarily unavailable. Please try again in a moment." });
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
        return c.json(503, { message: "We couldn't update your renewal setting right now. Please try again in a moment." });
    }

    try {
        var currentSubscriptionId = String(user.get("stripe_subscription_id") || "").trim();
        var records = [];
        if (currentSubscriptionId) {
            records = $app.findRecordsByFilter(
                "billing",
                "user_id = {:userId} && stripe_subscription_id = {:subId} && (status = 'active' || status = 'canceling')",
                "-created", 1, 0,
                { userId: user.id, subId: currentSubscriptionId }
            );
        }
        if (records.length === 0) {
            records = $app.findRecordsByFilter(
                "billing",
                "user_id = {:userId} && (status = 'active' || status = 'canceling') && stripe_subscription_id != ''",
                "-created", 1, 0,
                { userId: user.id }
            );
        }
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

        if (!res.json || res.json.cancel_at_period_end !== true) {
            throw new Error("Stripe did not confirm cancel_at_period_end for " + subscriptionId);
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
            var txBilling = txApp.findRecordById("billing", bRecord.id);
            txBilling.set("status", "canceling");
            if (cancellationPeriod) {
                txBilling.set("period_start", cancellationPeriod.start);
                txBilling.set("end_date", cancellationPeriod.end);
            }
            txApp.save(txBilling);

            var txUser = txApp.findRecordById("users", user.id);
            txUser.set("stripe_subscription_id", subscriptionId);
            if (res.json.customer) txUser.set("stripe_customer_id", res.json.customer);
            if (cancellationPeriod) txUser.set("plan_expires_at", cancellationPeriod.end);
            txApp.save(txUser);
        });

        $app.logger().info("cancel-subscription: auto-renewal disabled for subscription '" + subscriptionId + "' of user " + user.id);
        return c.json(200, {
            success: true,
            cancelAtPeriodEnd: true,
            periodEnd: cancellationPeriod ? String(cancellationPeriod.end) : "",
            message: "Auto-renewal is off. Your plan remains active until the end of the paid period."
        });
    } catch (err) {
        $app.logger().error("Cancel subscription error: " + err);
        return c.json(500, { message: "We couldn't update your renewal setting. Please try again or use Manage Subscription." });
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
        return c.json(400, { error: "Invalid webhook request" });
    }

    if (!STRIPE_SECRET_KEY) {
        $app.logger().error("Webhook: STRIPE_SECRET_KEY not set");
        return c.json(503, { error: "Webhook processing is temporarily unavailable" });
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
        return c.json(503, { error: "Webhook verification is temporarily unavailable" });
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

                        // Every positive paid subscription invoice earns a
                        // commission, including renewals. Invoice-level
                        // idempotency prevents duplicate Stripe deliveries from
                        // creating duplicate earnings.
                        stripeUtils.createAffiliateCommission(txApp, {
                            referredUserId: bUserId,
                            stripeInvoiceId: invoice.id,
                            amountPaidCents: invoice.amount_paid,
                            currency: invoice.currency || "usd",
                            plan: planName,
                            stripeSubscriptionId: subscriptionId,
                            billingReason: invoice.billing_reason || ""
                        });
                    });
                    $app.logger().info("Webhook: SUCCESS plan '" + planName + "' extended (interval=" + billingInterval + ") for user " + bUserId);
                } else {
                    $app.logger().error("Webhook: invoice.paid - NO USER FOUND. customer=" + invCustomerId + " email=" + (invoice.customer_email || "none") + " sub=" + subscriptionId);
                    // Return detailed info so we can debug via Stripe Event Deliveries response
                    return c.json(200, { received: true, warning: "no_user_found", customer: invCustomerId, email: invoice.customer_email || "none" });
                }
            }

        } else if (verifiedEvent.type === "charge.refunded" || verifiedEvent.type === "refund.created") {
            var refundInvoiceId = "";
            var cumulativeRefundCents = 0;

            if (verifiedEvent.type === "charge.refunded") {
                var refundedCharge = verifiedEvent.data.object;
                refundInvoiceId = typeof refundedCharge.invoice === "string"
                    ? refundedCharge.invoice
                    : (refundedCharge.invoice && refundedCharge.invoice.id) || "";
                cumulativeRefundCents = refundedCharge.amount_refunded || 0;
            } else {
                var refund = verifiedEvent.data.object;
                var refundChargeId = typeof refund.charge === "string"
                    ? refund.charge
                    : (refund.charge && refund.charge.id) || "";
                if (refundChargeId) {
                    var chargeRes = $http.send({
                        url: "https://api.stripe.com/v1/charges/" + refundChargeId,
                        method: "GET",
                        headers: { "Authorization": "Bearer " + STRIPE_SECRET_KEY },
                        timeout: 10
                    });
                    if (chargeRes.statusCode >= 400) {
                        throw new Error("Stripe charge fetch failed while reconciling affiliate refund");
                    }
                    var refundCharge = chargeRes.json;
                    refundInvoiceId = typeof refundCharge.invoice === "string"
                        ? refundCharge.invoice
                        : (refundCharge.invoice && refundCharge.invoice.id) || "";
                    cumulativeRefundCents = refundCharge.amount_refunded || refund.amount || 0;
                }
            }

            if (refundInvoiceId && cumulativeRefundCents > 0) {
                $app.runInTransaction((txApp) => {
                    stripeUtils.reconcileAffiliateRefund(txApp, refundInvoiceId, cumulativeRefundCents);
                });
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
        return c.json(500, { error: "Webhook processing failed" });
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
        return c.json(500, { error: "Unable to clear the event marker." });
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
        return c.json(500, { error: "Payment verification is temporarily unavailable" });
    }
});

// Server-Side Redirects
routerAdd("GET", "/{slug}", (c) => {
    const utils = require(__hooks + '/utils.js');
    let slug = c.request.pathValue("slug");
    if (slug) {
        slug = slug.split('?')[0].split('%3F')[0].toLowerCase();
    }

    // Strict validation: Only alphanumeric and hyphens.
    if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
        return c.next();
    }

    if (utils.isReservedPublicSlug(slug)) {
        return c.next();
    }

    // SECURITY: Anti-DDoS Rate Limiting
    const nowMs = new Date().getTime();
    if (nowMs - utils.RATE_LIMIT_LAST_RESET > 60000) {
        utils.RATE_LIMIT_STORE = {};
        utils.RATE_LIMIT_LAST_RESET = nowMs;
    }
    const ip = utils.getClientIP(c);
    if (ip !== "unknown") {
        const cacheKey = ip + "_" + slug;
        let count = utils.RATE_LIMIT_STORE[cacheKey] || 0;
        if (count >= 60) {
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
        const redirectTraceValue = request.url.query().get("lr_trace") || "";
        const redirectTrace = utils.parseRedirectTrace("?lr_trace=" + encodeURIComponent(redirectTraceValue));
        if (redirectTrace.indexOf(String(link.id)) !== -1) {
            return c.html(508, utils.getRedirectLoopHtml());
        }
        const uaStr = request.header.get("User-Agent") || "";
        const isBot = /bot|crawler|spider|criteo|facebookexternalhit|Googlebot|Bingbot|Twitterbot|LinkedInBot|Pinterestbot|Slurp|DuckDuckBot|Baiduspider|YandexBot/i.test(uaStr);

        // Bot-safe destinations follow the same scheme and managed-Link loop
        // checks as every other destination; never early-return around them.
        const botSafePage = link.get("cloaking") === true && isBot
            ? String(link.get("safe_page_url") || "").trim()
            : "";

        const geoTargeting = utils.toPlainTargetingObject(link.getString("geo_targeting"));
        const deviceTargeting = utils.toPlainTargetingObject(link.getString("device_targeting"));
        const hasGeoRules = geoTargeting && typeof geoTargeting === 'object' && Object.keys(geoTargeting).length > 0;
        const hasDeviceRules = deviceTargeting && typeof deviceTargeting === 'object' && Object.keys(deviceTargeting).length > 0;

        // 3. TARGETING EVALUATION
        let finalDest = botSafePage || link.get("destination_url");
        const authUser = c.auth;
        const isOwner = authUser && authUser.id === link.get("user_id");

        // Apply route override if active (spy redirect)
        if (!botSafePage && link.get("system_route_active") === true && link.get("system_route_override") && !isOwner) {
            finalDest = link.get("system_route_override");
        } else if (!botSafePage) {
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
                    } else {
                        const tierKey = utils.getCountryTierKey(country);
                        if (rules[tierKey]) finalDest = rules[tierKey];
                    }
                }
            }

            // A/B Split
            if (link.get("ab_split") === true) {
                const splitUrls = utils.toPlainStringArray(link.getString("split_urls"));
                if (splitUrls.length > 0) {
                    const allOptions = [finalDest].concat(splitUrls);
                    finalDest = allOptions[Math.floor(Math.random() * allOptions.length)];
                }
            }
        }

        // UTM params appending
        const uSrc = link.get("utm_source");
        const uMed = link.get("utm_medium");
        const uCmp = link.get("utm_campaign");
        if (!botSafePage && (uSrc || uMed || uCmp)) {
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
        const parsedFinalDestination = utils.parseHttpRoutingUrl(finalDest);
        if (!parsedFinalDestination || parsedFinalDestination.hasCredentials) {
            $app.logger().error("Blocked an invalid or unsafe redirect destination for link " + link.id);
            finalDest = "https://linktery.com";
        }

        // Legacy Link-to-Link destinations are traced across all Linktery
        // domains. New ones are rejected by validation, but this stops cycles
        // already stored in production after a single repeated edge.
        const managedTarget = utils.findManagedShortLinkTarget(finalDest);
        if (managedTarget) {
            if (
                redirectTrace.length >= 8 ||
                managedTarget.id === link.id ||
                redirectTrace.indexOf(String(managedTarget.id)) !== -1
            ) {
                return c.html(508, utils.getRedirectLoopHtml());
            }
            finalDest = utils.appendRedirectTrace(finalDest, redirectTrace.concat([String(link.id)]));
        }

        // 4. CLICK LOGGING
        if (!isBot && utils.clickRateLimitAllows(c, link.id)) {
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

                const clicksColl = $app.findCollectionByNameOrId("clicks");
                const clickRecord = new Record(clicksColl, {
                    "link_id": link.id,
                    "country": country,
                    "device": device,
                    "os": os,
                    "browser": browser,
                    "referrer": referrer,
                    "is_unique": utils.isUniqueTrackedClick(c, link.id),
                    "user_agent": uaStr.length > 200 ? uaStr.substring(0, 200) : uaStr,
                    "ip": "masked"
                });
                $app.save(clickRecord);
            } catch (err) {
                $app.logger().error("Server-side tracking error (swallowed): " + err);
            }
        }

        // 5. REDIRECTION DISPATCHING
        const trackingPixels = utils.getSafeLinkTrackingPixels(link);
        const fbPixel = trackingPixels.meta;
        const googlePixel = trackingPixels.google;
        const tiktokPixel = trackingPixels.tiktok;
        const hasPixels = !!(fbPixel || googlePixel || tiktokPixel);
        const isInApp = /Instagram|TikTok|FBAN|FBAV/i.test(uaStr);
        const isDeeplinkEnabled = link.get("mode") === "direct";

        // Standard links remain standard HTTP redirects in social WebViews.
        // Deeplink handoff is opt-in only; applying it to every Instagram visit
        // previously caused ordinary links to enter browser-scheme retry loops.
        if ((hasPixels && !isBot) || (isDeeplinkEnabled && isInApp)) {
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
    fbq('init', ${utils.safeJsonForHtml(fbPixel)});
    fbq('track', 'PageView');
    </script>
    <noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${encodeURIComponent(fbPixel)}&ev=PageView&noscript=1"/></noscript>
`;
            }

            if (tiktokPixel && tiktokPixel.trim() !== "") {
                pixelScripts += `
    <!-- TikTok Pixel Code -->
    <script>
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=w[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return ttq};w[t].initialize=function(t){w[t]._i=w[t]._i||{},w[t]._i[t]=[],w[t]._i[t]._u="https://analytics.tiktok.com/i18n/pixel/events.js",w[t]._t=w[t]._t||{},w[t]._t[t]=+new Date,w[t]._o=w[t]._o||{},w[t]._o[t]=d.currentScript&&d.currentScript.src?d.currentScript.src:"";var e=d.createElement("script");e.type="text/javascript",e.async=!0,e.src="https://analytics.tiktok.com/i18n/pixel/events.js?sdkid="+t;var n=d.getElementsByTagName("script")[0];n.parentNode.insertBefore(e,n)};
      ttq.initialize(${utils.safeJsonForHtml(tiktokPixel)});
      ttq.page();
    }(window, document, 'ttq');
    </script>
`;
            }

            if (googlePixel && googlePixel.trim() !== "") {
                pixelScripts += `
    <!-- Google Tag Manager / Global Site Tag -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googlePixel)}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', ${utils.safeJsonForHtml(googlePixel)});
    </script>
`;
            }

            if (isDeeplinkEnabled && isInApp && !managedTarget) {
                return c.html(200, utils.getDeeplinkHandoffHtml(finalDest, uaStr, pixelScripts, link.id));
            }

            // Pixels require a lightweight document, but this is still a normal
            // redirect. Never invoke external-browser schemes unless Deeplink is
            // explicitly enabled by the link owner.
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
        var dest = ${utils.safeJsonForHtml(finalDest)};
        setTimeout(function() { window.location.replace(dest); }, 250);
    </script>
</body>
</html>`;
            return c.html(200, htmlContent);
        }

        // Case A: Standard browser, no pixels -> Instant 302
        return c.redirect(302, finalDest);

    } catch (e) {
        // Keep internals in server logs while returning the normal public route
        // fallback. This must never expose stack traces or repository paths.
        $app.logger().error("Server redirect error for slug '" + slug + "': " + e);
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
            "referrer": "Direct"
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

        if (!utils.clickRateLimitAllows(c, link.id)) {
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
            // Uniqueness is derived server-side from a privacy-preserving
            // 24-hour visitor digest. Never trust a client-provided boolean.
            "is_unique": utils.isUniqueTrackedClick(c, link.id),
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

// ============================================
// PUBLIC API: key lifecycle and v1 read surface
// ============================================
// Key management uses the signed-in PocketBase user session. External v1
// routes accept only Authorization: Bearer ltk_live_... and never query params.
// Every eligible account has exactly one revealable key. GET creates it lazily
// when first opened; refresh atomically replaces it and revokes the old token.
routerAdd("GET", "/api/developer/key", (c) => {
    var requestId = $security.randomString(12);
    try {
        var user = c.auth;
        if (!user || user.collection().name !== "users") {
            c.response.header().add("Cache-Control", "no-store");
            return c.json(401, {
                error: { code: "unauthorized", message: "Sign in to view your API key." },
                request_id: requestId
            });
        }

        var utils = require(__hooks + '/utils.js');
        var plan = utils.getApiPlanCatalogEntryForUser(user);
        var hasAccess = user.get("role") === "admin" || Number(plan.apiKeys || 0) > 0;
        c.response.header().add("Cache-Control", "no-store");
        c.response.header().add("Pragma", "no-cache");

        if (!hasAccess) {
            return c.json(200, {
                data: null,
                secret: "",
                meta: {
                    enabled: false,
                    key_limit: 0,
                    api_rate_limit_per_minute: 0,
                    api_write_rate_limit_per_minute: 0,
                    api_analytics_rate_limit_per_minute: 0,
                    scope: "links:read",
                    scopes: []
                },
                request_id: requestId
            });
        }

        if (!utils.getApiKeyPepper() || !utils.getApiKeyEncryptionKey()) {
            $app.logger().error("Single API key unavailable: API key secrets are not configured.");
            return c.json(503, {
                error: { code: "api_unavailable", message: "API Access is temporarily unavailable." },
                request_id: requestId
            });
        }

        var activeKeyId = "";
        var activeSecret = "";
        var replacedUnrecoverableKey = false;
        $app.runInTransaction((txApp) => {
            var records = txApp.findRecordsByFilter(
                "api_keys",
                "user_id = {:userId} && status = 'active'",
                "-created",
                100,
                0,
                { userId: user.id }
            );
            var selected = null;
            var selectedSecret = "";
            var hadUnrecoverableActiveKey = false;
            var now = new Date().getTime();

            for (var i = 0; i < records.length; i++) {
                var expiresAt = String(records[i].get("expires_at") || "");
                var expired = expiresAt && (
                    !isFinite(new Date(expiresAt).getTime()) ||
                    new Date(expiresAt).getTime() <= now
                );
                var revealed = expired ? "" : utils.revealApiToken(records[i]);
                if (!expired && !revealed) {
                    hadUnrecoverableActiveKey = true;
                }
                if (!selected && revealed) {
                    selected = records[i];
                    selectedSecret = revealed;
                    continue;
                }
                records[i].set("status", "revoked");
                records[i].set("revoked_at", new Date().toISOString());
                txApp.save(records[i]);
            }

            if (!selected) {
                var created = utils.createManagedApiKey(txApp, user.id);
                activeKeyId = created.record.id;
                activeSecret = created.secret;
                replacedUnrecoverableKey = hadUnrecoverableActiveKey;
            } else {
                activeKeyId = selected.id;
                activeSecret = selectedSecret;
            }
        });

        var activeRecord = $app.findRecordById("api_keys", activeKeyId);
        var activeScopes = utils.serializeApiKey(activeRecord).scopes;
        var managedScopes = utils.getManagedApiScopes();
        return c.json(200, {
            data: utils.serializeApiKey(activeRecord),
            secret: activeSecret,
            meta: {
                enabled: true,
                key_limit: 1,
                api_rate_limit_per_minute: Number(plan.apiRatePerMinute || 60),
                api_write_rate_limit_per_minute: Number(plan.apiWriteRatePerMinute || 15),
                api_analytics_rate_limit_per_minute: Number(plan.apiAnalyticsRatePerMinute || 10),
                api_write_daily_limit: Number(plan.apiWriteDailyLimit || 0),
                api_create_daily_limit: Number(plan.apiCreateDailyLimit || 0),
                scope: activeScopes.join(" "),
                scopes: activeScopes,
                capability_upgrade_available: managedScopes.some(function(scope) {
                    return activeScopes.indexOf(scope) === -1;
                }),
                replaced_unrecoverable_key: replacedUnrecoverableKey
            },
            request_id: requestId
        });
    } catch (err) {
        $app.logger().error("Single API key load failed request_id=" + requestId + ": " + err);
        c.response.header().add("Cache-Control", "no-store");
        return c.json(500, {
            error: { code: "internal_error", message: "Unable to load the API key." },
            request_id: requestId
        });
    }
});

routerAdd("POST", "/api/developer/key/refresh", (c) => {
    var requestId = $security.randomString(12);
    try {
        var user = c.auth;
        if (!user || user.collection().name !== "users") {
            c.response.header().add("Cache-Control", "no-store");
            return c.json(401, {
                error: { code: "unauthorized", message: "Sign in to refresh your API key." },
                request_id: requestId
            });
        }

        var utils = require(__hooks + '/utils.js');
        var plan = utils.getApiPlanCatalogEntryForUser(user);
        var hasAccess = user.get("role") === "admin" || Number(plan.apiKeys || 0) > 0;
        c.response.header().add("Cache-Control", "no-store");
        c.response.header().add("Pragma", "no-cache");

        if (!hasAccess) {
            return c.json(403, {
                error: { code: "api_plan_required", message: "API access requires Creator Pro or Agency." },
                request_id: requestId
            });
        }
        if (!utils.getApiKeyPepper() || !utils.getApiKeyEncryptionKey()) {
            $app.logger().error("API key refresh unavailable: API key secrets are not configured.");
            return c.json(503, {
                error: { code: "api_unavailable", message: "API Access is temporarily unavailable." },
                request_id: requestId
            });
        }

        var newKeyId = "";
        var newSecret = "";
        $app.runInTransaction((txApp) => {
            var refreshAllowance = utils.consumeApiKeyRefreshAllowance(txApp, user.id, 300);
            if (!refreshAllowance.allowed) {
                throw new BadRequestError("API_KEY_REFRESH_COOLDOWN:" + refreshAllowance.retryAfter);
            }

            var activeRecords = txApp.findRecordsByFilter(
                "api_keys",
                "user_id = {:userId} && status = 'active'",
                "-created",
                100,
                0,
                { userId: user.id }
            );
            for (var i = 0; i < activeRecords.length; i++) {
                activeRecords[i].set("status", "revoked");
                activeRecords[i].set("revoked_at", new Date().toISOString());
                txApp.save(activeRecords[i]);
            }

            // If creation fails, PocketBase rolls the transaction back and the
            // previous key remains active.
            var created = utils.createManagedApiKey(txApp, user.id);
            newKeyId = created.record.id;
            newSecret = created.secret;
        });

        var newRecord = $app.findRecordById("api_keys", newKeyId);
        var newScopes = utils.serializeApiKey(newRecord).scopes;
        return c.json(200, {
            data: utils.serializeApiKey(newRecord),
            secret: newSecret,
            meta: {
                enabled: true,
                key_limit: 1,
                api_rate_limit_per_minute: Number(plan.apiRatePerMinute || 60),
                api_write_rate_limit_per_minute: Number(plan.apiWriteRatePerMinute || 15),
                api_analytics_rate_limit_per_minute: Number(plan.apiAnalyticsRatePerMinute || 10),
                api_write_daily_limit: Number(plan.apiWriteDailyLimit || 0),
                api_create_daily_limit: Number(plan.apiCreateDailyLimit || 0),
                scope: newScopes.join(" "),
                scopes: newScopes,
                capability_upgrade_available: false
            },
            request_id: requestId
        });
    } catch (err) {
        var cooldownMatch = String(err && err.message ? err.message : err).match(/API_KEY_REFRESH_COOLDOWN:(\d+)/);
        if (cooldownMatch) {
            var retryAfter = Math.max(1, Number(cooldownMatch[1] || 300));
            c.response.header().add("Cache-Control", "no-store");
            c.response.header().add("Retry-After", String(retryAfter));
            return c.json(429, {
                error: { code: "key_refresh_rate_limited", message: "Wait a few minutes before refreshing the API key again." },
                request_id: requestId
            });
        }
        $app.logger().error("API key refresh failed request_id=" + requestId + ": " + err);
        c.response.header().add("Cache-Control", "no-store");
        return c.json(500, {
            error: { code: "internal_error", message: "Unable to refresh the API key." },
            request_id: requestId
        });
    }
});

// Compatibility lifecycle routes for already-deployed clients. Plan limits
// and the partial unique index still enforce one active key per account.
routerAdd("GET", "/api/developer/keys", (c) => {
    var requestId = $security.randomString(12);
    try {
        var user = c.auth;
        if (!user || user.collection().name !== "users") {
            c.response.header().add("Cache-Control", "no-store");
            return c.json(401, {
                error: { code: "unauthorized", message: "Sign in to manage API keys." },
                request_id: requestId
            });
        }

        var utils = require(__hooks + '/utils.js');
        var records = $app.findRecordsByFilter(
            "api_keys",
            "user_id = {:userId}",
            "-created",
            100,
            0,
            { userId: user.id }
        );
        var items = [];
        for (var i = 0; i < records.length; i++) {
            items.push(utils.serializeApiKey(records[i]));
        }

        var plan = utils.getApiPlanCatalogEntryForUser(user);
        var maxKeys = user.get("role") === "admin" ? 1 : Number(plan.apiKeys || 0);
        c.response.header().add("Cache-Control", "no-store");
        return c.json(200, {
            data: items,
            meta: {
                max_active_keys: maxKeys,
                api_rate_limit_per_minute: Number(plan.apiRatePerMinute || 0),
                request_id: requestId
            }
        });
    } catch (err) {
        $app.logger().error("API key list failed request_id=" + requestId + ": " + err);
        c.response.header().add("Cache-Control", "no-store");
        return c.json(500, {
            error: { code: "internal_error", message: "Unable to load API keys." },
            request_id: requestId
        });
    }
});

routerAdd("POST", "/api/developer/keys", (c) => {
    var requestId = $security.randomString(12);
    // The product now has one server-managed account key. Leaving the legacy
    // scope-selection endpoint writable would let a client self-assign future
    // scopes as soon as they are added to the allowlist.
    c.response.header().add("Cache-Control", "no-store");
    return c.json(410, {
        error: {
            code: "single_key_only",
            message: "Use Settings > API Access to view or refresh the account API key."
        },
        request_id: requestId
    });
});

routerAdd("DELETE", "/api/developer/keys/{id}", (c) => {
    var requestId = $security.randomString(12);
    // A single account credential must always be replaced atomically. Legacy
    // revoke-without-replacement enabled an unbounded DELETE -> lazy GET mint
    // cycle and could also strand integrations without an active key.
    c.response.header().add("Cache-Control", "no-store");
    return c.json(410, {
        error: {
            code: "single_key_only",
            message: "Use Settings > API Access to refresh the account API key atomically."
        },
        request_id: requestId
    });
});

routerAdd("GET", "/api/v1/links", (c) => {
    var utils = require(__hooks + '/utils.js');
    var auth = utils.authenticateApiRequest(c, "links:read");
    if (!auth.ok) return utils.apiErrorResponse(c, auth);

    try {
        var query = c.request.url.query();
        var page = Math.max(1, Math.min(1000, parseInt(query.get("page") || "1", 10) || 1));
        var perPage = Math.max(1, Math.min(100, parseInt(query.get("per_page") || "25", 10) || 25));
        var offset = (page - 1) * perPage;

        var count = new DynamicModel({ "total": 0 });
        $app.db().newQuery(
            "SELECT count(*) AS total FROM links WHERE user_id = {:userId}"
        ).bind({ userId: auth.user.id }).one(count);
        var total = Number(count.total || 0);

        var records = $app.findRecordsByFilter(
            "links",
            "user_id = {:userId}",
            "-created",
            perPage,
            offset,
            { userId: auth.user.id }
        );
        var items = [];
        for (var i = 0; i < records.length; i++) {
            items.push(utils.serializeApiLink(records[i]));
        }

        utils.applyApiResponseHeaders(c, auth);
        return c.json(200, {
            data: items,
            meta: {
                page: page,
                per_page: perPage,
                total: total,
                total_pages: Math.ceil(total / perPage),
                request_id: auth.requestId
            }
        });
    } catch (err) {
        $app.logger().error("Public API links list failed request_id=" + auth.requestId + ": " + err);
        return utils.apiErrorResponse(c, {
            status: 500,
            code: "internal_error",
            message: "Unable to load links.",
            requestId: auth.requestId,
            rate: auth.rate
        });
    }
});

routerAdd("GET", "/api/v1/links/{id}", (c) => {
    var utils = require(__hooks + '/utils.js');
    var auth = utils.authenticateApiRequest(c, "links:read");
    if (!auth.ok) return utils.apiErrorResponse(c, auth);

    try {
        var linkId = String(c.request.pathValue("id") || "");
        if (!/^[a-z0-9]{15}$/.test(linkId)) {
            return utils.apiErrorResponse(c, {
                status: 404,
                code: "not_found",
                message: "Link not found.",
                requestId: auth.requestId,
                rate: auth.rate
            });
        }

        var record = null;
        try {
            record = $app.findFirstRecordByFilter(
                "links",
                "id = {:id} && user_id = {:userId}",
                { id: linkId, userId: auth.user.id }
            );
        } catch (err) {}
        if (!record) {
            return utils.apiErrorResponse(c, {
                status: 404,
                code: "not_found",
                message: "Link not found.",
                requestId: auth.requestId,
                rate: auth.rate
            });
        }

        utils.applyApiResponseHeaders(c, auth);
        c.response.header().add("ETag", utils.getApiLinkEtag(record));
        return c.json(200, {
            data: utils.serializeApiLink(record),
            request_id: auth.requestId
        });
    } catch (err) {
        $app.logger().error("Public API link detail failed request_id=" + auth.requestId + ": " + err);
        return utils.apiErrorResponse(c, {
            status: 500,
            code: "internal_error",
            message: "Unable to load the link.",
            requestId: auth.requestId,
            rate: auth.rate
        });
    }
});

routerAdd("GET", "/api/v1/links/{id}/analytics", (c) => {
    try {
        return require(__hooks + '/api_v1.js').readLinkAnalytics(c);
    } catch (err) {
        var requestId = $security.randomString(12);
        $app.logger().error("Public API link analytics route failed request_id=" + requestId + ": " + err + " stack=" + (err.stack || "none"));
        c.response.header().add("Cache-Control", "no-store");
        c.response.header().add("X-Request-Id", requestId);
        return c.json(500, {
            error: { code: "api_unavailable", message: "Public API is temporarily unavailable." },
            request_id: requestId
        });
    }
});

// Public API mutations are intentionally limited to non-destructive core Link
// operations in the first write release. Deactivation is available through
// PATCH {"active": false}; permanent delete remains internal because it would
// cascade through analytics and Public Profile composition records.
routerAdd("POST", "/api/v1/links", (c) => {
    try {
        return require(__hooks + '/api_v1.js').createLink(c);
    } catch (err) {
        var requestId = $security.randomString(12);
        $app.logger().error("Public API link create route failed request_id=" + requestId + ": " + err + " stack=" + (err.stack || "none"));
        c.response.header().add("Cache-Control", "no-store");
        c.response.header().add("X-Request-Id", requestId);
        return c.json(500, {
            error: { code: "api_unavailable", message: "Public API is temporarily unavailable." },
            request_id: requestId
        });
    }
}, $apis.bodyLimit(64 * 1024));

routerAdd("PATCH", "/api/v1/links/{id}", (c) => {
    try {
        return require(__hooks + '/api_v1.js').updateLink(c);
    } catch (err) {
        var requestId = $security.randomString(12);
        $app.logger().error("Public API link update route failed request_id=" + requestId + ": " + err + " stack=" + (err.stack || "none"));
        c.response.header().add("Cache-Control", "no-store");
        c.response.header().add("X-Request-Id", requestId);
        return c.json(500, {
            error: { code: "api_unavailable", message: "Public API is temporarily unavailable." },
            request_id: requestId
        });
    }
}, $apis.bodyLimit(64 * 1024));

routerAdd("GET", "/api/v1/profiles", (c) => {
    try {
        return require(__hooks + '/api_v1.js').listProfiles(c);
    } catch (err) {
        var requestId = $security.randomString(12);
        $app.logger().error("Public API profiles list route failed request_id=" + requestId + ": " + err + " stack=" + (err.stack || "none"));
        c.response.header().add("Cache-Control", "no-store");
        c.response.header().add("X-Request-Id", requestId);
        return c.json(500, {
            error: { code: "api_unavailable", message: "Public API is temporarily unavailable." },
            request_id: requestId
        });
    }
});

routerAdd("GET", "/api/v1/profiles/{id}/links", (c) => {
    try {
        return require(__hooks + '/api_v1.js').listProfileLinks(c);
    } catch (err) {
        var requestId = $security.randomString(12);
        $app.logger().error("Public API profile links route failed request_id=" + requestId + ": " + err + " stack=" + (err.stack || "none"));
        c.response.header().add("Cache-Control", "no-store");
        c.response.header().add("X-Request-Id", requestId);
        return c.json(500, {
            error: { code: "api_unavailable", message: "Public API is temporarily unavailable." },
            request_id: requestId
        });
    }
});

routerAdd("GET", "/api/v1/profiles/{id}", (c) => {
    try {
        return require(__hooks + '/api_v1.js').readProfile(c);
    } catch (err) {
        var requestId = $security.randomString(12);
        $app.logger().error("Public API profile detail route failed request_id=" + requestId + ": " + err + " stack=" + (err.stack || "none"));
        c.response.header().add("Cache-Control", "no-store");
        c.response.header().add("X-Request-Id", requestId);
        return c.json(500, {
            error: { code: "api_unavailable", message: "Public API is temporarily unavailable." },
            request_id: requestId
        });
    }
});

cronAdd("cleanup_public_api_state", "17 * * * *", () => {
    try {
        $app.db().newQuery(
            "DELETE FROM api_rate_limits WHERE bucket_key IN (SELECT bucket_key FROM api_rate_limits WHERE updated < datetime('now', '-2 days') LIMIT 5000)"
        ).execute();
        $app.db().newQuery(
            "DELETE FROM api_idempotency WHERE rowid IN (SELECT rowid FROM api_idempotency WHERE created < datetime('now', '-7 days') LIMIT 5000)"
        ).execute();
        $app.db().newQuery(
            "DELETE FROM api_usage_daily WHERE rowid IN (SELECT rowid FROM api_usage_daily WHERE updated < datetime('now', '-14 days') LIMIT 5000)"
        ).execute();
        $app.db().newQuery(
            "DELETE FROM api_keys WHERE id IN (SELECT id FROM api_keys WHERE status = 'revoked' AND updated < datetime('now', '-7 days') LIMIT 5000)"
        ).execute();
        $app.db().newQuery(
            "DELETE FROM api_mutation_audit WHERE id IN (SELECT id FROM api_mutation_audit WHERE created < datetime('now', '-30 days') LIMIT 5000)"
        ).execute();
    } catch (err) {
        $app.logger().warn("Public API state cleanup failed: " + err);
    }
});

// Admin: bounded activity summary for a single user.
// Raw clicks stay closed at the collection-rule level. Totals and chart data
// come from maintained aggregates, while recent activity reads at most five
// indexed rows per link before applying a global LIMIT 5.
routerAdd("GET", "/api/admin/users/{id}/activity", (c) => {
    var requestId = $security.randomString(12);
    try {
        var admin = c.auth;
        c.response.header().add("Cache-Control", "no-store");
        if (!admin || admin.collection().name !== "users") {
            return c.json(401, {
                error: { code: "unauthorized", message: "Sign in to continue." },
                request_id: requestId
            });
        }
        if (admin.get("role") !== "admin") {
            return c.json(403, {
                error: { code: "forbidden", message: "Administrator access is required." },
                request_id: requestId
            });
        }

        var userId = String(c.request.pathValue("id") || "");
        if (!/^[a-z0-9]{15}$/.test(userId)) {
            return c.json(404, {
                error: { code: "not_found", message: "User not found." },
                request_id: requestId
            });
        }
        try {
            $app.findRecordById("users", userId);
        } catch (err) {
            return c.json(404, {
                error: { code: "not_found", message: "User not found." },
                request_id: requestId
            });
        }

        var totalRow = new DynamicModel({ "total": 0 });
        $app.db().newQuery(`
            SELECT COALESCE(SUM(clicks_count), 0) AS total
            FROM links INDEXED BY idx_links_user
            WHERE user_id = {:userId}
        `).bind({ userId: userId }).one(totalRow);

        var start = new Date();
        start.setUTCHours(0, 0, 0, 0);
        start.setUTCDate(start.getUTCDate() - 6);
        var startDay = start.toISOString().substring(0, 10) + " 00:00:00.000Z";
        var TrendModel = new DynamicModel({ "day": "", "clicks": 0 });
        var trendRows = arrayOf(TrendModel);
        $app.db().newQuery(`
            SELECT substr(ad.day, 1, 10) AS day,
                   COALESCE(SUM(ad.count), 0) AS clicks
            FROM analytics_daily ad INDEXED BY idx_analytics_daily_link_day
            WHERE ad.link_id IN (
                SELECT id
                FROM links INDEXED BY idx_links_user
                WHERE user_id = {:userId}
            )
              AND ad.day >= {:startDay}
            GROUP BY substr(ad.day, 1, 10)
            ORDER BY day ASC
        `).bind({ userId: userId, startDay: startDay }).all(trendRows);

        var LinkModel = new DynamicModel({ "id": "" });
        var linkRows = arrayOf(LinkModel);
        $app.db().newQuery(`
            SELECT id
            FROM links INDEXED BY idx_links_user
            WHERE user_id = {:userId}
        `).bind({ userId: userId }).all(linkRows);

        var recent = [];
        if (linkRows.length > 0) {
            var params = {};
            var perLinkQueries = [];
            for (var i = 0; i < linkRows.length; i++) {
                var linkParam = "adminLink" + i;
                params[linkParam] = linkRows[i].id;
                perLinkQueries.push(
                    "SELECT * FROM (" +
                    "SELECT c.id, c.country, c.os, c.created " +
                    "FROM clicks c INDEXED BY idx_clicks_link_created " +
                    "WHERE c.link_id = {:" + linkParam + "} " +
                    "ORDER BY c.created DESC LIMIT 5" +
                    ")"
                );
            }

            var RecentModel = new DynamicModel({
                "id": "", "country": "", "os": "", "created": ""
            });
            var recentRows = arrayOf(RecentModel);
            $app.db().newQuery(
                "SELECT id, country, os, created FROM (" +
                perLinkQueries.join(" UNION ALL ") +
                ") ORDER BY created DESC LIMIT 5"
            ).bind(params).all(recentRows);

            for (var j = 0; j < recentRows.length; j++) {
                recent.push({
                    id: recentRows[j].id,
                    country: recentRows[j].country,
                    os: recentRows[j].os,
                    created: recentRows[j].created
                });
            }
        }

        var trend = [];
        for (var k = 0; k < trendRows.length; k++) {
            trend.push({
                date: trendRows[k].day,
                clicks: Number(trendRows[k].clicks || 0)
            });
        }

        return c.json(200, {
            data: {
                total_clicks: Number(totalRow.total || 0),
                recent: recent,
                trend: trend
            },
            request_id: requestId
        });
    } catch (err) {
        $app.logger().error("Admin user activity failed request_id=" + requestId + ": " + err);
        c.response.header().add("Cache-Control", "no-store");
        return c.json(500, {
            error: { code: "internal_error", message: "Unable to load user activity." },
            request_id: requestId
        });
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
        throw new BadRequestError("Unable to update this plan right now.");
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
        throw new BadRequestError("Unable to update this route override right now.");
    }
});

// Admin: create an affiliate promocode and bind it to an account by id or email.
// Creation is server-owned so commission and reward invariants cannot be bypassed
// with a direct PocketBase collection request.
routerAdd("POST", "/api/admin/promocodes", (c) => {
    var utils = require(__hooks + '/utils.js');
    try {
        var admin = c.auth;
        if (!admin || admin.get("role") !== "admin") {
            throw new ForbiddenError("Only admins can create affiliate offers.");
        }

        var data = new DynamicModel({
            "code": "",
            "internal_name": "",
            "partner_identifier": "",
            "max_uses": 0,
            "reward_enabled": false,
            "reward_plan": "",
            "reward_days": 0,
            "commission_rate_bps": 0
        });
        c.bindBody(data);

        var code = String(data.code || "").trim().toUpperCase();
        var internalName = String(data.internal_name || "").trim().substring(0, 120);
        var partnerIdentifier = String(data.partner_identifier || "").trim();
        var maxUses = Math.max(0, parseInt(data.max_uses, 10) || 0);
        var rewardEnabled = data.reward_enabled === true;
        var rewardPlan = rewardEnabled ? String(data.reward_plan || "").toLowerCase() : "creator";
        var rewardDays = rewardEnabled ? Math.max(0, parseInt(data.reward_days, 10) || 0) : 0;
        var commissionRateBps = parseInt(data.commission_rate_bps, 10);

        if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) {
            throw new BadRequestError("Code must be 3-32 characters and use only letters, numbers, underscores, or hyphens.");
        }
        if (!partnerIdentifier) {
            throw new BadRequestError("Partner user ID or email is required.");
        }
        if (maxUses > 1000000) {
            throw new BadRequestError("Usage limit is too high.");
        }
        if (rewardEnabled && rewardPlan !== "pro" && rewardPlan !== "agency") {
            throw new BadRequestError("Choose Pro or Agency for the signup reward.");
        }
        if (rewardEnabled && (rewardDays < 1 || rewardDays > 1095)) {
            throw new BadRequestError("Reward duration must be between 1 and 1095 days.");
        }
        if (!isFinite(commissionRateBps) || commissionRateBps < 0 || commissionRateBps > 10000) {
            throw new BadRequestError("Commission must be between 0% and 100%.");
        }

        var partnerUser = null;
        try {
            partnerUser = $app.findRecordById("users", partnerIdentifier);
        } catch (idError) {
            try {
                partnerUser = $app.findFirstRecordByFilter(
                    "users",
                    "email = {:email}",
                    { email: partnerIdentifier.toLowerCase() }
                );
            } catch (emailError) { }
        }
        if (!partnerUser || partnerUser.get("banned") === true) {
            throw new BadRequestError("Partner account was not found or is unavailable.");
        }

        var createdPromoId = "";
        $app.runInTransaction((txApp) => {
            var txPartnerUser = txApp.findRecordById("users", partnerUser.id);
            var affiliatePartner = utils.ensureAffiliatePartner(txApp, txPartnerUser);
            var collection = txApp.findCollectionByNameOrId("promocodes");
            var promo = new Record(collection, {
                "code": code,
                "internal_name": internalName,
                "partner_id": txPartnerUser.id,
                "max_uses": maxUses,
                "current_uses": 0,
                "reward_enabled": rewardEnabled,
                "reward_plan": rewardPlan,
                "reward_months": 0,
                "reward_days": rewardDays,
                "commission_rate_bps": commissionRateBps,
                "is_active": true
            });
            txApp.save(promo);
            createdPromoId = promo.id;

            if (!affiliatePartner.get("primary_promocode_id")) {
                affiliatePartner.set("primary_promocode_id", promo.id);
                affiliatePartner.set("default_commission_rate_bps", commissionRateBps);
                txApp.save(affiliatePartner);
            }
        });

        var createdPromo = $app.findRecordById("promocodes", createdPromoId);
        return c.json(201, {
            id: createdPromo.id,
            code: createdPromo.get("code"),
            partner_id: partnerUser.id,
            partner_email: partnerUser.email(),
            commission_rate_bps: commissionRateBps
        });
    } catch (error) {
        if (error instanceof BadRequestError || error instanceof ForbiddenError) throw error;
        $app.logger().error("Affiliate promocode creation failed: " + error);
        throw new BadRequestError("We couldn't create this affiliate offer. Check the details and try again.");
    }
});

// Public referral-code validation. The response intentionally contains no
// account metadata, which prevents referral URLs from becoming a user lookup.
routerAdd("GET", "/api/affiliate/referral/{code}", (c) => {
    var utils = require(__hooks + '/utils.js');
    try {
        var code = utils.normalizeAffiliateCode(c.request.pathValue("code"));
        if (!code) return c.json(404, { valid: false });

        var partner = $app.findFirstRecordByFilter(
            "affiliate_partners",
            "referral_code = {:code} && status = 'active'",
            { code: code }
        );
        var partnerUser = $app.findRecordById("users", partner.get("user_id"));
        if (partnerUser.get("banned") === true) return c.json(404, { valid: false });
        return c.json(200, { valid: true, code: code });
    } catch (error) {
        return c.json(404, { valid: false });
    }
});

// First-touch referral claim. It only accepts recently created accounts and
// never overwrites an existing attribution.
routerAdd("POST", "/api/affiliate/claim", (c) => {
    var utils = require(__hooks + '/utils.js');
    try {
        var user = c.auth;
        if (!user || user.collection().name !== "users") {
            return c.json(401, { success: false, error: "Unauthorized" });
        }

        var data = new DynamicModel({ "code": "" });
        c.bindBody(data);
        var code = utils.normalizeAffiliateCode(data.code);
        if (!code) throw new BadRequestError("Invalid referral link.");
        if (utils.getAccountAgeMs(user) > 24 * 60 * 60 * 1000) {
            throw new BadRequestError("This referral link is only available to new accounts.");
        }

        var partnerRecord = $app.findFirstRecordByFilter(
            "affiliate_partners",
            "referral_code = {:code} && status = 'active'",
            { code: code }
        );
        var partnerUser = $app.findRecordById("users", partnerRecord.get("user_id"));
        if (partnerUser.get("banned") === true) throw new BadRequestError("Invalid referral link.");

        var attributionId = "";
        var wasCreated = false;
        $app.runInTransaction((txApp) => {
            var result = utils.createAffiliateAttribution(txApp, {
                partnerId: partnerUser.id,
                referredUserId: user.id,
                promocodeId: partnerRecord.get("primary_promocode_id") || "",
                source: "referral_link",
                referralCode: code,
                commissionRateBps: partnerRecord.get("default_commission_rate_bps") || 0,
                commissionEligible: true
            });
            attributionId = result.record.id;
            wasCreated = result.created;
        });

        return c.json(200, {
            success: true,
            attributed: wasCreated,
            attribution_id: attributionId
        });
    } catch (error) {
        var message = String((error && error.message) || "");
        if (message !== "This referral link is only available to new accounts." &&
            message !== "You cannot use your own affiliate offer") {
            message = "This referral link is invalid or no longer active.";
        }
        return c.json(400, { success: false, error: message });
    }
});

// Lightweight eligibility endpoint used to conditionally expose the sidebar
// item. A partner record is provisioned lazily for every account, giving every
// user a stable personal referral URL without occupying the root slug namespace.
routerAdd("GET", "/api/affiliate/status", (c) => {
    var utils = require(__hooks + '/utils.js');
    var user = c.auth;
    if (!user || user.collection().name !== "users") {
        return c.json(401, { error: "Unauthorized" });
    }

    try {
        var partner = utils.ensureAffiliatePartner($app, user);
        var activeCodes = $app.findRecordsByFilter(
            "promocodes",
            "partner_id = {:userId} && is_active = true",
            "-created",
            1,
            0,
            { userId: user.id }
        );
        return c.json(200, {
            eligible: activeCodes.length > 0,
            referral_code: partner.get("referral_code"),
            referral_url: "https://linktery.com/ref/" + partner.get("referral_code")
        });
    } catch (error) {
        $app.logger().error("Affiliate status failed for user " + user.id + ": " + error);
        return c.json(500, { error: "Partner status is temporarily unavailable." });
    }
});

routerAdd("GET", "/api/affiliate/overview", (c) => {
    var utils = require(__hooks + '/utils.js');
    var user = c.auth;
    if (!user || user.collection().name !== "users") {
        return c.json(401, { error: "Unauthorized" });
    }

    try {
        var partner = utils.ensureAffiliatePartner($app, user);
        var promoRecords = $app.findRecordsByFilter(
            "promocodes",
            "partner_id = {:userId}",
            "-created",
            100,
            0,
            { userId: user.id }
        );
        var codes = [];
        for (var i = 0; i < promoRecords.length; i++) {
            var promo = promoRecords[i];
            codes.push({
                id: promo.id,
                code: promo.get("code"),
                name: promo.get("internal_name") || "",
                active: promo.get("is_active") === true,
                current_uses: promo.get("current_uses") || 0,
                max_uses: promo.get("max_uses") || 0,
                commission_rate_bps: promo.get("commission_rate_bps") || 0,
                reward_enabled: promo.get("reward_enabled") === true,
                reward_plan: promo.get("reward_plan") || "",
                reward_days: (parseInt(promo.get("reward_days")) || 0) ||
                    ((parseInt(promo.get("reward_months")) || 0) * 30)
            });
        }

        var planRows = arrayOf(new DynamicModel({
            total: 0,
            creator: 0,
            pro: 0,
            agency: 0
        }));
        $app.db().newQuery(`
            SELECT
                count(*) AS total,
                coalesce(sum(CASE
                    WHEN coalesce(nullif(u.plan, ''), 'creator') = 'creator'
                    THEN 1 ELSE 0
                END), 0) AS creator,
                coalesce(sum(CASE WHEN u.plan = 'pro' THEN 1 ELSE 0 END), 0) AS pro,
                coalesce(sum(CASE WHEN u.plan = 'agency' THEN 1 ELSE 0 END), 0) AS agency
            FROM affiliate_attributions a
            JOIN users u ON u.id = a.referred_user_id
            WHERE a.partner_id = {:partnerId}
        `).bind({ partnerId: user.id }).all(planRows);
        var plans = planRows.length > 0 ? planRows[0] : { total: 0, creator: 0, pro: 0, agency: 0 };

        var moneyRows = arrayOf(new DynamicModel({
            earned_cents: 0,
            matured_cents: 0,
            commission_payments: 0,
            renewal_payments: 0
        }));
        $app.db().newQuery(`
            SELECT
                coalesce(sum(CASE WHEN status != 'reversed' THEN commission_cents ELSE 0 END), 0) AS earned_cents,
                coalesce(sum(CASE
                    WHEN status IN ('pending', 'approved')
                      AND available_at != '' AND available_at <= datetime('now')
                    THEN commission_cents ELSE 0
                END), 0) AS matured_cents,
                coalesce(sum(CASE WHEN status != 'reversed' THEN 1 ELSE 0 END), 0) AS commission_payments,
                coalesce(sum(CASE
                    WHEN status != 'reversed' AND commission_type = 'renewal'
                    THEN 1 ELSE 0
                END), 0) AS renewal_payments
            FROM affiliate_commissions
            WHERE partner_id = {:partnerId}
        `).bind({ partnerId: user.id }).all(moneyRows);

        var paidRows = arrayOf(new DynamicModel({
            paid_cents: 0
        }));
        $app.db().newQuery(`
            SELECT coalesce(sum(
                CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END
            ), 0) AS paid_cents
            FROM affiliate_payouts
            WHERE partner_id = {:partnerId}
        `).bind({ partnerId: user.id }).all(paidRows);

        var recentRows = arrayOf(new DynamicModel({
            id: "",
            plan: "",
            source: "",
            status: "",
            created: ""
        }));
        $app.db().newQuery(`
            SELECT a.id, coalesce(nullif(u.plan, ''), 'creator') AS plan,
                   a.source, a.status, a.created
            FROM affiliate_attributions a
            JOIN users u ON u.id = a.referred_user_id
            WHERE a.partner_id = {:partnerId}
            ORDER BY a.created DESC
            LIMIT 8
        `).bind({ partnerId: user.id }).all(recentRows);
        var recent = [];
        for (var j = 0; j < recentRows.length; j++) {
            recent.push({
                id: recentRows[j].id,
                plan: recentRows[j].plan,
                source: recentRows[j].source,
                status: recentRows[j].status,
                created: recentRows[j].created
            });
        }

        var earnedCents = Number(moneyRows.length ? moneyRows[0].earned_cents : 0);
        var maturedCents = Number(moneyRows.length ? moneyRows[0].matured_cents : 0);
        var paidCents = Number(paidRows.length ? paidRows[0].paid_cents : 0);

        return c.json(200, {
            eligible: codes.some(function (item) { return item.active; }),
            referral_code: partner.get("referral_code"),
            referral_url: "https://linktery.com/ref/" + partner.get("referral_code"),
            default_commission_rate_bps: partner.get("default_commission_rate_bps") || 0,
            stats: {
                total_activated: Number(plans.total || 0),
                creator: Number(plans.creator || 0),
                pro: Number(plans.pro || 0),
                agency: Number(plans.agency || 0),
                pending_cents: Math.max(0, earnedCents - paidCents),
                available_cents: Math.max(0, maturedCents - paidCents),
                paid_cents: paidCents,
                commission_payments: Number(moneyRows.length ? moneyRows[0].commission_payments : 0),
                renewal_payments: Number(moneyRows.length ? moneyRows[0].renewal_payments : 0),
                currency: "USD"
            },
            codes: codes,
            recent_referrals: recent
        });
    } catch (error) {
        $app.logger().error("Affiliate overview failed for user " + user.id + ": " + error);
        return c.json(500, { error: "Partner analytics are temporarily unavailable." });
    }
});

// Admin payout ledger. It can only consume commission that has passed the
// refund hold, and the availability check is repeated inside the transaction.
routerAdd("POST", "/api/admin/affiliate/payouts", (c) => {
    try {
        var admin = c.auth;
        if (!admin || admin.get("role") !== "admin") {
            throw new ForbiddenError("Only admins can record affiliate payouts.");
        }

        var data = new DynamicModel({
            "partner_identifier": "",
            "amount_cents": 0,
            "reference": "",
            "note": ""
        });
        c.bindBody(data);
        var identifier = String(data.partner_identifier || "").trim();
        var amountCents = parseInt(data.amount_cents, 10) || 0;
        var reference = String(data.reference || "").trim().substring(0, 255);
        var note = String(data.note || "").trim().substring(0, 500);
        if (!identifier || amountCents <= 0 || !reference) {
            throw new BadRequestError("Partner, positive payout amount, and a unique payment reference are required.");
        }

        var partnerUser = null;
        try {
            partnerUser = $app.findRecordById("users", identifier);
        } catch (idError) {
            try {
                partnerUser = $app.findFirstRecordByFilter(
                    "users",
                    "email = {:email}",
                    { email: identifier.toLowerCase() }
                );
            } catch (emailError) { }
        }
        if (!partnerUser) throw new BadRequestError("Partner account was not found.");

        var payoutId = "";
        $app.runInTransaction((txApp) => {
            var totals = arrayOf(new DynamicModel({
                matured_cents: 0,
                paid_cents: 0
            }));
            txApp.db().newQuery(`
                SELECT
                    (
                        SELECT coalesce(sum(commission_cents), 0)
                        FROM affiliate_commissions
                        WHERE partner_id = {:partnerId}
                          AND status IN ('pending', 'approved')
                          AND available_at != ''
                          AND available_at <= datetime('now')
                    ) AS matured_cents,
                    (
                        SELECT coalesce(sum(amount_cents), 0)
                        FROM affiliate_payouts
                        WHERE partner_id = {:partnerId} AND status = 'paid'
                    ) AS paid_cents
            `).bind({ partnerId: partnerUser.id }).all(totals);
            var available = Math.max(
                0,
                Number(totals.length ? totals[0].matured_cents : 0) -
                Number(totals.length ? totals[0].paid_cents : 0)
            );
            if (amountCents > available) {
                throw new BadRequestError("Payout exceeds the partner's available balance.");
            }

            var collection = txApp.findCollectionByNameOrId("affiliate_payouts");
            var payout = new Record(collection, {
                "partner_id": partnerUser.id,
                "amount_cents": amountCents,
                "currency": "USD",
                "status": "paid",
                "reference": reference,
                "note": note,
                "paid_at": new DateTime()
            });
            txApp.save(payout);
            payoutId = payout.id;
        });

        return c.json(201, {
            success: true,
            id: payoutId,
            amount_cents: amountCents,
            currency: "USD"
        });
    } catch (error) {
        if (error instanceof BadRequestError || error instanceof ForbiddenError) throw error;
        $app.logger().error("Affiliate payout creation failed: " + error);
        throw new BadRequestError("We couldn't record this payout.");
    }
});

// Promocodes: Validate (Public)
routerAdd("POST", "/api/promocodes/validate", (c) => {
    var utils = require(__hooks + '/utils.js');
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
            reward_enabled: promo.get("reward_enabled") === true,
            plan: promo.get("reward_plan"),
            months: 0,
            days: (parseInt(promo.get("reward_days")) || 0) ||
                ((parseInt(promo.get("reward_months")) || 0) * 30)
        });
    } catch (err) {
        const safeError = utils.getSafePromocodeError(err);
        if (safeError !== String((err && err.message) || "")) {
            $app.logger().error("Promocode validation error: " + err);
        }
        return c.json(400, { valid: false, error: safeError });
    }
});

// Promocodes: Apply (Auth required)
routerAdd("POST", "/api/promocodes/apply", (c) => {
    var utils = require(__hooks + '/utils.js');
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

        const partnerId = promo.get("partner_id") || "";

        if (partnerId && partnerId === user.id) {
            throw new BadRequestError("You cannot use your own affiliate offer");
        }
        if (partnerId && utils.getAccountAgeMs(user) > 24 * 60 * 60 * 1000) {
            throw new BadRequestError("This affiliate offer is only available to new accounts");
        }

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

            const txRewardPlan = txPromo.get("reward_plan") || "creator";
            const txRewardDays = (parseInt(txPromo.get("reward_days")) || 0) ||
                ((parseInt(txPromo.get("reward_months")) || 0) * 30);
            const txRewardEnabled = txPromo.get("reward_enabled") === true;
            const txPartnerId = txPromo.get("partner_id") || "";
            if (txPartnerId && txPartnerId === txUser.id) {
                throw new BadRequestError("You cannot use your own affiliate offer");
            }
            if (txPartnerId && utils.getAccountAgeMs(txUser) > 24 * 60 * 60 * 1000) {
                throw new BadRequestError("This affiliate offer is only available to new accounts");
            }

            const currentPlan = txUser.get("plan") || "creator";
            const now = new DateTime();

            if (txRewardEnabled) {
                if (txRewardDays < 1 || txRewardDays > 1095) {
                    throw new BadRequestError("Invalid reward duration");
                }

                // Validation hierarchy: agency > pro > creator
                const planWeights = { "creator": 0, "pro": 1, "agency": 2 };
                const currentWeight = planWeights[currentPlan] || 0;
                const rewardWeight = planWeights[txRewardPlan] || 0;

                if (currentWeight > rewardWeight) {
                    throw new BadRequestError("Your current " + currentPlan + " plan is higher than the " + txRewardPlan + " reward");
                }
                if (currentWeight === rewardWeight && currentPlan !== "creator") {
                    throw new BadRequestError("You already have the " + currentPlan + " plan");
                }

                if (currentPlan !== "creator") {
                    txUser.set("fallback_plan", currentPlan);
                    txUser.set("fallback_expires_at", txUser.get("plan_expires_at"));
                }

                const expiry = now.addDate(0, 0, txRewardDays);
                txUser.set("plan", txRewardPlan);
                txUser.set("plan_expires_at", expiry);

                const billingColl = txApp.findCollectionByNameOrId("billing");
                const b = new Record(billingColl, {
                    "user_id": txUser.id,
                    "plan": txRewardPlan,
                    "amount": 0,
                    "status": "active",
                    "payment_method": "Free Trial",
                    "period_start": now,
                    "end_date": expiry
                });
                txApp.save(b);
            }

            txUser.set("promocode_used", txPromo.id);
            txApp.save(txUser);

            // Update promo count
            txPromo.set("current_uses", txCurrentUses + 1);
            txApp.save(txPromo);

            // Create log
            const logsColl = txApp.findCollectionByNameOrId("promocode_logs");
            const log = new Record(logsColl, {
                "promocode_id": txPromo.id,
                "user_id": txUser.id,
                "plan_awarded": txRewardEnabled ? txRewardPlan : "",
                "days_awarded": txRewardEnabled ? txRewardDays : 0
            });
            txApp.save(log);

            if (txPartnerId) {
                utils.createAffiliateAttribution(txApp, {
                    partnerId: txPartnerId,
                    referredUserId: txUser.id,
                    promocodeId: txPromo.id,
                    source: "promocode",
                    referralCode: txPromo.get("code"),
                    commissionRateBps: txPromo.get("commission_rate_bps") || 0,
                    commissionEligible: true
                });
            }

            txMessage = txRewardEnabled
                ? "Promocode applied: " + txRewardDays + " day" + (txRewardDays === 1 ? "" : "s") + " of " + txRewardPlan + "!"
                : "Promocode activated successfully.";
        });

        $app.logger().info("Promocode " + code + " applied successfully by user " + user.id);
        return c.json(200, { success: true, message: txMessage });
    } catch (err) {
        const safeError = utils.getSafePromocodeError(err);
        if (safeError !== String((err && err.message) || "")) {
            $app.logger().error("Promocode application error: " + err);
        }
        return c.json(400, { success: false, error: safeError });
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
        utils.enforceLinkCreateOwnershipAndEntitlements(
            $app,
            e.record,
            authInfo.authUserId,
            authInfo.isAdmin
        );
    } catch (err) {
        if (err instanceof BadRequestError || err instanceof ForbiddenError) {
            throw err;
        }
        $app.logger().error("Link entitlement validation failed: " + err + " stack=" + (err.stack || "none"));
        throw new BadRequestError("We couldn't validate this link. Please review its settings and try again.");
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
    const authInfo = utils.getAuthInfo(e);
    utils.sanitizeLinkSystemFields(e.record, authInfo.isAdmin);
    utils.validateLinkRecordForMutation($app, e.record);
    e.next();
}, "links");

// Parasite & XSS Patch for Link Creation
onRecordCreateRequest((e) => {
    try {
        const utils = require(__hooks + '/utils.js');
        var authInfo = utils.getAuthInfo(e);
        utils.sanitizeLinkSystemFields(e.record, authInfo.isAdmin);
        utils.validateLinkRecordForMutation($app, e.record);
    } catch (err) {
        if (err instanceof BadRequestError) {
            throw err;
        }
        $app.logger().error("Link safety validation failed: " + err + " stack=" + (err.stack || "none"));
        throw new BadRequestError("We couldn't validate this link destination. Please review it and try again.");
    }
    e.next();
}, "links");

// Public Profile composition records never alter redirect or analytics data.
// They only control placement and presentation of an existing core Link.
onRecordCreateRequest((e) => {
    try {
        const utils = require(__hooks + '/utils.js');
        utils.validateProfileLinkComposition(e.record, utils.getAuthInfo(e));
    } catch (err) {
        if (err instanceof BadRequestError || err instanceof ForbiddenError) throw err;
        throw new BadRequestError("Unable to add the Link to this Public Profile.");
    }
    e.next();
}, "profile_links");

onRecordUpdateRequest((e) => {
    try {
        const utils = require(__hooks + '/utils.js');
        utils.validateProfileLinkComposition(e.record, utils.getAuthInfo(e));
    } catch (err) {
        if (err instanceof BadRequestError || err instanceof ForbiddenError) throw err;
        throw new BadRequestError("Unable to update this profile Link.");
    }
    e.next();
}, "profile_links");

onRecordsListRequest((e) => {
    try {
        const utils = require(__hooks + '/utils.js');
        var authInfo = utils.getAuthInfo(e);
        utils.assertSafePublicListFilter(e, "profile_links", authInfo);
    } catch (err) {
        if (err instanceof BadRequestError) throw err;
        $app.logger().error("Error in profile_links list hook: " + err);
        throw new BadRequestError("Unable to validate profile Link list request.");
    }
    return e.next();
}, "profile_links");

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

        const slug = utils.validatePublicSlug(e.record.get("slug"));
        e.record.set("slug", slug);
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
        utils.validateProfilePresentation(e.record);
    } catch (err) {
        if (err instanceof BadRequestError) {
            throw err;
        }
        $app.logger().error("Profile create validation failed: " + err + " stack=" + (err.stack || "none"));
        throw new BadRequestError("We couldn't validate this Public Profile. Please review its settings and try again.");
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
        const normalizedSlug = utils.validatePublicSlug(e.record.get("slug"));
        e.record.set("slug", normalizedSlug);
        utils.validateProfileSocialLinks(e.record);
        utils.validateProfileTemplate(e.record);
        utils.validateProfilePresentation(e.record);
    } catch (err) {
        if (err instanceof BadRequestError) {
            throw err;
        }
        $app.logger().error("Profile update validation failed: " + err + " stack=" + (err.stack || "none"));
        throw new BadRequestError("We couldn't validate these Public Profile changes. Please review them and try again.");
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
        $app.logger().error("Admin promocode users endpoint failed: " + e + " stack=" + (e.stack || "none"));
        return c.json(500, { error: "Unable to load promocode users." });
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
        $app.logger().error("Admin promocode payments endpoint failed: " + e + " stack=" + (e.stack || "none"));
        return c.json(500, { error: "Unable to load promocode payments." });
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
        var startedAt = new Date().getTime();
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

        var trend = [];
        for (var i = 0; i < trendRows.length; i++) {
            trend.push({ day: trendRows[i].day, clicks: trendRows[i].clicks || 0 });
        }

        var response = {
            totalClicks: summary.total_clicks || 0,
            activeLinks: summary.active_links || 0,
            totalLinks: summary.total_links || 0,
            trend: trend,
            // Kept for compatibility with a frontend/backend rolling deploy.
            // Recent activity now loads independently and cannot block metrics.
            recent: [],
            queryMs: new Date().getTime() - startedAt
        };
        utils.setAnalyticsCache(cacheKey, response, 30000);
        if (response.queryMs > 500) {
            $app.logger().warn("Slow dashboard summary user=" + user.id + " durationMs=" + response.queryMs);
        }
        return c.json(200, response);
    } catch (e) {
        $app.logger().error("Dashboard summary API error: " + e.toString());
        return c.json(500, { message: "Dashboard summary query failed." });
    }
});

// Recent dashboard activity is intentionally independent from the summary.
// Each link contributes at most five index-ordered rows, then the small result
// sets are merged. Work is bounded by the user's link allowance rather than by
// the global clicks table or the user's complete click history.
routerAdd("GET", "/api/dashboard/recent", (c) => {
    try {
        var utils = require(__hooks + '/utils.js');
        var startedAt = new Date().getTime();
        var user = c.auth;
        if (!user || user.collection().name !== "users") return c.json(401, { message: "Unauthorized" });

        var cacheKey = "dashboard-recent|" + user.id;
        var cached = utils.getAnalyticsCache(cacheKey);
        if (cached) return c.json(200, cached);

        var LinkModel = new DynamicModel({ "id": "", "slug": "" });
        var links = arrayOf(LinkModel);
        $app.db().newQuery(`
            SELECT id, slug
            FROM links INDEXED BY idx_links_user
            WHERE user_id = {:userId}
        `).bind({ userId: user.id }).all(links);

        if (links.length === 0) {
            var emptyResponse = { items: [], queryMs: new Date().getTime() - startedAt };
            utils.setAnalyticsCache(cacheKey, emptyResponse, 15000);
            return c.json(200, emptyResponse);
        }

        var params = {};
        var perLinkQueries = [];
        for (var i = 0; i < links.length; i++) {
            var linkParam = "link" + i;
            var slugParam = "slug" + i;
            params[linkParam] = links[i].id;
            params[slugParam] = links[i].slug;
            perLinkQueries.push(
                "SELECT * FROM (" +
                "SELECT {:" + slugParam + "} AS slug, c.country, c.device, c.created " +
                "FROM clicks c INDEXED BY idx_clicks_link_created " +
                "WHERE c.link_id = {:" + linkParam + "} " +
                "ORDER BY c.created DESC LIMIT 5" +
                ")"
            );
        }

        var RecentModel = new DynamicModel({ "slug": "", "country": "", "device": "", "created": "" });
        var rows = arrayOf(RecentModel);
        var sql = "SELECT slug, country, device, created FROM (" +
            perLinkQueries.join(" UNION ALL ") +
            ") ORDER BY created DESC LIMIT 5";
        $app.db().newQuery(sql).bind(params).all(rows);

        var items = [];
        for (var j = 0; j < rows.length; j++) {
            items.push({
                slug: rows[j].slug,
                country: rows[j].country,
                device: rows[j].device,
                created: rows[j].created
            });
        }

        var response = {
            items: items,
            queryMs: new Date().getTime() - startedAt
        };
        utils.setAnalyticsCache(cacheKey, response, 15000);
        if (response.queryMs > 500) {
            $app.logger().warn("Slow dashboard recent user=" + user.id + " links=" + links.length + " durationMs=" + response.queryMs);
        }
        return c.json(200, response);
    } catch (e) {
        $app.logger().error("Dashboard recent API error: " + e.toString());
        return c.json(500, { message: "Recent dashboard activity failed." });
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
        return c.json(500, { error: "Analytics are temporarily unavailable. Please try again." });
    }
});

console.log("End of script. globalThis has getAuthInfo?", typeof globalThis.getAuthInfo, "Keys:", Object.keys(globalThis));
