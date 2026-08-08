# Linktery Public API v1

Status: beta. Link management, owner-only Public Profile reads, and aggregated
Link analytics are available.

The machine-readable contract is available in [`openapi-v1.yaml`](./openapi-v1.yaml).

The API is served by the Linktery API origin under `/api/v1`. API keys are
server credentials: never embed one in browser JavaScript, a mobile bundle, a
public repository, an analytics tool, or a URL.

## Authentication

Open Settings → API Access to view the single key assigned to your account.
The key can be revealed and copied at any time and has this shape:

```text
ltk_live_<public-prefix>_<secret>
```

Send it only in the HTTP `Authorization` header:

```http
Authorization: Bearer ltk_live_...
```

Keys in query parameters are not accepted. Linktery stores a peppered SHA-256
digest for authentication and a separately encrypted copy for the
authenticated Settings screen. Raw key material is unavailable through
PocketBase collection endpoints.

Refreshing the key atomically revokes the previous credential. Requests made
with the old key return `401 invalid_api_key` immediately after a successful
refresh. Key refresh is account-rate-limited to one successful rotation every
five minutes. Read, write, analytics, and daily safety limits are account-scoped and do
not reset when the credential is rotated.

Existing keys retain their original scopes and are never silently elevated.
Refresh an older key in Settings to receive the current write, Profile, and
analytics capabilities.

## Scopes

New and refreshed account keys receive:

- `links:read` — list and read Links owned by the account.
- `links:write` — create and update Links owned by the account.
- `profiles:read` — list and read owned Public Profiles and their composition.
- `analytics:read` — read aggregate analytics for Links owned by the account.

Every route checks its scope. Creator accounts have no Public API access.
Creator Pro and Agency have the same API surface; plan features and resource
limits still apply server-side.

## Link endpoints

### List Links

```http
GET /api/v1/links?page=1&per_page=25
```

`per_page` accepts `1–100`; `page` is capped at `1000`. Results are newest
first and are always filtered to the API key owner.

### Read one Link

```http
GET /api/v1/links/{id}
```

The response includes an `ETag` header and the same value in `data.etag`.
Missing Links and Links owned by another account both return `404`.
The ETag versions the writable Link configuration. Live `clicks_count` changes
do not invalidate it, so normal traffic cannot cause unrelated PATCH requests
to fail with a stale precondition.

### Create a Link

```http
POST /api/v1/links
Content-Type: application/json
Authorization: Bearer ltk_live_...
Idempotency-Key: order-2026-08-02-001

{
  "title": "Campaign",
  "destination_url": "https://example.com/offer",
  "domain": "linktery.com",
  "active": true
}
```

`Idempotency-Key` is required and must contain 8–128 ASCII letters, numbers,
dots, colons, underscores, or hyphens. It is retained for seven days.
Mutation bodies are limited to 64 KB and must include an accurate
`Content-Length`; chunked mutation bodies are rejected with
`411 length_required` before JSON parsing.

- Same key + same JSON payload returns the original Link and sets
  `meta.idempotent_replay` to `true`.
- Same key + different payload returns `409 idempotency_conflict`.
- The plan Link quota, slug allocation, idempotency record, and insert are
  committed in one transaction.

Creator Pro receives a server-generated slug. Agency may additionally send a
custom `slug`. Supported domains are:

- `linktery.com`
- `linktery.bio`
- `hotme.online`
- `hotmylinks.cc`

### Update a Link

Fetch the Link first, then send its current ETag:

```http
PATCH /api/v1/links/{id}
Content-Type: application/json
Authorization: Bearer ltk_live_...
If-Match: "ltk-link-..."

{
  "destination_url": "https://example.com/new-offer",
  "active": true
}
```

`If-Match` is required. A stale ETag returns `412 precondition_failed`; a
missing header returns `428 precondition_required`. This prevents two
integrations from silently overwriting each other's changes.

Allowed create/update properties are strictly limited to:

- `title` — string, at most 100 characters.
- `destination_url` — valid `http` or `https` URL, at most 2048 characters;
  another Linktery short Link is rejected to prevent redirect loops.
- `domain` — one of the four supported Linktery domains.
- `active` — boolean.
- `slug` — Agency only.

Unknown properties are rejected. In particular, clients cannot set `user_id`,
`clicks_count`, timestamps, system routing fields, profile relations, files, or
analytics data.

Permanent Link deletion is intentionally not exposed in the first write
release because it cascades through analytics and Public Profile composition.
Deactivate safely with:

```json
{ "active": false }
```

## Link analytics

```http
GET /api/v1/links/{id}/analytics?period=30d
Authorization: Bearer ltk_live_...
```

This endpoint requires `analytics:read` and accepts `24h`, `7d`, `30d`, or
`90d`. It returns:

- total and unique clicks;
- a complete UTC hourly or daily time series, including zero-value buckets;
- top countries, referrers, devices, browsers, and operating systems;
- percentages calculated against total clicks in the requested period.

`24h` contains 24 UTC hourly buckets. Longer periods contain 7, 30, or 90 UTC
calendar-day buckets including the current day. `unique_clicks` uses the same
server-derived 24-hour unique-visitor signal as the Linktery dashboard.

The endpoint reads `analytics_hourly_rollup`, not individual click records. It
never returns IP data, User-Agent strings, visitor identifiers, or a row for
each click. Results are cached on the server for 30 seconds, so integrations
should normally refresh dashboards every 30–60 seconds rather than polling
continuously.

Example response:

```json
{
  "data": {
    "link": {
      "id": "1sdk9od3pe38u7p",
      "title": "Campaign",
      "slug": "campaign",
      "domain": "linktery.com",
      "short_url": "https://linktery.com/campaign"
    },
    "period": "30d",
    "timezone": "UTC",
    "granularity": "day",
    "window": { "from": "2026-07-04", "to": "2026-08-02" },
    "summary": { "clicks": 12500, "unique_clicks": 8300 },
    "timeseries": [
      { "bucket": "2026-08-02", "clicks": 412, "unique_clicks": 301 }
    ],
    "breakdowns": {
      "countries": [
        { "name": "US", "clicks": 4375, "percentage": 35 }
      ],
      "referrers": [],
      "devices": [],
      "browsers": [],
      "operating_systems": []
    }
  },
  "meta": {
    "generated_at": "2026-08-02T12:00:00.000Z",
    "request_id": "reqA1b2C3d4"
  }
}
```

## Public Profile endpoints

```http
GET /api/v1/profiles?page=1&per_page=25
GET /api/v1/profiles/{id}
GET /api/v1/profiles/{id}/links?page=1&per_page=25
```

These endpoints expose only Profiles owned by the key's account. Profile
mutation, profile composition mutation, and file upload are not part of this
release. Because the composition endpoint embeds the private Link response
(including its destination and click counter),
`GET /api/v1/profiles/{id}/links` requires both `profiles:read` and
`links:read`.

## Response shape

```json
{
  "data": {
    "id": "1sdk9od3pe38u7p",
    "title": "Campaign",
    "slug": "campaign",
    "domain": "linktery.com",
    "short_url": "https://linktery.com/campaign",
    "destination_url": "https://example.com",
    "active": true,
    "mode": "redirect",
    "clicks_count": 42,
    "etag": "\"ltk-link-1sdk9od3pe38u7p-...\"",
    "created": "2026-08-02 10:00:00.000Z",
    "updated": "2026-08-02 10:00:00.000Z"
  },
  "request_id": "..."
}
```

Errors use a stable envelope:

```json
{
  "error": {
    "code": "invalid_api_key",
    "message": "The API key is invalid or inactive."
  },
  "request_id": "..."
}
```

Include `request_id` when reporting a failed request. Responses include:

- `X-Request-Id`
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset` (Unix timestamp)
- `Retry-After` on `429`

## Current limits

| Plan | Reads | Writes | Analytics | Creates/day | Mutations/day | Active keys |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Creator | No API access | No API access | No API access | — | — | 0 |
| Creator Pro | 60/min | 15/min | 20/min | 100 | 1,000 | 1 |
| Agency | 300/min | 60/min | 60/min | 2,000 | 10,000 | 1 |

Daily safety ceilings are independent of the product's active-Link allowance.
They protect service availability and reset at 00:00 UTC. A successful create
counts toward both daily columns; a successful update counts only as a
mutation. Idempotent replays do not consume a second daily mutation.
These ceilings apply to the account, not an individual key, so key rotation
cannot reset them.

Read, write, and analytics buckets are independent and stored in SQLite, so deploys and
process restarts on the current single PocketBase data volume do not reset
them. PocketBase's global limiter remains a separate IP-level abuse barrier.
Before horizontally scaling the API across multiple database writers, these
buckets must move to a shared edge or distributed rate-limit store.

## Server configuration

Key management fails closed unless both server secrets are configured:

- `API_KEY_PEPPER`: at least 32 characters, used for authentication digests.
- `API_KEY_ENCRYPTION_KEY`: exactly 32 characters, used only for encrypted key
  reveal in the authenticated Settings screen.
