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

`www.linktery.com` redirects to the apex domain. Alias domains continue to
serve customer `/{slug}` URLs, but product, account, and SEO routes redirect to
`linktery.com`.

PocketBase remains a separate Fly.io service at
`https://greenroute-pb.fly.dev`. A frontend deploy does not deploy PocketBase,
run database migrations, or change Stripe webhooks.

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

## PocketBase deployment

PocketBase production remains on Fly.io and has its own release process. Its
container must start PocketBase directly. `repair_db.py` is a manual maintenance
tool and must not run automatically during deploys or restarts.

Before a production backend deploy, take or verify a current volume snapshot,
test migrations and hooks against staging, verify `GET /api/health`, and then
deploy the exact reviewed image/configuration to `greenroute-pb`.
