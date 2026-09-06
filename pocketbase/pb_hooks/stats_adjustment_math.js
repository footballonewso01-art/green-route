// Deterministic aggregate reconstruction. No visitor/IP records are generated.
var fail = function(message, status) { var e = new Error(message); e.status = status || 400; throw e; };
var allocate = function(total, weights) {
    if (!Number.isSafeInteger(total) || total < 0) fail("Invalid allocation total.");
    var sum = weights.reduce(function(a, b) { return a + Math.max(0, b); }, 0);
    if (!weights.length) { if (total) fail("No eligible resources in this date range."); return []; }
    var quotas = weights.map(function(w) { return total * (sum ? Math.max(0, w) / sum : 1 / weights.length); });
    var out = quotas.map(Math.floor);
    var left = total - out.reduce(function(a, b) { return a + b; }, 0);
    var order = quotas.map(function(q, i) { return { i: i, rest: q - out[i] }; });
    order.sort(function(a, b) { return b.rest - a.rest || a.i - b.i; });
    for (var i = 0; i < left; i++) out[order[i].i]++;
    return out;
};
var normalize = function(input, now) {
    if (input.mode !== "links" && input.mode !== "profile_views") fail("Choose link clicks or profile views.");
    var resource = String(input.resourceId || "all");
    if (resource !== "all" && !/^[a-z0-9]{15}$/.test(resource)) fail("Invalid resource.");
    var from = String(input.start || ""), to = String(input.end || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) fail("Choose both UTC dates.");
    var start = new Date(from + "T00:00:00Z"), end = new Date(to + "T00:00:00Z");
    if (!isFinite(start.getTime()) || !isFinite(end.getTime()) || start.toISOString().slice(0, 10) !== from || end.toISOString().slice(0, 10) !== to) fail("Invalid calendar date.");
    end = new Date(end.getTime() + 86400000);
    var today = new Date(now || Date.now()); today.setUTCHours(0, 0, 0, 0);
    if (end > today) fail("Use completed UTC days; today's traffic stays live.");
    if (start >= end || end.getTime() - start.getTime() > 90 * 86400000) fail("Choose a range of 1–90 completed days.");
    var total = Number(input.total), percent = Number(input.uniquePercent);
    if (!Number.isSafeInteger(total) || total < 0 || total > 10000000) fail("Total must be an integer from 0 to 10,000,000.");
    if (!Number.isFinite(percent) || percent < 75 || percent > 85) fail("Unique share must be between 75% and 85%.");
    var reason = String(input.reason || "").trim();
    if (reason.length < 8 || reason.length > 500) fail("Add an internal reason (8–500 characters).");
    var countries = String(input.countries || "").trim().toUpperCase();
    if (countries && !/^[A-Z]{2}(,\s*[A-Z]{2}){0,9}$/.test(countries)) fail("Use up to 10 comma-separated ISO country codes, for example US, GB, DE.");
    return { mode: input.mode, resourceId: resource, start: from, end: to, startAt: start.toISOString().replace('.000Z','Z'), endAt: end.toISOString().replace('.000Z','Z'), total: total, uniquePercent: percent, reason: reason, countries: countries };
};
var key = function(row) { return [row.kind, row.resource_id, row.profile_id || "", row.card_id || "", row.bucket, row.dimension_type, row.dimension_value].join("|"); };
var build = function(config, resources, before, attributed) {
    var kind = config.mode === "links" ? "link" : "view";
    var original = {}, desired = {}, totalById = {}, dimensions = {}, dayTotals = {};
    before.forEach(function(row) {
        original[key(row)] = row;
        if (row.dimension_type === "all") {
            totalById[row.resource_id] = (totalById[row.resource_id] || 0) + row.total;
            var dayKey = row.resource_id + "|" + row.bucket.slice(0,10);
            dayTotals[dayKey] = (dayTotals[dayKey] || 0) + row.total;
        } else {
            var dk = row.resource_id + "|" + row.dimension_type;
            if (!dimensions[dk]) dimensions[dk] = {};
            dimensions[dk][row.dimension_value] = (dimensions[dk][row.dimension_value] || 0) + row.total;
        }
    });
    var slots = [];
    var eligibleIds = [], ranges = [];
    resources.forEach(function(resource) {
        var since = Math.max(Date.parse(config.startAt), Math.floor(Date.parse(String(resource.created).replace(' ', 'T')) / 3600000) * 3600000);
        var first = slots.length;
        var days = Math.max(1, (Date.parse(config.endAt) - since) / 86400000);
        for (var time = since; time < Date.parse(config.endAt); time += 3600000) {
            var date = new Date(time), bucket = date.toISOString().replace('.000Z','Z');
            var observedDay = dayTotals[resource.id + "|" + bucket.slice(0,10)] || 0;
            var hash = 0, text = resource.id + bucket;
            for (var i = 0; i < text.length; i++) hash = (Math.imul(hash, 31) + text.charCodeAt(i)) >>> 0;
            var curve = 0.22 + 0.78 * Math.pow(Math.sin((date.getUTCHours() + 1) / 24 * Math.PI), 2);
            var dayRatio = totalById[resource.id] ? observedDay / (totalById[resource.id] / days) : 1;
            // Keep a useful activity signal without magnifying one old hour
            // into the entire corrected total. Every eligible day has weight.
            var weight = curve * (0.65 + 0.35 * Math.min(3, dayRatio)) * (0.7 + (hash % 601) / 1000);
            slots.push({ id: resource.id, bucket: bucket, weight: weight });
        }
        if (slots.length > first) { eligibleIds.push(resource.id); ranges.push({ first: first, end: slots.length }); }
    });
    if (slots.length > 20000) fail("This scope is too large. Select one resource or a shorter range.");
    var hasObserved = Object.keys(totalById).some(function(id) { return totalById[id] > 0; });
    var resourceAmounts = allocate(config.total, eligibleIds.map(function(id) { return hasObserved ? totalById[id] || 0 : 1; }));
    var amounts = [];
    ranges.forEach(function(range, i) {
        amounts = amounts.concat(allocate(resourceAmounts[i], slots.slice(range.first, range.end).map(function(slot) { return slot.weight; })));
    });
    var uniques = allocate(Math.round(config.total * config.uniquePercent / 100), amounts);
    var remainingDimensions = {};
    var put = function(row) { if (row.total || row.unique_count) desired[key(row)] = row; };
    var defaults = { country: { US: 40, GB: 22, DE: 16, CA: 12, NL: 10 }, device: { Mobile: 70, Desktop: 28, Tablet: 2 }, browser: { Chrome: 60, Safari: 32, Firefox: 8 }, os: { iOS: 40, Android: 35, Windows: 20, macOS: 5 }, referrer: { Direct: 100 } };
    slots.forEach(function(slot, index) {
        var count = amounts[index]; if (!count) return;
        var base = { kind: kind, resource_id: slot.id, profile_id: "", card_id: "", bucket: slot.bucket };
        put(Object.assign({}, base, { dimension_type: "all", dimension_value: "", total: count, unique_count: uniques[index] }));
        Object.keys(defaults).forEach(function(dimension) {
            var dimensionKey = slot.id + "|" + dimension;
            if (!remainingDimensions[dimensionKey]) {
                var weights = dimensions[dimensionKey] || defaults[dimension];
                if (!Object.keys(weights).some(function(name) { return weights[name] > 0; })) weights = defaults[dimension];
                if (dimension === "country" && config.countries) {
                    weights = {}; config.countries.split(/,\s*/).forEach(function(code, i) { weights[code] = 1 / (i + 1); });
                }
                var names = Object.keys(weights).sort();
                remainingDimensions[dimensionKey] = { names: names, counts: allocate(resourceAmounts[eligibleIds.indexOf(slot.id)], names.map(function(name) { return weights[name]; })) };
            }
            // Allocate from remaining integer quotas, avoiding a rounding bias
            // towards the leading country on every low-traffic hour.
            var remaining = remainingDimensions[dimensionKey], values = allocate(count, remaining.counts);
            remaining.names.forEach(function(name, i) {
                remaining.counts[i] -= values[i];
                put(Object.assign({}, base, { dimension_type: dimension, dimension_value: name, total: values[i], unique_count: 0 }));
            });
        });
    });
    // Card attribution is not all traffic. Preserve its observed per-link share,
    // distributing the resulting count over the same link-hour capacities.
    var groups = {};
    attributed.forEach(function(row) {
        original[key(row)] = row;
        if (!groups[row.resource_id]) groups[row.resource_id] = {};
        var group = row.profile_id + "|" + row.card_id;
        groups[row.resource_id][group] = (groups[row.resource_id][group] || 0) + row.total;
    });
    Object.keys(groups).forEach(function(id) {
        var names = Object.keys(groups[id]).sort(), weights = names.map(function(name) { return groups[id][name]; });
        var oldAttributed = weights.reduce(function(a, b) { return a + b; }, 0);
        if (oldAttributed > (totalById[id] || 0)) fail("Profile attribution exceeds link totals. Reconcile raw analytics before adjusting this resource.", 409);
        var matching = slots.map(function(slot, i) { return slot.id === id ? i : -1; }).filter(function(i) { return i >= 0; });
        var newTotal = matching.reduce(function(sum, i) { return sum + amounts[i]; }, 0);
        var attributedCount = Math.round(newTotal * oldAttributed / Math.max(1, totalById[id]));
        var counts = allocate(attributedCount, matching.map(function(i) { return amounts[i]; }));
        var capacities = matching.map(function(slotIndex, i) { return Math.min(counts[i], uniques[slotIndex]); });
        var uniqueCounts = allocate(Math.min(Math.round(attributedCount * config.uniquePercent / 100), capacities.reduce(function(a,b) { return a+b; },0)), capacities);
        matching.forEach(function(slotIndex, i) {
            var split = allocate(counts[i], weights), uniqueSplit = allocate(uniqueCounts[i], split);
            names.forEach(function(name, j) {
                var parts = name.split('|');
                put({ kind: "card", resource_id: id, profile_id: parts[0], card_id: parts[1], bucket: slots[slotIndex].bucket, dimension_type: "all", dimension_value: "", total: split[j], unique_count: uniqueSplit[j] });
            });
        });
    });
    var keys = Object.keys(Object.assign({}, original, desired)).sort(), deltas = [];
    keys.forEach(function(k) {
        var old = original[k], next = desired[k];
        var row = Object.assign({}, next || old, { total: (next ? next.total : 0) - (old ? old.total : 0), unique_count: (next ? next.unique_count : 0) - (old ? old.unique_count : 0) });
        if (row.total || row.unique_count) deltas.push(row);
    });
    if (deltas.length > 150000) fail("Too many aggregate rows. Select a smaller scope.");
    var trend = {}, countries = {}, oldTotal = 0;
    before.forEach(function(r) { if (r.dimension_type === "all") oldTotal += r.total; });
    Object.keys(desired).forEach(function(k) {
        var row = desired[k]; if (row.kind !== kind) return;
        if (row.dimension_type === "all") trend[row.bucket.slice(0,10)] = (trend[row.bucket.slice(0,10)] || 0) + row.total;
        if (row.dimension_type === "country") countries[row.dimension_value] = (countries[row.dimension_value] || 0) + row.total;
    });
    return { rows: deltas, summary: { before: oldTotal, after: config.total, unique: Math.round(config.total * config.uniquePercent / 100), resources: resources.length, trend: Object.keys(trend).sort().map(function(date) { return { date: date, clicks: trend[date] }; }), countries: Object.keys(countries).map(function(name) { return { name: name, clicks: countries[name] }; }).sort(function(a,b) { return b.clicks-a.clicks; }), estimated: !hasObserved, geographyEstimated: !!config.countries || !Object.keys(dimensions).some(function(k) { return k.indexOf('|country') !== -1; }) } };
};
module.exports = { allocate: allocate, normalize: normalize, build: build, fail: fail };
