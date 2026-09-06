# IndexNow: production-only release notifications

IndexNow notifies participating search engines of public content changes. It is not a Google Search Console integration or a promise of indexing/rank improvement.

## Usage

`npm run seo:indexnow` is a no-network dry run against the latest built artifacts. After a successful **production** release, `npm run seo:indexnow -- --submit` verifies the deployed verification file and each changed page before submitting a batch. The normal `npm run deploy:prod` chain now includes that command after production smoke tests. Staging deploys never invoke it and the submission function independently rejects staging artifacts.

No notification has been sent as part of this implementation. The key file must first be published by an authorized release. It lives in `public/` as required by the protocol; it is a host-verification token, not a PocketBase credential. Do not reuse it for any other service.

## Change detection and recovery

- First run notifies the current canonical marketing catalogue. Later runs compare content fingerprints with `.local-security-artifacts/indexnow-receipt.json` and send only changed/new/removed URLs.
- Fingerprints ignore CSS class names and JS bundle references. They cover visible main content, title, description, destination links, images, and structured data.
- Public user profiles, dashboard URLs, aliases, query strings and staging hosts are excluded. Removed marketing URLs must be retired on production before notification.
- HTTP 200 means received; 202 means key validation is pending. Neither means indexed. Inspect status in Bing Webmaster Tools. For a pending batch that needs a deliberate retry, use `npm run seo:indexnow -- --submit --retry-pending`.
- On a timeout or rejected request, no new receipt is saved. Retry later after checking the error; do not loop repeatedly on 429. An uncertain network outcome may mean a prior notification was received even without a local receipt.
- Preserve the receipt between release jobs. On a fresh machine or ephemeral CI runner without this file, the next run sends a full marketing catalogue again. Store it as a private CI artifact if deployment moves to CI.
- If IndexNow fails after deploy, the website is **already deployed**. The nonzero exit is a notification failure, not a rollback; rerun only the notification command after resolving the issue.

Local tests mock all network responses and cover mode restrictions, path boundaries, key checks, stale releases, removals and response statuses.

Protocol: https://www.indexnow.org/documentation

## GSC / Bing data needed for the next prioritization

Export the last 90 days and the preceding comparable period, preferably with weekly rows. Keep search engine, date range, query, canonical page, clicks, impressions, CTR, average position, country and device. Query-only and page-only exports cannot be treated as query/page pairs: use a page filter or a paired export when needed.

Use the existing private `growth_acquisition_funnel` view for page-level signups and activation (see `organic-acquisition.md`). These metrics cannot identify which individual Google query caused a signup. Search terms suppressed by the engine remain unknown.

Practical prioritization once data exists:
1. Relevant non-brand query/page pairs already earning impressions near the first results page: improve intent fit and the answer itself.
2. Low CTR relative to comparable positions and queries: evaluate title/description, not just keyword repetition.
3. Relevant indexed pages with weak engagement or activation: inspect the content-to-product path.
4. Only then add a new URL for an uncovered task; consolidate overlap instead of making keyword variants compete internally.

Do not compare blended engine/country/device average positions as though they were a fixed ranking. No ranking-based page selection has been claimed without the actual exports.
