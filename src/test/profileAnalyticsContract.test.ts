import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readWorkspaceFile = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("Public Profile analytics contract", () => {
  it("keeps raw profile views private and aggregates them into bounded rollups", () => {
    const migration = readWorkspaceFile(
      "pocketbase/pb_migrations/1786467000_add_profile_analytics.js",
    );

    expect(migration).toContain('name: "profile_view_events"');
    expect(migration.match(/(?:list|view|create|update|delete)Rule: null/g)).toHaveLength(5);
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_view_request");
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_view_daily_unique");
    expect(migration).toContain("CREATE INDEX IF NOT EXISTS idx_profile_view_created");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS profile_analytics_hourly_rollup");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS profile_click_hourly_rollup");
    expect(migration).toContain('name: "source_profile_id"');
    expect(migration).toContain('name: "profile_link_id"');
    expect(migration).not.toContain("idx_clicks_source_profile_created");
    expect(migration).not.toContain("idx_clicks_profile_link_created");
  });

  it("records views only at the trusted edge document boundary", () => {
    const worker = readWorkspaceFile("cloudflare/worker.ts");
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");

    expect(worker).toContain('headers.set("X-Linktery-Request-Id"');
    expect(worker).toContain('"Purpose"');
    expect(worker).toContain('"Sec-Fetch-Dest"');
    expect(worker).toContain('"Sec-Fetch-Mode"');
    expect(worker).toContain('"Sec-Purpose"');
    expect(worker).toContain('headers.set("X-Linktery-Traffic-Quality", "automated")');
    expect(hook).toContain('utils.recordProfileView($app, c, publicProfile)');
    expect(utils).toContain("isTrustedRedirectEdgeRequest(eventOrRequest)");
    expect(utils).toContain('request.header.get("X-Linktery-Request-Id")');
    expect(utils).toContain('request.header.get("Sec-Purpose")');
    expect(utils).toContain('request.header.get("Purpose")');
    expect(utils).toContain('request.header.get("Accept")');
    expect(utils).toContain('request.header.get("Sec-Fetch-Dest")');
    expect(utils).toContain('fetchDest !== "document"');
    expect(utils).toContain('request.header.get("Sec-Fetch-Mode")');
    expect(utils).toContain('fetchMode !== "navigate"');
    expect(utils).toContain('request.header.get("X-Linktery-Traffic-Quality")');
    expect(utils).toContain("isTrustedAutomatedTraffic(eventOrRequest)");
    expect(utils).toContain('isTrackedAutomation(dimensions.userAgent)');
    expect(utils).toContain('$os.getenv("PROFILE_ANALYTICS_SALT")');
    expect(utils).toContain('$os.getenv("REDIRECT_ORIGIN_SECRET")');
    expect(utils).not.toContain('profile_views", profile');
  });

  it("suppresses high-confidence automation across profile views and link clicks", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");

    expect(utils).toContain("HeadlessChrome");
    expect(utils).toContain("python-requests");
    expect(utils).toContain("Go-http-client");
    expect(hook).toContain("const suppressAnalytics = isBot || utils.isTrustedAutomatedTraffic(c)");
    expect(hook).toContain("if (!suppressAnalytics && utils.clickRateLimitAllows(c, link.id))");
    expect(hook).toContain("const isAutomated = utils.isTrackedAutomation(uaStr) || utils.isTrustedAutomatedTraffic(c)");
  });

  it("deduplicates retries and daily visitors without storing raw IP or UA", () => {
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");
    const recorderStart = utils.indexOf("var recordProfileView = function");
    const recorderEnd = utils.indexOf("var normalizeApiScopes", recorderStart);
    const recorder = utils.slice(recorderStart, recorderEnd);

    expect(recorder).toContain('FROM profile_view_events WHERE request_key = {:requestKey}');
    expect(recorder).toContain("visitor_day = {:visitorDay}");
    expect(recorder).toContain("visitor_hash = {:visitorHash}");
    expect(recorder).toContain("app.runInTransaction");
    expect(recorder).toContain("profileViewRateLimitAllows");
    expect(recorder).toContain("getClientIP(eventOrRequest)");
    expect(recorder).not.toContain('ip: getClientIP');
    expect(recorder).not.toContain('user_agent: dimensions.userAgent');
  });

  it("keeps viral traffic available and makes telemetry failures observable", () => {
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");
    const clickLimiter = utils.slice(
      utils.indexOf("var clickRateLimitAllows = function"),
      utils.indexOf("var isUniqueTrackedClick = function"),
    );
    const profileLimiter = utils.slice(
      utils.indexOf("var profileViewRateLimitAllows = function"),
      utils.indexOf("var isTrackedAutomation = function"),
    );
    const warningHelper = utils.slice(
      utils.indexOf("var warnProfileViewFailure = function"),
      utils.indexOf("var isUniqueTrackedClick = function"),
    );
    const recorder = utils.slice(
      utils.indexOf("var recordProfileView = function"),
      utils.indexOf("var normalizeApiScopes"),
    );

    // Link-click controls are independent and must not be weakened while the
    // higher Profile View allowance protects shared carrier/privacy-relay IPs.
    expect(clickLimiter).toContain("ipCount >= 240 || pairCount >= 60");
    expect(profileLimiter).toContain("ipCount >= 5000 || pairCount >= 1000");
    expect(utils).toContain("PROFILE_VIEW_WARNING_INTERVAL_MS = 60 * 1000");
    expect(warningHelper).toContain("Profile view analytics warning category=");
    expect(warningHelper).not.toContain("getClientIP");
    expect(warningHelper).not.toContain("User-Agent");
    expect(warningHelper).not.toContain("request_key");
    expect(recorder).toContain('warnProfileViewFailure(app, "missing_salt"');
    expect(recorder).toContain('warnProfileViewFailure(app, "write_failed"');
    expect(recorder).toContain("persistProfileViewEvent(txApp, true)");
  });

  it("attributes card clicks only after validating the profile assignment", () => {
    const publicProfile = readWorkspaceFile("src/pages/PublicProfile.tsx");
    const redirectHandler = readWorkspaceFile("src/pages/RedirectHandler.tsx");
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");

    expect(publicProfile).toContain("getPublicProfileCardHref(item.link, profile.id, item.id, customDomainRoot)");
    const cardUrls = readWorkspaceFile("src/lib/publicAssets.ts");
    expect(cardUrls).toContain("profile_id=${encodeURIComponent(profileId)}");
    expect(cardUrls).toContain("profile_link_id=${encodeURIComponent(profileLinkId)}");
    expect(redirectHandler).toContain('urlParams.get("profile_id")');
    expect(redirectHandler).toContain('payload.set("profile_link_id", profileLinkId)');
    expect(utils).toContain("id = {:profileLinkId} && profile_id = {:profileId} && link_id = {:linkId} && visible = true");
    expect(hook).toContain('"source_profile_id": profileAttribution.sourceProfileId');
    expect(hook).toContain("INSERT INTO profile_click_hourly_rollup");
  });

  it("serves owner-scoped profile analytics exclusively from rollups", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const routeStart = hook.indexOf('routerAdd("GET", "/api/analytics/profile-stats"');
    const routeEnd = hook.indexOf('routerAdd("GET", "/api/analytics/recent"', routeStart);
    const route = hook.slice(routeStart, routeEnd);

    expect(routeStart).toBeGreaterThan(-1);
    expect(route).toContain('profileId === "all"');
    expect(route).toContain("id = {:profileId} && user_id = {:userId}");
    expect(route).toContain(
      "r.profile_id IN (SELECT id FROM public_profiles WHERE user_id = {:userId})",
    );
    expect(route).toContain("plan.analytics");
    expect(route).toContain("FROM profile_analytics_hourly_rollup");
    expect(route).toContain("FROM profile_click_hourly_rollup");
    expect(route).not.toContain("FROM profile_view_events");
    expect(route).not.toContain("FROM clicks");
    expect(route).toContain("getAnalyticsCache");
    expect(route).toContain("ANALYTICS_INFLIGHT[inflightKey]");
    expect(route).not.toContain("ANALYTICS_INFLIGHT[user.id]");
    expect(route).toContain('scope: isAllProfiles ? "all" : "profile"');
    expect(route).toContain("profilesCount: profilesCount");
    expect(route).toContain('uniqueScope: "profile_day"');
    expect(route).toContain("profileViewsById");
    expect(route).toContain("profileId: cardProfileId");
    expect(route).toContain("profileName:");
    expect(route).toContain("profileSlug:");
    expect(route).toContain("pl.profile_id = r.profile_id");
    expect(route).toContain("l.user_id = p.user_id");
    expect(hook).toContain('cronAdd("cleanup_profile_analytics_events"');
    expect(hook).toContain("created < datetime('now', '-100 days')");
  });

  it("idempotently reconciles recent profile card clicks from indexed raw events", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const reconcileStart = hook.indexOf(
      'cronAdd("reconcile_profile_click_rollups"',
    );
    const reconcileEnd = hook.indexOf(
      "// Admin: bounded activity summary",
      reconcileStart,
    );
    const reconcile = hook.slice(reconcileStart, reconcileEnd);

    expect(reconcileStart).toBeGreaterThan(-1);
    expect(reconcile).toContain("FROM clicks c INDEXED BY idx_clicks_created");
    expect(reconcile).toContain(
      "c.created >= strftime('%Y-%m-%d %H:00:00.000Z', 'now', '-6 hours')",
    );
    expect(reconcile).toContain(
      "INNER JOIN public_profiles p ON p.id = c.source_profile_id",
    );
    expect(reconcile).toContain("INNER JOIN links l ON l.id = c.link_id");
    expect(reconcile).toContain("total = excluded.total");
    expect(reconcile).toContain("unique_count = excluded.unique_count");
    expect(reconcile).not.toContain("total = total +");
    expect(reconcile).not.toContain("DELETE FROM clicks");
  });

  it("keeps link clicks and profile views as explicit UI scopes", () => {
    const page = readWorkspaceFile("src/pages/AnalyticsPage.tsx");
    const profileHub = readWorkspaceFile("src/pages/ProfileHub.tsx");

    expect(page).toContain('searchParams.get("profile")');
    expect(page).toContain('"/api/analytics/profile-stats"');
    expect(page).toContain("Profile Views");
    expect(page).toContain("Unique Profile Visits");
    expect(page).toContain("Card Clicks");
    expect(page).toContain("Card Click Rate");
    expect(page).toContain("Card Performance");
    expect(page).toContain('metric={isProfileMode ? "views" : "clicks"}');
    expect(profileHub).toContain("/dashboard/analytics?profile=${profile.id}");
  });
});
