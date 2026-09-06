var math = require('./stats_adjustment_math.js');
var many = function(app, sql, params, shape) {
    var rows = arrayOf(new DynamicModel(shape));
    app.db().newQuery(sql).bind(params || {}).all(rows);
    return JSON.parse(JSON.stringify(rows));
};
var one = function(app, sql, params, shape) {
    var row = new DynamicModel(shape);
    app.db().newQuery(sql).bind(params || {}).one(row);
    return JSON.parse(JSON.stringify(row));
};
var revision = function(app, userId) {
    return Number(one(app, "SELECT COALESCE((SELECT revision FROM stats_revision WHERE user_id={:userId}),0) AS revision", { userId: userId }, { revision: 0 }).revision);
};
var subject = function(app, event) {
    var user = event.auth, target = String(event.request.url.query().get('adminUserId') || '');
    if (!user || user.collection().name !== 'users') return { status: 401, message: 'Sign in to continue.' };
    if (!target) return { user: user };
    if (user.get('role') !== 'admin') return { status: 403, message: 'Administrator access is required.' };
    if (!/^[a-z0-9]{15}$/.test(target)) return { status: 404, message: 'User not found.' };
    try { return { user: app.findRecordById('users', target) }; }
    catch (_) { return { status: 404, message: 'User not found.' }; }
};
var authorize = function(app, event) {
    if (!event.auth || event.auth.collection().name !== 'users') math.fail('Sign in to continue.', 401);
    if (event.auth.get('role') !== 'admin') math.fail('Administrator access is required.', 403);
    var id = String(event.request.pathValue('id') || '');
    if (!/^[a-z0-9]{15}$/.test(id)) math.fail('User not found.', 404);
    try { app.findRecordById('users', id); } catch (_) { math.fail('User not found.', 404); }
    return id;
};
var rowShape = { kind: '', resource_id: '', profile_id: '', card_id: '', bucket: '', dimension_type: '', dimension_value: '', total: 0, unique_count: 0 };
var snapshot = function(app, userId, config) {
    var links = config.mode === 'links', table = links ? 'links' : 'public_profiles';
    if (links) {
        var state = one(app, "SELECT status FROM analytics_rollup_state WHERE id='historical'", {}, { status: '' });
        if (state.status !== 'complete') math.fail('Analytics backfill must finish before adjusting statistics.', 409);
    }
    var params = { userId: userId, resourceId: config.resourceId, start: config.startAt, end: config.endAt };
    var resources = many(app, 'SELECT id, created FROM ' + table + " WHERE user_id={:userId} AND ({:resourceId}='all' OR id={:resourceId}) AND julianday(created)<julianday({:end}) ORDER BY id LIMIT 51", params, { id: '', created: '' });
    if (!resources.length) math.fail('No resources existed in this date range.', 404);
    if (resources.length > 50) math.fail('Select one resource; account-wide adjustments support up to 50 resources.');
    var scope = '(SELECT id FROM ' + table + " WHERE user_id={:userId} AND ({:resourceId}='all' OR id={:resourceId}))";
    var kind = links ? 'link' : 'view', rollup = links ? 'analytics_hourly_rollup' : 'profile_analytics_hourly_rollup', column = links ? 'link_id' : 'profile_id';
    var before = many(app, "SELECT '" + kind + "' AS kind, " + column + " AS resource_id, '' AS profile_id, '' AS card_id, bucket, dimension_type, dimension_value, total, unique_count FROM " + rollup + ' WHERE ' + column + ' IN ' + scope + ' AND bucket>={:start} AND bucket<{:end} ORDER BY ' + column + ',bucket,dimension_type,dimension_value LIMIT 150001', params, rowShape);
    if (before.length > 150000) math.fail('Too many existing rows. Select a shorter range.');
    var cards = links ? many(app, "SELECT 'card' AS kind, r.link_id AS resource_id, r.profile_id, r.profile_link_id AS card_id, r.bucket, 'all' AS dimension_type, '' AS dimension_value, r.total, r.unique_count FROM profile_click_hourly_rollup r JOIN public_profiles p ON p.id=r.profile_id AND p.user_id={:userId} WHERE r.link_id IN " + scope + ' AND r.bucket>={:start} AND r.bucket<{:end} ORDER BY r.link_id,r.profile_id,r.profile_link_id,r.bucket LIMIT 150001', params, rowShape) : [];
    if (cards.length > 150000) math.fail('Too many attribution rows. Select a shorter range.');
    var overlap = one(app, "SELECT count(*) AS n FROM stats_adjustments a WHERE a.user_id={:userId} AND a.mode={:mode} AND a.state='applied' AND a.start_at<{:end} AND a.end_at>{:start} AND (a.resource_id='all' OR {:resourceId}='all' OR a.resource_id={:resourceId})", Object.assign({}, params, { mode: config.mode }), { n: 0 });
    if (overlap.n) math.fail('An applied adjustment overlaps this resource and date range. Undo it in the history before replacing it.', 409);
    // Today's live clicks must not invalidate a preview of completed days.
    // Counters are incremented by deltas in the transaction, never overwritten.
    var fingerprint = $security.sha256(JSON.stringify([revision(app, userId), resources, before, cards]));
    return { resources: resources, before: before, cards: cards, fingerprint: fingerprint };
};
var list = function(app, userId) {
    var links = many(app, "SELECT id, COALESCE(NULLIF(title,''),slug) AS name, slug FROM links WHERE user_id={:userId} ORDER BY created DESC LIMIT 2000", { userId: userId }, { id: '', name: '', slug: '' });
    var profiles = many(app, "SELECT id, COALESCE(NULLIF(name,''),slug) AS name, slug FROM public_profiles WHERE user_id={:userId} ORDER BY created DESC LIMIT 2000", { userId: userId }, { id: '', name: '', slug: '' });
    var history = many(app, "SELECT id, actor_id, state, mode, resource_id, start_at, end_at, reason, summary, created, applied_at, reverted_at, reverted_by FROM stats_adjustments WHERE user_id={:userId} AND state!='preview' ORDER BY created DESC LIMIT 50", { userId: userId }, { id: '', actor_id: '', state: '', mode: '', resource_id: '', start_at: '', end_at: '', reason: '', summary: '', created: '', applied_at: '', reverted_at: '', reverted_by: '' });
    history.forEach(function(item) { item.summary = JSON.parse(item.summary); });
    return { links: links, profiles: profiles, history: history };
};
var preview = function(app, userId, actorId, body) {
    var config = math.normalize(body), result;
    app.runInTransaction(function(tx) {
        var state = snapshot(tx, userId, config), built = math.build(config, state.resources, state.before, state.cards);
        if (!built.rows.length) math.fail('The requested values already match this range.');
        var id = $security.randomString(24), created = new Date().toISOString();
        tx.db().newQuery("DELETE FROM stats_adjustments WHERE state='preview' AND created<strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day')").execute();
        tx.db().newQuery(`INSERT INTO stats_adjustments (id,user_id,actor_id,state,mode,resource_id,start_at,end_at,reason,config,summary,fingerprint,created)
            VALUES ({:id},{:userId},{:actorId},'preview',{:mode},{:resourceId},{:start},{:end},{:reason},{:config},{:summary},{:fingerprint},{:created})`).bind({ id: id, userId: userId, actorId: actorId, mode: config.mode, resourceId: config.resourceId, start: config.startAt, end: config.endAt, reason: config.reason, config: JSON.stringify(config), summary: JSON.stringify(built.summary), fingerprint: state.fingerprint, created: created }).execute();
        tx.db().newQuery(`INSERT INTO stats_adjustment_rows
            SELECT {:id},json_extract(value,'$.kind'),json_extract(value,'$.resource_id'),json_extract(value,'$.profile_id'),json_extract(value,'$.card_id'),json_extract(value,'$.bucket'),json_extract(value,'$.dimension_type'),json_extract(value,'$.dimension_value'),json_extract(value,'$.total'),json_extract(value,'$.unique_count') FROM json_each({:rows})`).bind({ id: id, rows: JSON.stringify(built.rows) }).execute();
        result = { id: id, summary: built.summary, expiresAt: new Date(Date.parse(created) + 15 * 60000).toISOString() };
    });
    return result;
};
var materialize = function(app, adjustmentId, sign) {
    var params = { id: adjustmentId, sign: sign };
    [['link','analytics_hourly_rollup','link_id'], ['view','profile_analytics_hourly_rollup','profile_id']].forEach(function(spec) {
        app.db().newQuery('INSERT INTO ' + spec[1] + ' (' + spec[2] + ',bucket,dimension_type,dimension_value,total,unique_count) SELECT resource_id,bucket,dimension_type,dimension_value,total*{:sign},unique_count*{:sign} FROM stats_adjustment_rows WHERE adjustment_id={:id} AND kind=\'' + spec[0] + '\' ON CONFLICT (' + spec[2] + ',bucket,dimension_type,dimension_value) DO UPDATE SET total=total+excluded.total,unique_count=unique_count+excluded.unique_count').bind(params).execute();
        var invalid = one(app, 'SELECT count(*) AS n FROM ' + spec[1] + ' WHERE ' + spec[2] + ' IN (SELECT resource_id FROM stats_adjustment_rows WHERE adjustment_id={:id}) AND (total<0 OR unique_count<0 OR unique_count>total)', { id: adjustmentId }, { n: 0 });
        if (invalid.n) math.fail('Underlying aggregates changed incompatibly. Reconcile them before continuing.', 409);
    });
    app.db().newQuery(`INSERT INTO profile_click_hourly_rollup (profile_id,profile_link_id,link_id,bucket,total,unique_count)
        SELECT profile_id,card_id,resource_id,bucket,total*{:sign},unique_count*{:sign} FROM stats_adjustment_rows WHERE adjustment_id={:id} AND kind='card'
        ON CONFLICT(profile_id,profile_link_id,link_id,bucket) DO UPDATE SET total=total+excluded.total,unique_count=unique_count+excluded.unique_count`).bind(params).execute();
    var badCards = one(app, "SELECT count(*) AS n FROM profile_click_hourly_rollup WHERE link_id IN (SELECT resource_id FROM stats_adjustment_rows WHERE adjustment_id={:id} AND kind='card') AND (total<0 OR unique_count<0 OR unique_count>total)", { id: adjustmentId }, { n: 0 });
    if (badCards.n) math.fail('Profile attribution changed incompatibly. Reconcile it before continuing.', 409);
    app.db().newQuery(`INSERT INTO analytics_daily (id,link_id,day,count,created,updated)
        SELECT lower(hex(randomblob(7)))||'a',resource_id,substr(bucket,1,10)||' 00:00:00.000Z',sum(total)*{:sign},datetime('now'),datetime('now')
        FROM stats_adjustment_rows WHERE adjustment_id={:id} AND kind='link' AND dimension_type='all' GROUP BY resource_id,substr(bucket,1,10)
        ON CONFLICT(link_id,day) DO UPDATE SET count=count+excluded.count,updated=datetime('now')`).bind(params).execute();
    app.db().newQuery(`UPDATE links SET clicks_count=clicks_count+COALESCE((SELECT sum(r.total)*{:sign} FROM stats_adjustment_rows r WHERE r.adjustment_id={:id} AND r.kind='link' AND r.dimension_type='all' AND r.resource_id=links.id),0)
        WHERE id IN (SELECT resource_id FROM stats_adjustment_rows WHERE adjustment_id={:id} AND kind='link')`).bind(params).execute();
    var badCounters = one(app, "SELECT (SELECT count(*) FROM links WHERE id IN (SELECT resource_id FROM stats_adjustment_rows WHERE adjustment_id={:id} AND kind='link') AND clicks_count<0)+(SELECT count(*) FROM analytics_daily WHERE link_id IN (SELECT resource_id FROM stats_adjustment_rows WHERE adjustment_id={:id} AND kind='link') AND count<0) AS n", { id: adjustmentId }, { n: 0 });
    if (badCounters.n) math.fail('Lifetime or daily counters need reconciliation before this adjustment.', 409);
    // Undo should also restore the true empty state, not leave zero-valued
    // countries, cards and chart points visible in an otherwise empty report.
    [['link','analytics_hourly_rollup','link_id'], ['view','profile_analytics_hourly_rollup','profile_id']].forEach(function(spec) {
        app.db().newQuery('DELETE FROM ' + spec[1] + ' WHERE total=0 AND unique_count=0 AND (' + spec[2] + ',bucket,dimension_type,dimension_value) IN (SELECT resource_id,bucket,dimension_type,dimension_value FROM stats_adjustment_rows WHERE adjustment_id={:id} AND kind=\'' + spec[0] + '\')').bind({ id: adjustmentId }).execute();
    });
    app.db().newQuery("DELETE FROM profile_click_hourly_rollup WHERE total=0 AND unique_count=0 AND (link_id,profile_id,profile_link_id,bucket) IN (SELECT resource_id,profile_id,card_id,bucket FROM stats_adjustment_rows WHERE adjustment_id={:id} AND kind='card')").bind({ id: adjustmentId }).execute();
    app.db().newQuery("DELETE FROM analytics_daily WHERE count=0 AND (link_id,day) IN (SELECT resource_id,substr(bucket,1,10)||' 00:00:00.000Z' FROM stats_adjustment_rows WHERE adjustment_id={:id} AND kind='link' AND dimension_type='all')").bind({ id: adjustmentId }).execute();
};
var change = function(app, userId, actorId, id, undo) {
    if (!/^[a-zA-Z0-9]{24}$/.test(id)) math.fail('Adjustment not found.', 404);
    app.runInTransaction(function(tx) {
        var items = many(tx, 'SELECT * FROM stats_adjustments WHERE id={:id} AND user_id={:userId}', { id: id, userId: userId }, { id: '', user_id: '', actor_id: '', state: '', mode: '', resource_id: '', start_at: '', end_at: '', reason: '', config: '', summary: '', fingerprint: '', created: '', applied_at: '', reverted_at: '', reverted_by: '' });
        if (!items.length) math.fail('Adjustment not found.', 404);
        var item = items[0];
        if (undo && item.state === 'reverted') return; // retry-safe
        if (!undo && item.state === 'applied' && item.actor_id === actorId) return;
        if (undo && item.state !== 'applied') math.fail('Only applied adjustments can be undone.', 409);
        if (!undo) {
            if (item.state !== 'preview' || item.actor_id !== actorId) math.fail('Create your own preview before applying a change.', 403);
            if (Date.now() - Date.parse(item.created) > 15 * 60000) math.fail('Preview expired. Generate a fresh preview.', 409);
            var config = JSON.parse(item.config), current = snapshot(tx, userId, config);
            if (current.fingerprint !== item.fingerprint) math.fail('Traffic or resources changed after this preview. Generate a fresh preview.', 409);
        }
        // Refuse undo after resource deletion/transfer: never touch another owner.
        var missing = one(tx, `SELECT count(*) AS n FROM stats_adjustment_rows r WHERE r.adjustment_id={:id} AND (
            (r.kind IN ('link','card') AND NOT EXISTS(SELECT 1 FROM links l WHERE l.id=r.resource_id AND l.user_id={:userId})) OR
            (r.kind='view' AND NOT EXISTS(SELECT 1 FROM public_profiles p WHERE p.id=r.resource_id AND p.user_id={:userId})) OR
            (r.kind='card' AND NOT EXISTS(SELECT 1 FROM public_profiles p WHERE p.id=r.profile_id AND p.user_id={:userId})))`, { id: id, userId: userId }, { n: 0 });
        if (missing.n) math.fail('A resource was removed or transferred. Manual reconciliation is required; no statistics were changed.', 409);
        materialize(tx, id, undo ? -1 : 1);
        tx.db().newQuery(undo ? "UPDATE stats_adjustments SET state='reverted',reverted_at={:now},reverted_by={:actorId} WHERE id={:id}" : "UPDATE stats_adjustments SET state='applied',applied_at={:now} WHERE id={:id}").bind({ id: id, now: new Date().toISOString(), actorId: actorId }).execute();
        tx.db().newQuery('INSERT INTO stats_revision(user_id,revision) VALUES({:userId},1) ON CONFLICT(user_id) DO UPDATE SET revision=revision+1').bind({ userId: userId }).execute();
    });
    return { ok: true };
};
module.exports = { authorize: authorize, subject: subject, revision: revision, list: list, preview: preview, change: change };
