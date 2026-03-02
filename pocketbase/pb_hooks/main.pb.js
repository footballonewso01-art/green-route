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

