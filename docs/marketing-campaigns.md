# Project marketing campaigns

Project campaigns extend the existing Growth and Promocodes systems without
turning a campaign into a fake affiliate account.

## Data ownership

- `marketing_campaigns` stores the objective, lifecycle, landing path, budget,
  and optional project-owned promocode.
- `marketing_placements` stores one stable tracked URL per channel or ad slot,
  its UTM source/medium, landing override, and manually reconciled cost.
- `marketing_campaign_visits` is a private server-written ledger. It never
  writes to `clicks`, link counters, profile counters, or customer analytics.
- `growth_events.content` stores `utm_content` so registrations and downstream
  server milestones can be attributed to an exact placement.

The marketing report uses first-touch Growth attribution. A later campaign
visit cannot overwrite a visitor's earlier acquisition context.

Removal is history-aware. Unused placements and campaigns are deleted. Once a
placement has campaign visits or Growth attribution it is disabled instead; a
campaign with visits, Growth events, or promocode uses is archived. Archiving
atomically disables every placement and its project-owned promocode so historic
reports remain attributable and shared URLs stop resolving.

## Promocodes and affiliates

Promocodes created inside a project campaign have `owner_type=project`, no
`partner_id`, and a forced `commission_rate_bps=0`. Partner-owned promocodes
cannot be attached to a project campaign. Existing partner codes keep their
affiliate attribution, frozen commission rate, recurring invoice ledger, and
payout history.

Campaign status and dates gate both its tracked URLs and attached project
promocode. Pausing or ending a campaign preserves historical visits,
registrations, redemptions, and billing data.

The standalone Promocodes admin view intentionally excludes project codes so
zero-commission campaigns do not distort affiliate KPIs. Project offers are
managed from their Campaign page.

## Public request path

1. A placement URL opens `/go/{tracking_slug}` on the canonical Linktery host.
2. The Cloudflare frontend rate-limits and attests the request before forwarding
   it to PocketBase.
3. PocketBase validates campaign/placement lifecycle, records a privacy-bounded
   visitor key, and returns only the safe internal destination and attribution.
4. The browser preserves first touch, appends standard UTM parameters, stores
   the optional offer, and navigates to the landing page.

Automated traffic classified at the edge is retained for abuse visibility but
excluded from campaign KPIs.

## Revenue semantics

Paid users and revenue use server-owned billing records with a positive amount.
Free Trial and Given rows and failed/refunded/cancelled records are excluded.
Spend is entered per placement in minor currency units; the UI calculates CPA
and ROAS without mixing those units.
