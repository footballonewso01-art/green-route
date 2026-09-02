import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { get as httpGet } from "node:http";
import net from "node:net";
import path from "node:path";
import PocketBase from "pocketbase";

// Uses schema only from a local fixture. No customer records, settings, or
// production requests are copied into the test instance.
const root = process.cwd();
const source = path.resolve(root, process.argv[2] || "pocketbase/pb_data/data.db");
assert(source.startsWith(root + path.sep), "Fixture must be inside the workspace");
const artifacts = path.join(root, ".local-security-artifacts");
mkdirSync(artifacts, { recursive: true });
const temporary = mkdtempSync(path.join(artifacts, "security-smoke-"));
const db = path.join(temporary, "data.db");
const sql = (file, query) => execFileSync("sqlite3", [file, query], { encoding: "utf8", windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const rawGet = (url, headers) => new Promise((resolve, reject) => {
  const request = httpGet(url, { headers }, response => {
    response.resume();
    response.on("end", () => resolve({
      status: response.statusCode,
      headers: { get: name => response.headers[String(name).toLowerCase()] || null },
    }));
  });
  request.on("error", reject);
});
const password = randomBytes(24).toString("hex");
const redirectSecret = randomBytes(32).toString("hex");
const encryptionKey = randomBytes(16).toString("hex");
const executable = path.join(root, "pocketbase", "pocketbase-0.24.exe");
let processHandle;
let serverLog = "";

try {
  const schema = sql(source, "SELECT sql || ';' FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 1 WHEN 'index' THEN 2 WHEN 'view' THEN 3 ELSE 4 END;");
  execFileSync("sqlite3", [db], {
    input: schema + `\nATTACH DATABASE ${quote(source)} AS original;
      INSERT INTO _collections SELECT * FROM original._collections;
      INSERT INTO _migrations SELECT * FROM original._migrations WHERE file != '1787830000_harden_link_records_and_image_uploads.js';
      DETACH DATABASE original;`,
    encoding: "utf8", windowsHide: true,
  });
  const env = {
    ...process.env, PB_ENCRYPTION_KEY: encryptionKey,
    REDIRECT_ORIGIN_SECRET: redirectSecret, STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "", API_KEY_PEPPER: randomBytes(32).toString("hex"),
    API_KEY_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  };
  execFileSync(executable, ["superuser", "upsert", "security-smoke@example.com", password, `--dir=${temporary}`, "--encryptionEnv=PB_ENCRYPTION_KEY"], {
    env, windowsHide: true, stdio: "pipe",
  });
  const listener = net.createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  processHandle = spawn(executable, [
    "serve", "--dev", `--http=127.0.0.1:${port}`, `--dir=${temporary}`,
    `--hooksDir=${path.join(root, "pocketbase/pb_hooks")}`,
    `--migrationsDir=${path.join(root, "pocketbase/pb_migrations")}`,
    "--encryptionEnv=PB_ENCRYPTION_KEY",
  ], { env, windowsHide: true, stdio: "pipe" });
  // Keep a bounded, in-memory diagnostic buffer for this synthetic instance.
  const capture = chunk => { serverLog = (serverLog + String(chunk)).slice(-6000); };
  processHandle.stdout.on("data", capture);
  processHandle.stderr.on("data", capture);
  let ready = false;
  for (let i = 0; i < 80 && !ready; i++) {
    if (processHandle.exitCode !== null) throw new Error("Local PocketBase failed to start");
    try { ready = (await fetch(`${origin}/api/health`)).ok; } catch { /* starting */ }
    if (!ready) await new Promise(resolve => setTimeout(resolve, 125));
  }
  assert(ready, "Local PocketBase readiness timeout");
  const admin = new PocketBase(origin);
  await admin.collection("_superusers").authWithPassword("security-smoke@example.com", password);
  const createUser = (suffix, plan = "agency") => admin.collection("users").create({
    email: `security-${suffix}@example.com`, password, passwordConfirm: password,
    username: `security-${suffix}`, name: `Security ${suffix}`, plan, plan_status: "active",
    plan_expires_at: plan === "creator" ? "" : "2099-01-01 00:00:00.000Z",
  });
  const owner = await createUser("owner");
  const other = await createUser("other", "creator");
  const link = await admin.collection("links").create({
    user_id: owner.id, slug: "security-smoke-link", title: "Security test", active: true,
    destination_url: "https://example.com/default", domain: "linktery.com", mode: "redirect",
    geo_targeting: { US: "https://example.com/us", TIER_1: "https://example.com/tier" },
    device_targeting: { Mobile: "https://example.com/mobile" }, utm_source: "security-test",
  });
  const anonymous = new PocketBase(origin);
  const list = await anonymous.collection("links").getList(1, 1, { filter: `slug="${link.slug}"` });
  assert.equal(list.totalItems, 0);
  await assert.rejects(anonymous.collection("links").getOne(link.id), error => error.status === 404);
  const customer = new PocketBase(origin);
  await customer.collection("users").authWithPassword(owner.email, password);
  assert.equal((await customer.collection("links").getOne(link.id)).id, link.id);
  assert.equal((await customer.collection("links").getList(1, 10, { filter: `user_id="${owner.id}"` })).items.length, 1);
  const stranger = new PocketBase(origin);
  await stranger.collection("users").authWithPassword(other.email, password);
  await assert.rejects(stranger.collection("links").getOne(link.id), error => error.status === 404);
  await assert.rejects(stranger.collection("links").update(link.id, { title: "Not mine" }), error => error.status === 404);
  await assert.rejects(customer.collection("links").update(link.id, { user_id: other.id }), error => error.status === 403);
  await assert.rejects(customer.collection("links").update(link.id, {
    icon_type: "custom", icon_value: "data:image/png;base64," + Buffer.from("<svg/>").toString("base64"),
  }), error => error.status === 400);

  const creatorClient = stranger;
  await assert.rejects(creatorClient.collection("links").create({
    user_id: other.id, slug: "creator-paid-bypass", title: "Blocked premium field",
    destination_url: "https://example.com", domain: "linktery.com", mode: "redirect",
    geo_targeting: { US: "https://example.com/us" }, active: true,
  }), error => error.status === 400 && /Creator Pro plan/.test(String(error.message)));
  const browserPayload = new FormData();
  Object.entries({
    user_id: other.id, slug: "browser-generated-slug", title: "Browser form payload",
    destination_url: "https://example.com/browser", domain: "linktery.com", mode: "redirect",
    geo_targeting: "null", device_targeting: "null", split_urls: "null",
    ab_split: "false", active: "true",
  }).forEach(([key, value]) => browserPayload.append(key, value));
  const browserCreatedLink = await creatorClient.collection("links").create(browserPayload);
  assert.match(browserCreatedLink.slug, /^[a-z0-9]{8,10}$/);
  const creatorLink = await creatorClient.collection("links").create({
    user_id: other.id, slug: "creator-chosen-slug", title: "Server slug",
    destination_url: "https://example.com", domain: "linktery.com", mode: "redirect", active: true,
  });
  assert.notEqual(creatorLink.slug, "creator-chosen-slug", "Free users must not control custom slugs through the Records API");
  assert.match(creatorLink.slug, /^[a-z0-9]{8,10}$/);
  await assert.rejects(
    creatorClient.collection("links").update(creatorLink.id, { mode: "direct" }),
    error => error.status === 400 && /Creator Pro plan/.test(String(error.message)),
  );
  await assert.rejects(
    creatorClient.collection("links").update(creatorLink.id, { slug: "changed-by-direct-api" }),
    error => error.status === 400 && /Agency plan/.test(String(error.message)),
  );
  await creatorClient.collection("links").update(creatorLink.id, {
    device_targeting: { Mobile: "https://example.com/mobile" },
  });

  await admin.collection("users").update(other.id, {
    plan: "pro", plan_status: "active", plan_expires_at: "2099-01-01 00:00:00.000Z",
  });
  const proClient = creatorClient;
  const proLink = await proClient.collection("links").create({
    user_id: other.id, slug: "pro-generated-slug", title: "Allowed Pro routing",
    destination_url: "https://example.com", domain: "linktery.com", mode: "direct",
    cloaking: true, safe_page_url: "https://example.com/safe",
    geo_targeting: { US: "https://example.com/us" }, active: true,
  });
  assert.notEqual(proLink.slug, "pro-generated-slug", "Creator Pro still requires server-generated slugs");
  await assert.rejects(
    proClient.collection("links").update(proLink.id, { fb_pixel: "123456789" }),
    error => error.status === 400 && /Agency plan/.test(String(error.message)),
  );

  const edgeHeaders = {
    "X-Linktery-Redirect-Secret": redirectSecret, "X-Linktery-Public-Host": "linktery.com",
    "X-Linktery-Country": "US", "X-Linktery-Client-IP": "192.0.2.1", "User-Agent": "Instagram Mobile",
    "X-Linktery-Request-Id": "security-smoke-first-visit",
  };
  const response = await fetch(`${origin}/api/public/links/${link.slug}`, { headers: edgeHeaders });
  assert.equal(response.status, 200);
  const resolved = await response.json();
  assert.equal(resolved.destination_url, "https://example.com/us?utm_source=security-test");
  for (const field of ["user_id", "system_route_override", "system_route_active", "clicks_count", "geo_targeting", "device_targeting", "split_urls", "safe_page_url"]) {
    assert(!(field in resolved), `Public response must not contain ${field}`);
  }
  assert.equal(sql(db, "SELECT count(*) FROM clicks;").trim(), "0", "DTO reads must not write clicks");
  const wrongHostHeaders = { ...edgeHeaders, "X-Linktery-Public-Host": "linktery.bio" };
  const wrongHostDto = await fetch(`${origin}/api/public/links/${link.slug}`, { headers: wrongHostHeaders });
  assert.equal(wrongHostDto.status, 404, "A host-bound link must not resolve on another domain");
  const wrongHostRedirect = await fetch(`${origin}/${link.slug}`, { headers: wrongHostHeaders, redirect: "manual" });
  assert.equal(wrongHostRedirect.status, 404, "The redirect hot path must enforce the selected domain");
  assert.equal(sql(db, "SELECT count(*) FROM clicks;").trim(), "0", "Wrong-host probes must not write analytics");
  const redirect = await fetch(`${origin}/${link.slug}`, { headers: edgeHeaders, redirect: "manual" });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), resolved.destination_url);
  assert.equal(sql(db, "SELECT country FROM clicks;").trim(), "US");
  assert.equal((await customer.collection("links").getOne(link.id)).clicks_count, 1);
  const available = await customer.send(`/api/public/slugs/${link.slug}/availability?exclude_link_id=${link.id}`, { method: "GET" });
  assert.equal(available.available, true);
  const taken = await stranger.send(`/api/public/slugs/${link.slug}/availability?exclude_link_id=${link.id}`, { method: "GET" });
  assert.equal(taken.available, false);
  const profile = await admin.collection("public_profiles").create({
    user_id: owner.id, slug: "security-smoke-profile", name: "Security profile", domain: "linktery.com",
    social_links: [{ id: "youtube", url: "https://youtube.com/@example", icon_type: "preset", icon_value: "youtube" }],
  });
  const card = await admin.collection("profile_links").create({ user_id: owner.id, profile_id: profile.id, link_id: link.id, visible: true });
  const publicProfile = await anonymous.send(`/api/public/profiles/${profile.slug}?domain=linktery.com`, { method: "GET" });
  assert.equal(publicProfile.links.length, 1);
  assert(!("user_id" in publicProfile.profile));
  assert(!("user_id" in publicProfile.links[0]));
  assert.equal(publicProfile.links[0].link.destination_url, "");
  assert.equal(publicProfile.profile.social_links[0].url, "https://youtube.com/@example", JSON.stringify(publicProfile.profile.social_links));
  assert.equal(sql(db, "SELECT count(*) FROM profile_view_events;").trim(), "0");
  const profileStatsPath = `/api/analytics/profile-stats?profileId=${profile.id}&period=7d`;
  const allProfileStatsPath = "/api/analytics/profile-stats?profileId=all&period=7d";
  const linkStatsPath = `/api/analytics/stats?linkId=${link.id}&period=7d`;
  // This fixture has no historical customer rows; its live click rollups are
  // already complete, so mark only the synthetic instance's backfill state.
  sql(db, "INSERT INTO analytics_rollup_state (id,status,updated) VALUES ('historical','complete',datetime('now')) ON CONFLICT(id) DO UPDATE SET status='complete';");
  const initialLinkStats = await customer.send(linkStatsPath, { method: "GET" });
  assert.equal(initialLinkStats.total, 1);
  const initialStats = await customer.send(profileStatsPath, { method: "GET" });
  assert.equal(initialStats.views, 0);
  assert.equal((await customer.send(allProfileStatsPath, { method: "GET" })).cardClicks, 0);
  const profileDocument = await rawGet(`${origin}/${profile.slug}`, {
    ...edgeHeaders,
    "Accept": "text/html",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "X-Linktery-Request-Id": "security-smoke-profile-view",
  });
  assert.equal(profileDocument.status, 404, "The attested profile signal must still request the SPA");
  assert.equal(profileDocument.headers.get("X-Linktery-Redirect-Origin"), "v1");
  assert.equal(sql(db, "SELECT country FROM profile_view_events;").trim(), "US");
  await anonymous.send(`/api/public/profiles/${profile.slug}?domain=linktery.com`, { method: "GET" });
  assert.equal(sql(db, "SELECT count(*) FROM profile_view_events;").trim(), "1", "Profile DTO reads must not double-count visits");

  // Exercise the real card URL, not just an independent short-link visit.
  // Both root redirects and browser fallback telemetry must use the same
  // atomic profile counter, while preserving trusted geographic dimensions.
  assert.equal(sql(db, "SELECT count(*) FROM sqlite_master WHERE type='trigger' AND name='increment_profile_click_rollup';").trim(), "1");
  const cardClick = await fetch(`${origin}/${link.slug}?ref=profile&profile_id=${profile.id}&profile_link_id=${card.id}`, {
    headers: { ...edgeHeaders, "X-Linktery-Request-Id": "security-smoke-profile-click" }, redirect: "manual",
  });
  assert.equal(cardClick.status, 302);
  assert.equal(cardClick.headers.get("location"), resolved.destination_url);
  assert.equal(sql(db, "SELECT sum(total) FROM profile_click_hourly_rollup;").trim(), "1");
  const cachedStats = await customer.send(profileStatsPath, { method: "GET" });
  assert.equal(cachedStats.generatedAt, initialStats.generatedAt, "Ordinary requests retain the response cache");
  const freshStats = await customer.send(profileStatsPath + "&refresh=1", { method: "GET" });
  assert.equal(freshStats.views, 1);
  assert.equal(freshStats.uniqueViews, 1);
  assert.equal(freshStats.cardClicks, 1, "After-success hook must not increment the atomic counter again");
  assert.equal(freshStats.cards[0].profileLinkId, card.id);
  assert.equal(freshStats.cards[0].clicks, 1);
  assert.equal(freshStats.countryMap[0].code, "US");
  const fallbackClick = await fetch(`${origin}/api/track-click`, {
    method: "POST", headers: { ...edgeHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ link_id: link.id, profile_id: profile.id, profile_link_id: card.id, referrer: "Profile" }),
  });
  assert.equal(fallbackClick.status, 202);
  assert.equal((await fallbackClick.json()).accepted, true);
  assert.equal(sql(db, "SELECT sum(total) FROM profile_click_hourly_rollup;").trim(), "2");
  assert.equal(sql(db, `SELECT count(*) FROM clicks WHERE source_profile_id=${quote(profile.id)} AND profile_link_id=${quote(card.id)} AND country='US';`).trim(), "2");
  assert.equal((await customer.collection("links").getOne(link.id)).clicks_count, 3);
  assert.equal((await customer.send(allProfileStatsPath + "&refresh=1", { method: "GET" })).cardClicks, 2);
  assert.equal((await customer.send(linkStatsPath, { method: "GET" })).total, 1);
  assert.equal((await customer.send(linkStatsPath + "&refresh=1", { method: "GET" })).total, 3);
  await assert.rejects(anonymous.send(profileStatsPath + "&refresh=1", { method: "GET" }), error => error.status === 401);
  await assert.rejects(stranger.send(profileStatsPath + "&refresh=1", { method: "GET" }), error => error.status === 404);
  await assert.rejects(stranger.send(linkStatsPath + "&refresh=1", { method: "GET" }), error => error.status === 404);
  let refreshRateLimited = false;
  for (let i = 0; i < 12; i++) {
    try { await customer.send(profileStatsPath + "&refresh=1", { method: "GET" }); }
    catch (error) { if (error.status !== 429) throw error; refreshRateLimited = true; break; }
  }
  assert(refreshRateLimited, "Fresh refreshes must remain computation-rate-limited");
  const image = new FormData();
  image.append("avatar", new Blob(["<svg xmlns='http://www.w3.org/2000/svg'/>"], { type: "image/png" }), "fake.png");
  await assert.rejects(customer.collection("public_profiles").update(profile.id, image), error => error.status === 400);
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aAb0AAAAASUVORK5CYII=", "base64");
  const validImage = new FormData();
  validImage.append("avatar", new Blob([png], { type: "image/png" }), "test.png");
  const updatedProfile = await customer.collection("public_profiles").update(profile.id, validImage);
  const downloaded = await fetch(customer.files.getUrl(updatedProfile, updatedProfile.avatar));
  if (!downloaded.ok) throw new Error("Raster download failed: " + await downloaded.text() + "\n" + serverLog);
  assert.equal(downloaded.status, 200);
  assert.equal(downloaded.headers.get("X-Content-Type-Options"), "nosniff");
  assert.match(downloaded.headers.get("Content-Security-Policy") || "", /sandbox/);
  assert.equal(sql(db, "SELECT count(*) FROM _migrations WHERE file = '1787830000_harden_link_records_and_image_uploads.js';").trim(), "1");
  assert.equal(sql(db, "SELECT count(*) FROM _params WHERE id = 'settings' AND json_valid(value) = 0;").trim(), "1", "Settings must be encrypted at rest");
  const exited = once(processHandle, "exit");
  processHandle.kill();
  await exited;
  processHandle = undefined;
  execFileSync(executable, ["migrate", "up", `--dir=${temporary}`, "--encryptionEnv=PB_ENCRYPTION_KEY", `--migrationsDir=${path.join(root, "pocketbase/pb_migrations")}`], {
    env, windowsHide: true, stdio: "pipe",
  });
  console.log("PASS: owner isolation, immutable ownership, server-side plan entitlements, private routing DTO, trusted geo, HTTP redirect and click count, profile/social data and view count, atomic card clicks from redirects and fallback telemetry, fresh analytics and cache/rate-limit isolation, slug checks, forged SVG rejection, raster upload and file CSP, migration, encrypted settings reload.");
} catch (error) {
  console.error(error.stack || String(error));
  process.exitCode = 1;
} finally {
  if (processHandle && processHandle.exitCode === null && processHandle.signalCode === null) {
    const exited = once(processHandle, "exit");
    processHandle.kill();
    await exited;
  }
  assert(temporary.startsWith(artifacts + path.sep), "Refusing cleanup outside security artifacts");
  rmSync(temporary, { recursive: true, force: true });
}
