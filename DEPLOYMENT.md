# Linktery frontend deployment

## Current production state

Vercel remains the active production frontend and the immediate rollback target.
Cloudflare Workers Static Assets is prepared as a candidate platform, but the
repository intentionally contains no production Worker routes and no DNS
changes. Pushing this branch cannot move production traffic to Cloudflare.

PocketBase remains on Fly.io and is not part of the frontend hosting migration.
The browser continues to call PocketBase directly.

## Required tooling

- Node.js 24
- npm 10.9.3
- Wrangler is installed from the lockfile; do not use a floating global version
- An authenticated Cloudflare account is required only for remote preview or deployment

The frontend uses public build-time configuration only:

- `VITE_DEPLOY_ENV`
- `VITE_POCKETBASE_URL`
- `VITE_AVAILABLE_DOMAINS`

Production and staging values are defined in `.env.production` and
`.env.staging`. Do not put credentials or API secrets in a `VITE_*` variable;
Vite embeds these values in browser JavaScript.

For Cloudflare automation, store `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` as protected CI secrets. The token must be scoped to the
Linktery Worker/account and must not be committed.

## Quality gate

Run:

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run build:production
npm run cf:dry-run:production
npm run build:staging
npm run cf:dry-run:staging
npm run cf:smoke:local
```

The release build fails when it detects:

- a production bundle pointing to staging or localhost;
- a staging bundle pointing to production or localhost;
- missing/incorrect SEO prerenders, canonical tags, or sitemap entries;
- an indexable SPA shell or 404 page;
- Cloudflare artifacts above the file-count or single-file limits;
- drift between the Vercel fallback CSP and the shared security policy.

`dist` remains the Vercel artifact. `dist-cloudflare` is a separate generated
artifact with private copies of the landing page, SPA shell, and 404 page under
`/_linktery`. The Worker blocks public access to this namespace. This separation
prevents build files from stealing valid customer slugs such as `/index` and
`/landing`.

Cloudflare invokes the Worker for HTML navigation, application routes, and
public `/{slug}` resolution. Hashed `/assets/*` files and root media files bypass
the Worker and remain free Static Asset requests. This preserves explicit
status/canonical handling without turning JS, CSS, font, image, or video traffic
into billable Worker invocations.

## Remote staging

After Cloudflare authentication:

```text
npm run build:staging
npm run cf:deploy:staging
npm run cf:smoke -- https://<staging-worker>.workers.dev staging
```

The staging build and all `workers.dev` responses receive
`X-Robots-Tag: noindex, nofollow`. Preview URLs are still public unless
Cloudflare Access is enabled.

## Production candidate without traffic

After Cloudflare authentication:

```text
npm run build:production
npm run cf:upload:candidate
```

This uploads a version and creates a candidate preview alias. It does not bind
`linktery.com`, create a production route, change DNS, or turn off Vercel.
On the first run only, the command creates the dormant production Worker with
`workers_dev=false`; it refuses to bootstrap if the config contains a route or
custom domain that could receive production traffic.
The upload command intentionally refuses a dirty checkout or an artifact whose
manifest Git SHA differs from `HEAD`.

Verify at minimum:

- `/` returns the prerendered landing page with HTTP 200;
- all 231 canonical SEO routes return static HTTP 200 responses;
- legacy roots return HTTP 308 and preserve query parameters;
- `/{slug}`, `/dashboard/*`, `/admin/*`, and `/ref/:code` return the SPA shell;
- invalid nested routes return a real HTTP 404;
- `/index` and `/landing` still resolve as customer slugs;
- hashed assets are immutable and media Range requests work;
- production JavaScript contains only the production PocketBase origin.

## DNS and zero-downtime cutover

Do not change nameservers until all of the following are complete:

1. Export the full Vercel and registrar DNS zones.
2. Import and diff every A/AAAA/CNAME/TXT/MX/CAA record in Cloudflare.
3. Preserve Google Search Console verification.
4. Preserve all Namecheap email-forwarding MX and SPF records on alias domains.
5. Validate the Worker candidate and create a rollback checklist.
6. Lower relevant TTLs ahead of the cutover.

Move the primary domain first. Keep Vercel deployed and healthy throughout the
observation window. Alias domains move one at a time afterward. They use the
`alias` Wrangler environment because aliases must serve customer slugs and
assets while redirecting product/SEO routes to `linktery.com`.

Before moving any alias, build the production artifact and run:

```text
npm run cf:smoke:local:alias
```

`www.linktery.com` is not a selectable Linktery link domain and always redirects
the complete path and query string to the apex host. `linktery.bio`,
`hotme.online`, and `hotmylinks.cc` keep serving public `/{slug}` routes while
redirecting product and SEO routes to `linktery.com`.

The production Go/No-Go checkpoint must record:

- candidate Worker version ID and Git SHA;
- DNS export and diff result;
- HTTP smoke-test result for primary, `www`, and each alias;
- SEO/canonical/robots result;
- login, registration, dashboard, short-link, public-profile, and Stripe smoke result;
- rollback owner and exact rollback action.

Rollback is to remove/disable the Cloudflare Worker route while the Vercel
deployment and origin DNS records remain intact. Do not delete the Vercel
project until the Cloudflare observation period is complete.
