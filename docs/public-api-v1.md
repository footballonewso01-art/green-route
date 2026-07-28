# Linktery Public API v1

Status: beta, read-only first slice.

The API is served by the PocketBase application origin under `/api/v1`.
The Settings → API Access screen shows the exact base URL for the current
environment.

## Authentication

Create a key in Settings → API Access. The complete key is shown once and has
this shape:

```text
ltk_live_<public-prefix>_<secret>
```

Send it only in the HTTP `Authorization` header:

```http
Authorization: Bearer ltk_live_...
```

Keys in query parameters are not accepted. Linktery stores a peppered SHA-256
digest and a non-secret lookup prefix, never the complete key.

## Scopes

The first beta scope is:

- `links:read` — list and read links owned by the key's account.

Scopes are checked on every request. New write scopes will be added without
changing existing keys.

## Endpoints

### List links

```http
GET /api/v1/links?page=1&per_page=25
```

`per_page` accepts `1–100`. Results are ordered newest first.

### Read one link

```http
GET /api/v1/links/{id}
```

The API returns `404` for missing links and links owned by another account.
This prevents resource ownership from being disclosed.

## Response shape

```json
{
  "data": [
    {
      "id": "1sdk9od3pe38u7p",
      "title": "Campaign",
      "slug": "campaign",
      "domain": "linktery.com",
      "short_url": "https://linktery.com/campaign",
      "destination_url": "https://example.com",
      "active": true,
      "mode": "direct",
      "clicks_count": 42,
      "created": "2026-07-28 10:00:00.000Z",
      "updated": "2026-07-28 10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 25,
    "total": 1,
    "total_pages": 1,
    "request_id": "..."
  }
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

Include `request_id` when reporting a failed request. Responses also include:

- `X-Request-Id`
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset` (Unix timestamp)

## Current limits

- Creator: no API keys.
- Creator Pro: 1 active key, 60 requests per minute.
- Agency: 5 active keys, 300 requests per minute.

Every key expires within one year and can be revoked immediately. Downgrading
to a plan without API access makes existing keys unusable while keeping them
visible so they can still be revoked.
