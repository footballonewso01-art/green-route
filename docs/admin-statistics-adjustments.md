# Admin statistics adjustments

## Scope and interpretation

Admin → Users → user → **Stats** embeds the same Analytics component and the same
owner-scoped aggregate endpoints used by customers. The optional `adminUserId`
query parameter is accepted only from an authenticated app administrator. It does
not impersonate a customer or change their plan. No adjustment label is added to
customer screens. Estimation details and the correction ledger are admin-only.

The editor sets the **final total within a selected inclusive UTC date range**,
not the lifetime total and not an increment. Dates cover 1–90 completed days;
today remains live. Choose all resources or one existing resource. An account-wide
request supports up to 50 resources, with maximum 20,000 resource-hour slots and
150,000 changed aggregate rows. For larger scopes select one resource/shorter dates.

Two metrics are deliberately separate:

- **Link clicks**: updates hourly total/unique counts, country/device/browser/OS/
  referrer breakdowns, daily totals, `links.clicks_count`, sparklines and Dashboard.
  Existing per-link Public Profile card-attribution shares are retained and
  distributed over the same link-hour capacities. These update profile card
  counts, trends and CTR. Links with no attributed history do not acquire invented
  profile sources.
- **Profile views**: updates view totals, unique views, all view dimensions,
  activity heatmap and view timeline. Existing card clicks remain unchanged; CTR
  recomputes from card clicks/views. A view is not automatically a link click.

The reconstructed timeline is deterministic. It blends recorded daily activity
with a bounded hourly curve and modest variation, so an old one-hour burst is not
multiplied into an artificial single-hour spike. Resources receive shares based
on existing counts, or equal shares when all have zero traffic. No bucket predates
the resource's creation hour. Unique counts use the selected 75–85% estimate, with
integer allocation and unique ≤ total. They retain the existing product's unique
scope (not a claim of reconstructed identifiable visitors).

Existing dimension shares are reused. Missing geography defaults to weighted US,
GB, DE, CA and NL; admins can supply a ranked ISO-country list. Device/OS/browser
defaults are independent aggregate estimates, not inferred real people. The
preview explicitly describes estimates to the administrator. Recent activity,
IP-level investigations, billing, DAU and acquisition funnels are **not** rewritten.
No rows are generated in `clicks` or `profile_view_events`.

## Safety and persistence

Private SQL tables `stats_adjustments`, `stats_adjustment_rows`, `stats_revision`
are not exposed as Records API collections. The ledger stores actor, reason,
scope, dates, summary, exact signed deltas, applied/undo timestamps and undo actor.
Previews expire after 15 minutes; old previews are purged on subsequent previews.
History returns the latest 50 applied/reverted operations.

Apply rechecks ownership and a server-computed snapshot fingerprint inside the
same transaction as aggregate updates. Changes to traffic within the selected
range, resource ownership or another admin correction invalidate the preview.
Real traffic outside the selected completed days does not invalidate it. The
client cannot submit aggregate rows, audit actors or arbitrary SQL.

Overlapping active adjustments on the same metric/resources are rejected. Undo
the old operation before replacing it. Apply and undo are idempotent and atomic;
undo subtracts the original deltas, preserving later real traffic. Negative or
inconsistent counters cause a rollback. If a resource is deleted/transferred
after applying, automated undo refuses to mutate the remaining resources and
requires operator reconciliation. The audit remains available.

Revision-stamped cache keys cover dashboard summary, analytics, profile analytics,
sparklines and API-v1 analytics. A response started before a change cannot populate
the new cache revision. A customer already looking at a page sees the change on
their next refresh/navigation; this feature does not add real-time push updates.

## Deployment and maintenance

Deploy PocketBase migration **1788610000** and hooks together, before the frontend.
Normal application startup runs migrations before serving routes. Do not roll back
the schema with active adjustments: the down migration deliberately refuses it.
Undo first. No production deployment/data mutation is part of implementation.

The hourly profile-click reconciliation includes active ledger deltas on both
insert and update. Any manual raw-event rebuild must also retain/reapply active
ledger deltas; `backfill_analytics_rollup.py` refuses to run while adjustments are
active. Do not repair only `links.clicks_count` or one rollup table in isolation.
The regular tracker still writes real traffic into the existing aggregate tables.

## Verification

- `npx vitest run src/test/adminStatsAdjustments.test.ts src/test/profileClickAtomicity.test.ts`
- `npx vitest run src/test/adminUserStats.test.tsx src/test/analyticsTabReturn.test.tsx`
- `node scripts/smoke-security-local.mjs` — schema-only disposable database, real
  PocketBase 0.24 JSVM, synthetic accounts. Covers auth, preview/apply/undo, matching
  customer/admin views, raw-event preservation and cache refresh; no prod requests.
- Standard lint, TypeScript, full test suite and local staging build.
