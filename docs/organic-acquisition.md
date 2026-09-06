# Organic acquisition: measurement and release notes

## Release scope

This change does not deploy or submit URLs to search engines. Deploy the PocketBase migration `1788600000_add_growth_landing_attribution.js` and updated hooks together before releasing the frontend. The new hooks require the added columns. Existing browsers can continue sending the old payload; the added fields default to empty.

## What is measured

- Public marketing pages using `useSeo` send `landing_pageview` on mount, deduplicated per tab/path for 30 minutes. This replaces the homepage-only delayed tracker. Interpret any change in view counts across this release with that definition change in mind.
- A 90-day browser first-touch context retains source, medium, campaign, journey ID, and original marketing landing path. Later internal navigation or campaign tags do not overwrite it. This is acquisition attribution, not last-touch/session attribution.
- Google, Bing, DuckDuckGo, Yahoo Search and Yandex referrers are classified as organic when recognizable. Explicit UTM medium or paid click identifiers take precedence. Missing referrers are not guessed organic. Campaign attribution is observational, client-supplied data, not an authenticated claim about the search engine.
- Query strings/fragments are excluded from saved landing paths. Dashboard routes, authentication routes, and public-profile usernames cannot become saved acquisition landing pages. Named UTM campaign fields continue using the existing bounded telemetry contract.
- Existing server hooks remain the source of truth for signup, link creation, profile creation and checkout completion. The browser can enrich a recent existing signup, not create one or submit activation milestones.
- `growth_acquisition_funnel` is a private SQLite view joining signup attribution to the user's earliest server milestones. Joining at read time handles profile creation arriving before browser signup enrichment. The view is not a public PocketBase collection or API.

Historical first landing pages are unknown; they are not backfilled with invented values. Blocked storage is supported within the current document, but cannot preserve attribution across a browser restart. Blocked telemetry, referrer suppression, shared devices, cross-device journeys and expired contexts still cause attribution gaps. A starter profile may be provisioned automatically: report profile creation separately from an intentionally created link, not as proof of customer engagement. Checkout completion is not net revenue or a retained paid subscription.

## Read-only reporting (administrator database access)

New account cohort, grouped by organic first-touch landing page:

```sql
SELECT landing_path, source,
       COUNT(*) AS signups,
       SUM(first_link_at IS NOT NULL) AS accounts_with_link,
       SUM(first_profile_at IS NOT NULL) AS accounts_with_profile,
       SUM(first_checkout_at IS NOT NULL) AS accounts_with_checkout
FROM growth_acquisition_funnel
WHERE medium = 'organic'
  AND landing_path != ''
  AND signed_up_at >= datetime('now', '-30 days')
GROUP BY landing_path, source
ORDER BY signups DESC;
```

Observed acquisition-journey cohort, with conversion **to date** (not a session-conversion rate):

```sql
WITH acquisition AS (
  SELECT journey_id, landing_path, MIN(created) AS first_observed_at
  FROM growth_events
  WHERE event_name = 'landing_pageview' AND medium = 'organic'
    AND journey_id != '' AND landing_path != ''
  GROUP BY journey_id, landing_path
), cohort AS (
  SELECT * FROM acquisition
  WHERE first_observed_at >= datetime('now', '-30 days')
)
SELECT cohort.landing_path,
       COUNT(DISTINCT cohort.journey_id) AS observed_journeys,
       COUNT(DISTINCT funnel.user_id) AS signups,
       COUNT(DISTINCT CASE WHEN funnel.first_link_at IS NOT NULL THEN funnel.user_id END) AS accounts_with_link
FROM cohort
LEFT JOIN growth_acquisition_funnel funnel
  ON funnel.journey_id = cohort.journey_id
GROUP BY cohort.landing_path;
```

These cohorts are not interchangeable. A journey ID represents a browser context, not a unique person. Do not divide this month's signups by a different cohort of this month's page views and label the result conversion rate.

## Search visibility workflow

1. Export Google Search Console and Bing Webmaster Tools query/page/country/device data before choosing new URLs. Prioritize relevant pages already earning impressions, comparing changes at query-and-page level rather than aggregate average position alone.
2. Improve one canonical commercial page per intent, backed by a practical guide. Do not grow the comparison matrix for every name permutation.
3. Candidate new intents: tracking Telegram placements, investigating automated clicks, and changing a destination after publication. Validate demand and existing overlap first.
4. After an explicitly authorized release, inspect important changed URLs, keep the canonical sitemap current, and consider IndexNow for Bing change discovery. Submission is not a ranking or indexing guarantee. Do not mass-request recrawls of unchanged pages.
5. Track non-brand impressions/clicks and activated accounts together. Helpful content, credible relevant mentions, usable pages and crawlability matter more than the count of submitted URLs.

Sources checked September 5, 2026:
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/docs/monitor-debug/google-analytics-search-console
- https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a
- https://www.bing.com/webmasters/help/URL-Submission-62f2860b
