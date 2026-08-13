---
description: Deploy the Linktery frontend to Cloudflare Workers Static Assets.
---

# /deploy - Linktery deployment

$ARGUMENTS

`DEPLOYMENT.md` is the authoritative production runbook. This workflow is a
compact command reference and must not override it.

## Targets

```text
/deploy            -> Cloudflare staging Worker
/deploy staging    -> Cloudflare staging Worker
/deploy prod       -> Cloudflare production Workers after staging validation
/deploy api staging -> dedicated Public API staging Worker
/deploy api prod    -> dedicated Public API production Worker
```

## Environment architecture

| Environment | Frontend | Backend | Payments |
| --- | --- | --- | --- |
| Local | Vite on localhost | local PocketBase | test configuration |
| Staging | `linktery-frontend-staging.workers.dev` | `greenroute-pb-staging.fly.dev` | Stripe test mode |
| Production | Cloudflare routes on Linktery domains | `greenroute-pb.fly.dev` | Stripe live mode |

Production uses two Workers built from the same artifact:

- `linktery-frontend` for `linktery.com` and `www.linktery.com`;
- `linktery-frontend-alias` for `linktery.bio`, `hotme.online`, and
  `hotmylinks.cc`.

The branded developer API is a third, separately released Worker:

- `linktery-public-api` for `api.linktery.com/v1/*`, proxying only the
  allowlisted API contract to PocketBase `/api/v1/*`.

Vercel is a temporary emergency rollback origin only. Never use a Vercel
command for a routine staging or production release.

## Staging first

1. Start from the commit intended for release.
2. Run:

   ```text
   npm run deploy:staging
   ```

3. Test login, registration, dashboard navigation, a short link, a Public
   Profile, SEO routes, and Stripe test mode against staging.
4. Continue to production only after staging is healthy.

Staging deploys use `.env.staging`, the staging PocketBase origin, and
`X-Robots-Tag: noindex, nofollow`.

For the first automatic social-preview release, confirm the private R2 buckets
and Browser Run/Durable Object bindings exist before deploying. Leave
`SOCIAL_PREVIEW_ENABLED=false` on PocketBase until frontend and backend are
both live; enable staging first and verify crawler metadata plus the PNG asset.
Production is enabled last. Disable the flag first during rollback.

## Production frontend

Production must run from a clean committed checkout, preferably a fresh
release worktree at the exact Git SHA being released:

```text
npm run deploy:prod
```

This command runs lint, type checking, tests, the production build, both
Wrangler dry runs, both local routing smoke suites, deploys the primary and
alias Workers, and then runs live smoke tests on all production domains.

Do not rebuild between the primary and alias Worker deploys. Record the Git
SHA and both active Cloudflare Worker version IDs.

## Public API gateway

The public API gateway is not part of a routine frontend deploy. Use:

```text
npm run deploy:api:staging
npm run deploy:api:prod
```

Production must be released from a clean commit. Deploy the gateway before a
frontend documentation release that begins using a new branded path, then
verify `https://api.linktery.com/v1/*` with the API smoke suite. Never publish
the Fly.io origin in customer documentation or point `api.linktery.com`
directly at PocketBase.

The API Worker and PocketBase must share a 32+ character `API_ORIGIN_SECRET`.
It is a Cloudflare/Fly secret, never a repository variable. PocketBase must end
every release with `API_ORIGIN_ENFORCEMENT=true`; direct Fly `/api/v1/*`
requests must return `404`. Use the phased first-rollout sequence in
`DEPLOYMENT.md` so enabling the handshake does not interrupt the public API.
Backend Stripe releases also require the endpoint-specific
`STRIPE_WEBHOOK_SECRET`; send a signed Stripe test event before promotion.

## Backend releases are separate

Frontend deploys never deploy PocketBase or its database migrations.

Staging backend:

```text
cd pocketbase
flyctl deploy -c fly.staging.toml -a greenroute-pb-staging
```

Production backend:

```text
cd pocketbase
flyctl deploy -a greenroute-pb
```

Do not hot-patch production hooks from a moving Git branch. Build and deploy
the reviewed repository state, verify `/api/health`, and follow the snapshot
and migration procedure in `DEPLOYMENT.md`.

## Rollback

Prefer promoting the previous known-good Cloudflare Worker versions. Only use
the explicitly named `rollback:vercel:*` commands when the documented
emergency fall-through procedure is deliberately chosen.

## Rules

1. Staging before production.
2. A clean committed production checkout is mandatory.
3. Primary and alias Workers must use the same artifact and Git SHA.
4. DNS, nameservers, proxy status, and Worker routes are not changed by a
   normal code deploy.
5. Frontend and PocketBase releases remain separate and backwards compatible.
6. Verify production health and Cloudflare error metrics after every release.
7. Release `linktery-public-api` separately and never attach its custom domain
   to a frontend Worker.
8. Keep social-preview R2 buckets private and retain the daily Browser Run
   budget; generation failure must fall back to the static Linktery artwork.
