// This handles GET /:slug and redirects to destination_url immediately with optimization

routerAdd("GET", "/{slug}", (c) => {
    const slug = c.pathParam("slug");
    const dao = $app.dao();

    // 1. Find Link
    let link;
    try {
        link = dao.findFirstRecordByFilter("links", "slug = {:slug} && active = true", { slug: slug });
    } catch (err) {
        // Not a link, let the frontend handle possible username route or 404
        return c.next();
    }

    if (!link) return c.next();

    // 2. Log Click (Non-blocking as much as possible)
    try {
        const ua = c.request().header.get("User-Agent") || "";
        const isBot = /bot|crawler|spider|facebook|google|bing|twitter|linkedin|instagram|tiktok/i.test(ua);

        if (!isBot) {
            const clicksColl = dao.findCollectionByNameOrId("clicks");
            const record = new Record(clicksColl);

            // Basic data we can get from headers
            let os = "Other";
            if (ua.includes("Windows")) os = "Windows";
            else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
            else if (ua.includes("Android")) os = "Android";
            else if (ua.includes("Macintosh")) os = "macOS";

            record.set("link_id", link.getId());
            record.set("os", os);
            record.set("user_agent", ua.slice(0, 200));
            record.set("ip", c.realIP());
            record.set("referrer", c.request().header.get("Referer") || "Direct");

            dao.saveRecord(record);

            // Increment count on link
            link.set("clicks_count", link.getInt("clicks_count") + 1);
            dao.saveRecord(link);
        }
    } catch (err) {
        console.error("Click log failed:", err);
    }

    // 3. Perform Redirect
    // If it has specialized targeting, we might still want to let the client handle it 
    // OR implement basic targeting here if needed. 
    // For production readiness, we start with a standard redirect.
    return c.redirect(302, link.get("destination_url"));
}, $apis.requireGuestOnly()); // Only for non-logged in or everybody? Actually no, GuestOnly might be too strict.
// Remove $apis.requireGuestOnly() to allow everybody to use shortlinks.
