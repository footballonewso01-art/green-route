# Linktery deployment runbook

This is the authoritative deployment document for Linktery. If another file,
an old chat, or a hosting dashboard suggests a different frontend process,
follow this runbook.

## Production architecture

The production frontend runs on **Cloudflare Workers Static Assets**. Vercel is
not the normal production deployment target anymore.

| Traffic | Cloudflare Worker |
| --- | --- |
| `linktery.com/*` | `linktery-frontend` |
| `www.linktery.com/*` | `linktery-frontend` |
| `linktery.bio/*` | `linktery-frontend-alias` |
| `hotme.online/*` | `linktery-frontend-alias` |
| `hotmylinks.cc/*` | `linktery-frontend-alias` |
| `api.linktery.com/v1/*` | `linktery-public-api` |

`www.linktery.com` redirects to the apex domain. Alias domains continue to
serve customer `/{slug}` URLs, but product, account, and SEO routes redirect to
`linktery.com`.

PocketBase remains a separate Fly.io service at
`https://greenroute-pb.fly.dev`. A frontend deploy does not deploy PocketBase,
run database migrations, or change Stripe webhooks.

The public developer API is exposed only as
`https://api.linktery.com/v1`. The dedicated `linktery-public-api` Worker maps
that allowlisted surface to PocketBase's internal `/api/v1` routes. It does not
proxy PocketBase collection, admin, authentication, or file endpoints. The
Fly.io hostname is an implementation origin and must not be published in
customer-facing API documentation or code examples.

The Cloudflare account is on Workers Paid. Production zones use Cloudflare
nameservers, proxied apex records, Universal SSL, and `Full (strict)` TLS.

## Temporary Vercel rollback origin

Vercel is retained only as a temporary rollback origin during the Cloudflare
observation period. The proxied DNS records still point at the previous Vercel
origin behind the Worker routes, so disabling a Worker route can fall through
to the last known-good Vercel deployment.

Do not use Vercel for routine staging or production deploys. Do not delete the
Vercel project, its domains, or its last healthy deployment until the rollback
window has been explicitly closed. The only npm commands that target Vercel
are intentionally named `rollback:vercel:*`.

## Required tooling and credentials

- Node.js 24 (see `.nvmrc`)
- npm 10.9.3
- the lockfile-pinned Wrangler version; do not depend on a floating global CLI
- either an authenticated Wrangler OAuth session or protected CI secrets
  `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
- Fly.io credentials only when the backend is being deployed separately

Cloudflare tokens must be scoped to the Linktery account and Workers. Never
commit tokens, Wrangler credentials, Stripe secrets, PocketBase admin tokens,
or Fly access tokens.

The frontend only uses public build-time values:

- `VITE_DEPLOY_ENV`
- `VITE_POCKETBASE_URL`
- `VITE_AVAILABLE_DOMAINS`

Production and staging values live in `.env.production` and `.env.staging`.
Never put a secret in a `VITE_*` variable because Vite embeds it in browser
JavaScript.

### Redirect resolver secret

Public `/{slug}` requests use a private Worker-to-PocketBase resolver before
falling back to the SPA. It is authenticated with `REDIRECT_ORIGIN_SECRET`.
Use separate random values of at least 32 bytes for production and staging:

- production: the same value on `greenroute-pb`, `linktery-frontend`, and
  `linktery-frontend-alias`;
- staging: a different value on `greenroute-pb-staging` and the staging Worker.

Store it only with Fly secrets and Wrangler secrets; never place it in
`wrangler.jsonc`, `.env*`, a `VITE_*` value, CI logs, or this repository. The
backend attests successful authentication in its private response. The Worker
rejects an unattested response and falls back safely, so a secret mismatch
cannot turn a Public Profile into PocketBase's empty `200` response.

`DEEPLINK_META_ESCAPE_ENABLED=false` on PocketBase is the emergency kill
switch for automatic Instagram/Threads iOS handoff. It leaves ordinary HTTPS
redirects and the manual fallback available.

### Automatic social preview infrastructure

Profile-aware Open Graph cards use three private Cloudflare bindings on the
frontend Worker:

- Browser Run renders a `1200x630` PNG only on a cache miss;
- R2 stores the rendered card at a versioned private object key;
- `SocialPreviewCoordinator` serializes generation globally per profile and
  enforces the daily render budget.

Required private buckets:

| Environment | R2 bucket |
| --- | --- |
| Production | `linktery-social-previews` |
| Staging | `linktery-social-previews-staging` |

The buckets must not expose an `r2.dev` hostname or custom public domain. Cards
are served only through the frontend Worker, which validates the current
profile version with PocketBase. `SOCIAL_PREVIEW_MAX_DAILY_RENDERS` is `1000`
in production and `100` in staging; exceeding it degrades to the static
Linktery preview instead of affecting redirects.

PocketBase controls the feature with `SOCIAL_PREVIEW_ENABLED=true`. Keep it
unset/false until Browser Run, R2, the Durable Object migration, the frontend
Worker, and the matching backend hook have all been verified. To disable the
feature, set it to `false`; normal links, profiles, clicks, and Profile View
analytics remain available.

For a first rollout, use this backwards-compatible order:

1. activate the R2 subscription and create both private buckets;
2. deploy the frontend Worker with the new bindings while the backend switch
   remains false;
3. deploy the PocketBase hook;
4. set `SOCIAL_PREVIEW_ENABLED=true` on staging and run a real crawler/image
   smoke test;
5. repeat the verified sequence for production, enabling the switch last.

On rollback, disable `SOCIAL_PREVIEW_ENABLED` first, then roll back backend or
frontend versions. Never remove a bucket or Durable Object binding while a
deployed Worker version still references it.

## Non-negotiable deployment rules

1. Production deploys must run from a clean committed checkout. Prefer a fresh
   release worktree at the exact Git SHA being released.
2. `linktery-frontend` and `linktery-frontend-alias` must be built from the same
   commit and the same `dist-cloudflare` artifact.
3. Run lint, tests, type checking, a production build, a Wrangler dry run, and
   both local routing smoke suites before publishing.
4. Do not edit Worker source or static assets in the Cloudflare dashboard.
   Repository code and `wrangler.jsonc` are the source of truth.
5. Worker routes and DNS are infrastructure. A normal code deploy must not
   add, remove, or toggle DNS records, nameservers, proxy status, or routes.
6. Do not add production routes or custom domains to `wrangler.jsonc` without
   an explicit infrastructure migration plan. They are intentionally managed
   separately so a code deploy cannot seize or detach production traffic.
7. Keep frontend and backend releases separate. When both must change, use a
   backwards-compatible sequence and verify Fly health before publishing the
   frontend.
8. Never use `npm run rollback:vercel:prod` as a normal deploy command.
9. Deploy the API gateway separately from the frontend. A frontend release
   must not silently change API routing, allowed methods, or the API custom
   domain.
10. A redirect-resolver change is deployed backend-first: deploy/verify the
    PocketBase hook and secret, verify the matching Worker secrets, then deploy
    staging and finally both production frontend Workers. Never rotate only one
    side of the shared secret.
11. The initial automatic social-preview rollout is the documented exception
    to backend-first ordering: its backend kill switch remains false until the
    image Worker and storage bindings are live, and is enabled only after both
    sides pass staging smoke tests.

## Build artifacts and routing

`npm run build:production` generates both:

- `dist` for the temporary Vercel rollback deployment;
- `dist-cloudflare` for Cloudflare Workers Static Assets.

The Cloudflare artifact stores the landing page, SPA shell, and branded 404
under `/_linktery`. The Worker blocks direct public access to that namespace.
This prevents implementation filenames such as `/index` and `/landing` from
stealing valid customer slugs.

The Worker handles HTML navigation, canonical redirects, application routes,
SEO pages, and public `/{slug}` resolution. Hashed `/assets/*` files and root
media bypass Worker execution and are served as Static Assets. Hashed assets
must retain immutable caching; HTML must remain revalidated.

## Public API gateway deploy

The API gateway uses `wrangler.api.jsonc` and has its own release command. Its
production custom domain is declared in that dedicated config; do not attach
`api.linktery.com` to either frontend Worker.

The gateway and PocketBase share `API_ORIGIN_SECRET` (at least 32 random
characters). Store it as a Wrangler secret and a Fly secret; never add it to
`wrangler.api.jsonc`, Git, logs, or a frontend environment variable. PocketBase
defaults `API_ORIGIN_ENFORCEMENT` to enabled, so a direct Fly request to
`/api/v1/*` must look like a missing route.

For the first zero-downtime rollout only:

1. set `API_ORIGIN_ENFORCEMENT=false` on the target Fly app;
2. deploy and verify the new PocketBase image and migrations;
3. set the same `API_ORIGIN_SECRET` on Fly and with
   `wrangler secret put API_ORIGIN_SECRET --config wrangler.api.jsonc --env staging`
   (omit `--env staging` for production);
4. deploy the corresponding API Worker and verify authenticated/unauthenticated
   smoke tests through its public hostname;
5. set `API_ORIGIN_ENFORCEMENT=true` on Fly, restart, and confirm that the
   direct Fly `/api/v1/links` returns `404` while the branded hostname returns
   the normal `401` without a key.

Before deploying the PocketBase image, `STRIPE_WEBHOOK_SECRET` must contain the
signing secret of the exact Stripe webhook endpoint (not the Stripe API key).
The webhook fails closed when it is absent and accepts only a valid
`Stripe-Signature` within the five-minute replay window. Verify a signed Stripe
test event after each backend rollout.

For staging, run:

```text
npm run deploy:api:staging
```

Use the printed `workers.dev` URL to verify staging explicitly. It proxies only
to `greenroute-pb-staging`.

For production, start from a clean committed release checkout and run:

```text
npm run deploy:api:prod
```

The command runs lint, type checking, all tests, and a Wrangler API dry run;
deploys `linktery-public-api`; and verifies the branded production domain.
Deploy the API Worker before publishing frontend documentation that references
a new API path. A successful production smoke check must prove that:

- unauthenticated `GET /v1/links` reaches API authentication and returns `401`;
- `/api/collections/*` is blocked at the gateway with `404`;
- unsupported methods return `405` with the correct `Allow` header;
- responses are `no-store`, carry `X-Linktery-API-Version`, and do not expose
  origin cookies or server headers.
- the response is attested by PocketBase; an unattested origin response becomes
  a generic `502` and never reaches the client verbatim.

API keys are server credentials. Do not enable wildcard browser CORS or put an
API key in frontend JavaScript. Browser dashboards must use their own backend
or another trusted server-side integration.

## Staging frontend deploy

Run:

```text
npm run deploy:staging
```

This runs lint, type checking, the full test suite, a staging build, the
Wrangler dry run, the local primary smoke suite, and then deploys
`linktery-frontend-staging`.

After deployment, run the remote smoke test against the URL printed by
Wrangler:

```text
npm run cf:smoke -- https://<staging-worker>.workers.dev staging
```

Staging and every `workers.dev` preview must send
`X-Robots-Tag: noindex, nofollow`. Preview URLs are publicly reachable unless
Cloudflare Access is enabled.

## Production frontend deploy

Start from a clean committed release checkout, authenticate Wrangler, and run:

```text
npm run deploy:prod
```

The command performs this sequence:

1. refuse a dirty checkout;
2. run lint, TypeScript checks, and all tests;
3. build the production release and validate SEO/artifact invariants;
4. run Wrangler dry runs for the primary and alias configurations;
5. run local primary and alias Worker smoke tests;
6. deploy `linktery-frontend`;
7. deploy `linktery-frontend-alias` from the same artifact;
8. run live smoke tests on the primary domain and all three aliases.

The two Workers publish atomically per Worker, but not as one cross-Worker
transaction. If the primary deploy succeeds and the alias deploy fails, stop,
record both active version IDs, and either finish the alias deploy with the same
artifact or roll the primary Worker back. Do not rebuild between the two.

For a manual production release, the equivalent commands are:

```text
npm run release:check:production
npm run cf:deploy:production:primary
npm run cf:deploy:production:alias
npm run cf:smoke:production
```

## Required post-deploy checks

Record the Git SHA plus the active version ID for both Workers. Verify:

- `/` is a prerendered `200` landing page;
- every sitemap URL is `200`, indexable, prerendered, and canonical to
  `https://linktery.com/...`;
- `/dashboard/*`, `/admin/*`, `/login`, and `/ref/:code` serve the SPA shell
  with `noindex` where required;
- a valid short link resolves and a valid Public Profile renders on every
  selectable domain;
- Geo individual/Tier targeting, Device targeting, A/B, UTM replacement, and
  click analytics still resolve once through the server hot path;
- an Instagram iOS User-Agent on a Deeplink-enabled test link receives the
  guarded handoff HTML, while a normal link remains a standard HTTP redirect;
- a simulated missing resolver attestation still renders the SPA and does not
  duplicate client-side click telemetry;
- unknown nested/system paths return a real `404`;
- legacy and `www` redirects are permanent and preserve path/query values;
- POST requests to frontend routes return `405` with `Allow: GET, HEAD`;
- hashed assets are immutable and media Range requests work;
- `robots.txt` and `sitemap.xml` are served from the primary domain;
- `https://greenroute-pb.fly.dev/api/health` returns `200`;
- Worker errors remain zero and CPU/cache metrics are within their normal
  range.

Always inspect the **live** `robots.txt`, not only `public/robots.txt`.
Cloudflare Managed Content Signals can prepend crawler rules at the edge.

## DNS invariants

Do not change these during a routine frontend deploy:

- `linktery.com` apex and wildcard remain proxied;
- `linktery.bio`, `hotme.online`, and `hotmylinks.cc` apex records remain
  proxied;
- alias `www` and wildcard records remain absent unless product requirements
  explicitly change;
- alias MX records remain DNS-only with priorities `10/10/10/15/20` for
  Namecheap email forwarding;
- alias SPF remains
  `v=spf1 include:spf.efwd.registrar-servers.com ~all`;
- the main Google Search Console verification TXT and CAA records remain
  intact.
- `api.linktery.com` remains a Worker Custom Domain owned only by
  `linktery-public-api`; it must not be pointed at the frontend Worker or
  exposed as a direct PocketBase custom domain.

DNSSEC is currently disabled. Enable it only as a separate change after the
cutover observation window, with the registrar DS record verified before and
after activation.

## Rollback

### Preferred: roll back Worker versions

List deployments and promote the previous known-good version:

```text
npx wrangler deployments list --name linktery-frontend --json
npx wrangler deployments list --name linktery-frontend-alias --json
npx wrangler versions deploy <previous-primary-version>@100% --name linktery-frontend --yes
npx wrangler versions deploy <previous-alias-version>@100% --name linktery-frontend-alias --yes
npm run cf:smoke:production
```

Roll back both Workers when the release artifact or shared routing contract is
the cause. Record the before/after version IDs.

### Emergency: fall through to Vercel

If Worker routing itself is unavailable, disable/remove the affected Worker
route while leaving Cloudflare DNS proxied. Requests will fall through to the
retained Vercel origin. If the fallback artifact must first be refreshed, use
the explicitly named emergency command:

```text
npm run rollback:vercel:prod
```

Deploying to Vercel alone does not move traffic while Cloudflare Worker routes
are active. Do not change nameservers as part of rollback.

### Public API gateway rollback

Promote the previous known-good API Worker version, then run the branded API
smoke test:

```text
npx wrangler deployments list --name linktery-public-api --json
npx wrangler versions deploy <previous-api-version>@100% --name linktery-public-api --yes
npm run cf:api:smoke:production
```

Do not move `api.linktery.com` directly to Fly.io as a rollback shortcut. That
would expose the PocketBase route namespace and change the public `/v1`
contract.

## PocketBase deployment

PocketBase production remains on Fly.io and has its own release process. Its
container must start PocketBase directly. `repair_db.py` is a manual maintenance
tool and must not run automatically during deploys or restarts.

Before a production backend deploy, take or verify a current volume snapshot,
test migrations and hooks against staging, verify `GET /api/health`, and then
deploy the exact reviewed image/configuration to `greenroute-pb`.
