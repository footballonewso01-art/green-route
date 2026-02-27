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
    try {
        const userWithSameName = $app.dao().findFirstRecordByFilter("users", "username = {:slug}", { slug: slug });
        if (userWithSameName) {
            throw new BadRequestError("This slug is already taken by a user profile.");
        }
    } catch (err) {
        if (err.status !== 404) throw err;
    }

    // B. Enforce Plan Limits
    const user = $app.dao().findRecordById("users", userId);
    const plan = user.get("plan") || "creator";
    const linksCount = $app.dao().countRecords("links", $expr.condition("user_id", "=", userId));

    const limits = {
        "creator": 4,
        "pro": 15,
        "agency": -1
    };

    const maxLinks = limits[plan];
    if (maxLinks !== -1 && linksCount >= maxLinks) {
        throw new BadRequestError("You have reached the link limit for your " + plan + " plan. Please upgrade to create more.");
    }
}, "links");

// 3. Username Protection against existing Slugs
onRecordBeforeUpdateRequest((e) => {
    if (e.collection.name !== "users") return;

    const newUsername = e.record.get("username");
    const oldUsername = e.record.originalCopy().get("username");

    if (newUsername !== oldUsername) {
        try {
            const linkWithSameSlug = $app.dao().findFirstRecordByFilter("links", "slug = {:username}", { username: newUsername });
            if (linkWithSameSlug) {
                throw new BadRequestError("This username matches an existing link slug.");
            }
        } catch (err) {
            if (err.status !== 404) throw err;
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
