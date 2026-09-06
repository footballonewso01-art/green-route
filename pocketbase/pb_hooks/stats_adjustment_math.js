// Seeded aggregate reconstruction. No visitor/IP records are generated.
var fail = function(message, status) { var e = new Error(message); e.status = status || 400; throw e; };
var clamp = function(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); };
// Small seeded PRNG used only to shape aggregate buckets. A seed makes one
// preview internally stable while allowing a newly generated preview to use a
// genuinely different traffic shape.
var randomSource = function(text) {
    var state = 2166136261;
    for (var i = 0; i < text.length; i++) state = Math.imul(state ^ text.charCodeAt(i), 16777619) >>> 0;
    if (!state) state = 0x6d2b79f5;
    return function() {
        state = (state + 0x6d2b79f5) >>> 0;
        var value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
};
var normalSample = function(random) {
    var first = Math.max(random(), 0.0000001);
    return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * random());
};
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
var allocateCapped = function(total, weights, maximum) {
    if (!weights.length) return allocate(total, weights);
    var cap = Math.max(Math.ceil(total / weights.length), Math.floor(maximum));
    var out = weights.map(function() { return 0; });
    var active = weights.map(function(_, i) { return i; }), remaining = total;
    while (active.length && remaining) {
        var proposed = allocate(remaining, active.map(function(i) { return weights[i]; }));
        var saturated = false;
        for (var i = active.length - 1; i >= 0; i--) {
            var index = active[i];
            if (proposed[i] > cap) {
                out[index] = cap;
                remaining -= cap;
                active.splice(i, 1);
                saturated = true;
            }
        }
        if (!saturated) {
            active.forEach(function(index, i) { out[index] = proposed[i]; });
            remaining = 0;
        }
    }
    if (remaining) fail("Traffic allocation exceeded hourly safety limits.");
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
    var seed = String(config.seed || [config.mode, config.resourceId, config.startAt, config.endAt].join("|"));
    resources.forEach(function(resource) {
        var since = Math.max(Date.parse(config.startAt), Math.floor(Date.parse(String(resource.created).replace(' ', 'T')) / 3600000) * 3600000);
        var first = slots.length;
        var days = Math.max(1, (Date.parse(config.endAt) - since) / 86400000);
        var random = randomSource(seed + "|" + resource.id);
        var currentDay = "", dayLevel = 0, hourLevel = 0, burstHours = 0, burstStrength = 1;
        var dayWeight = 1, primaryPeak = 14, secondaryPeak = 20, primaryWidth = 4, secondaryWidth = 3, primaryStrength = 1, secondaryStrength = 0.25;
        for (var time = since; time < Date.parse(config.endAt); time += 3600000) {
            var date = new Date(time), bucket = date.toISOString().replace('.000Z','Z');
            var day = bucket.slice(0,10);
            if (day !== currentDay) {
                currentDay = day;
                // A persistent latent level creates multi-day swells and dips
                // instead of returning to the same baseline every midnight.
                dayLevel = clamp(0.48 * dayLevel + 0.52 * normalSample(random), -0.95, 0.95);
                var observedDay = dayTotals[resource.id + "|" + day] || 0;
                var dayRatio = totalById[resource.id] ? observedDay / (totalById[resource.id] / days) : 1;
                dayWeight = Math.exp(dayLevel) * (0.52 + 0.48 * Math.min(3, dayRatio));
                // Peaks move independently from day to day. The second, weaker
                // peak prevents every day from having the same bell silhouette.
                primaryPeak = 7 + Math.floor(random() * 15);
                secondaryPeak = 5 + Math.floor(random() * 19);
                primaryWidth = 2.2 + random() * 3.8;
                secondaryWidth = 1.4 + random() * 3.6;
                primaryStrength = 0.75 + random() * 0.8;
                secondaryStrength = 0.12 + random() * 0.42;
                hourLevel = 0.35 * hourLevel + 0.25 * normalSample(random);
            }
            var hour = date.getUTCHours();
            var primaryDistance = (hour - primaryPeak) / primaryWidth;
            var secondaryDistance = (hour - secondaryPeak) / secondaryWidth;
            var activity = 0.13 + primaryStrength * Math.exp(-0.5 * primaryDistance * primaryDistance) + secondaryStrength * Math.exp(-0.5 * secondaryDistance * secondaryDistance);
            // Correlated noise forms irregular runs, unlike independent jitter.
            hourLevel = clamp(0.42 * hourLevel + 0.58 * normalSample(random), -1.05, 1.05);
            var localVariation = Math.exp(hourLevel * 0.72);
            // Rare short-lived bursts and quiet hours add an asymmetric tail.
            if (!burstHours && random() < 0.045) {
                burstHours = 1 + Math.floor(random() * 3);
                burstStrength = 1.7 + random() * 2.4;
            }
            var burst = burstHours ? burstStrength : 1;
            if (burstHours) { burstHours--; burstStrength = 1 + (burstStrength - 1) * (0.48 + random() * 0.18); }
            var quiet = random() < 0.055 ? 0.28 + random() * 0.38 : 1;
            // Every slot remains eligible; exact integer totals are imposed by
            // allocate() after these relative weights have been constructed.
            var weight = Math.max(0.002, dayWeight * activity * localVariation * burst * quiet);
            slots.push({ id: resource.id, bucket: bucket, weight: weight });
        }
        if (slots.length > first) { eligibleIds.push(resource.id); ranges.push({ first: first, end: slots.length }); }
    });
    if (slots.length > 20000) fail("This scope is too large. Select one resource or a shorter range.");
    var hasObserved = Object.keys(totalById).some(function(id) { return totalById[id] > 0; });
    var resourceAmounts = allocate(config.total, eligibleIds.map(function(id) { return hasObserved ? totalById[id] || 0 : 1; }));
    var amounts = [];
    ranges.forEach(function(range, i) {
        var weights = slots.slice(range.first, range.end).map(function(slot) { return slot.weight; });
        // Keep a single generated hour below 4.5% of a resource's range total.
        // The cap limits pathological outliers without flattening ordinary bursts.
        amounts = amounts.concat(allocateCapped(resourceAmounts[i], weights, resourceAmounts[i] * 0.045));
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
module.exports = { allocate: allocate, allocateCapped: allocateCapped, normalize: normalize, build: build, fail: fail };
