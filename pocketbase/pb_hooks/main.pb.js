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
