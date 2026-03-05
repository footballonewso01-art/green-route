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
        // If geo-targeting, device-targeting, split testing, or interstitial is enabled,
        // we let the React frontend handle it for full feature support (browser detection, etc.)
        const hasComplexLogic =
            link.get("geo_targeting") ||
            link.get("device_targeting") ||
            link.get("ab_split") ||
            link.get("interstitial_enabled");

        if (!hasComplexLogic) {
            // HIGH-PERFORMANCE ANALYTICS TRACKING
            try {
                const request = c.request();
                const uaStr = request.header.get("User-Agent") || "";

                // Bot detection
                const isBot = /bot|crawler|spider|criteo|facebookexternalhit|google|bing|twitter|linkedin|instagram|tiktok/i.test(uaStr);

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
                "amount": newPlan === "pro" ? 15 : 29,
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
