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
| approved customer hostname `/` | `linktery-frontend` via Cloudflare for SaaS |

`www.linktery.com` redirects to the apex domain. Alias domains continue to
serve customer `/{slug}` URLs, but product, account, and SEO routes redirect to
`linktery.com`.

PocketBase remains a separate Fly.io service at
`https://greenroute-pb.fly.dev`. A frontend deploy does not deploy PocketBase,
run database migrations, or change Stripe webhooks.

PocketBase must start with `--encryptionEnv=PB_ENCRYPTION_KEY`. The Fly secret
must be exactly 32 characters and must be backed up in a password/credential manager;
losing it makes encrypted application settings unrecoverable. The container
fails closed when the secret is absent or malformed. Set the same policy with
a different value on staging before deploying this image. Never commit the
value or place it in a `VITE_*` variable.

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

### Custom Domains (Cloudflare for SaaS)

User-owned domains are provisioned through **Cloudflare for SaaS Custom
Hostnames**. They are not added to `wrangler.jsonc` one by one. One indexed
PocketBase mapping binds an exact hostname to exactly one owned Link or Public
Profile. A customer hostname serves only `/`; it never guesses a target by
slug and never exposes `/slug` in the browser address.

Creating a domain first reserves a unique hostname locally and produces a
per-account TXT proof at `_linktery-verification.<hostname>`. No Cloudflare
hostname is allocated until that proof is found through the fixed DNS-over-HTTPS
resolver. Cloudflare's own hostname/SSL validation is additional, not a
replacement for tenant ownership. Keep the Linktery TXT record permanently.

Control-plane calls happen only during verified provisioning, verification,
disconnection and a bounded backend reconciliation job. Per-domain leases
serialize mutations; uncertain creates recover by exact hostname instead of
creating duplicates. A persisted `provisioning_started_at` marker preserves
cleanup after an uncertain create even if the user removes their TXT proof.
Accounts outside the rollout or without active Creator Pro or Agency entitlement do not
allocate new provider hostnames; their configuration is retained for renewal.
Public visits perform indexed PocketBase lookups and do
not call the Cloudflare API. Root profile card clicks retain their original
Linktery Link hostnames and profile attribution, including when an ordinary
first-party profile attaches a Link on a different alias. Legal/branding links use the main
Linktery website, not missing paths on the customer hostname.

Management lists paginate at 50 domains; destination search fetches at most 30
matches per target type. Creator Pro can keep 2 simultaneous custom domains;
Agency can keep 10; Creator has no entitlement. These limits count pending and
active records and are re-checked transactionally before a reservation is
saved. The older 20-pending guard remains as defense in depth but is above both
product limits.

A private `custom_domain_provisioning_events` ledger survives domain deletion.
Only a successful tenant-specific TXT ownership proof can reach provider
provisioning. Creator Pro may start 6 and Agency 30 provider provisioning
attempts in a rolling 30-day window. A platform-wide reservation allows at most
10 new attempts per minute, below Cloudflare's default 15 successful
certificate submissions/minute, and an ambiguous attempt cannot be repeated
for 15 minutes. Reassigning an existing hostname to another owned Link/Profile
does not consume the provisioning allowance.
The minute reconciliation job handles at most 200 due records / 45 seconds:
recent pending records retry after 5 minutes, stale unverified and active
records after 24 hours, transport failures after 15 minutes. Monitor oldest
`next_check_at` lag and Cloudflare quota/cost before widening access.

Required Fly secrets/settings for each environment:

- `CLOUDFLARE_SAAS_API_TOKEN`: least-privilege token for Custom Hostnames
  (SSL and Certificates read/write for the Linktery zone only);
- `CLOUDFLARE_SAAS_ZONE_ID`: the Linktery zone id;
- `CLOUDFLARE_SAAS_CNAME_TARGET`: the dedicated proxied fallback hostname,
  for example `domains.linktery.com`;
- `CUSTOM_DOMAINS_ENABLED`: explicit `true` only after the whole environment
  passes the staged checks below.
- `CUSTOM_DOMAINS_ALLOWED_USER_IDS`: optional comma-separated account IDs for
  a controlled pilot. With a non-empty value only these accounts can create,
  update, verify or serve custom domains. An empty value enables all entitled
  Creator Pro and Agency accounts when the feature switch is true. Disconnect
  remains allowed even after downgrade so users can clean up safely.

Never expose the Cloudflare token in a browser response, `VITE_*`, Wrangler
vars, repository files, or logs. The management API deliberately returns DNS
instructions but not the Cloudflare custom-hostname id or provider errors.

One-time Cloudflare setup:

1. enable Cloudflare for SaaS on the production zone;
2. create the dedicated proxied fallback hostname and configure it as the
   Cloudflare for SaaS fallback origin;
3. ensure custom-hostname traffic reaches `linktery-frontend`; if a catch-all
   Worker route is used, keep the more-specific `api.linktery.com/*` route on
   `linktery-public-api` and verify it still wins. Deploy the compatible
   hostname-aware Worker before attaching the catch-all. Immediately verify
   an unmapped hostname does not serve the marketing homepage, dashboard,
   or marketing sitemap; remove only the new route if this check fails;
4. keep `api.linktery.com`, first-party Linktery hosts, and platform preview
   hosts reserved so users cannot attach them;
5. confirm Cloudflare's current Custom Hostnames quota and billing before
   broad rollout; application code must not silently invent a lower limit than
   the advertised paid-plan entitlements.

Staged rollout order:

1. deploy the migration and backend hooks with `CUSTOM_DOMAINS_ENABLED=false`;
2. configure an isolated staging SaaS zone, fallback origin, token and CNAME
   target, with the existing staging `REDIRECT_ORIGIN_SECRET` pair. A zone has
   one fallback origin: do not point the production zone fallback at staging;
3. deploy the staging Worker and verify an unconnected hostname and every
   non-root path return a real `404`;
4. enable staging, connect one subdomain and one apex test domain, then verify
   Link redirect, deeplink, geo routing, click analytics, Public Profile view
   analytics, social preview, SSL issuance, target reassignment, and removal;
5. deploy the production backend first while the production switch remains
   false, then deploy both production frontend Workers from one artifact;
6. set `CUSTOM_DOMAINS_ALLOWED_USER_IDS` to the pilot account, then enable
   `CUSTOM_DOMAINS_ENABLED=true`; connect a controlled production pilot domain
   and repeat the smoke tests;
7. after the full Link → Profile → Link lifecycle, analytics, HTTPS and removal
   checks pass, remove `CUSTOM_DOMAINS_ALLOWED_USER_IDS` to make the feature
   available to every active Creator Pro and Agency account. Keep the
   server-side 2/10 limits, persistent provisioning ledger and global issuance
   guard enabled.

Production rollout completed on 2026-08-29 from commit `59530f0`. Fly backend
machine version `280`, primary Worker `59cb760b-b920-4c4b-b620-991c618c6464`
and alias Worker `707286d5-4506-4c12-8a9f-67ae7e39b3c3` passed health, routing,
alias, runtime and 109-URL SEO smoke checks. The pilot allowlist was removed.
At that checkpoint Creator and Pro were ineligible. The subsequent entitlement
hardening release changes this to Creator 0, Creator Pro 2 and Agency 10 and
must be deployed backend-first because it adds the private provisioning ledger.

The settings UI intentionally reveals one DNS phase at a time: Linktery
ownership TXT, Cloudflare HTTPS validation, then the final traffic CNAME. Never
ask customers to move traffic before Step 3. Positive hostname mappings are
cached at the edge for 30 seconds; missing and unavailable mappings are never
cached, and the final target resolver still revalidates the exact tenant-owned
mapping before redirecting or rendering a profile.

Cloudflare for SaaS currently includes 100 custom hostnames account-wide on
Free/Pro/Business, supports up to 50,000, and bills additional hostnames at
$0.10/month. Linktery's 2-domain Creator Pro and 10-domain Agency caps are
product and abuse-control limits; update backend enforcement, provisioning
budgets and all pricing copy together if they change.

An active hostname and active SSL indicate verification/certificate readiness;
the customer must also point traffic DNS at the shown CNAME target. Apex
domains require provider flattening/ALIAS/ANAME. Do not advertise arbitrary
apex A-record support: Cloudflare Apex Proxying is a separate provider feature.
Keep `/robots.txt` and `/sitemap.xml` Worker-first: customer hosts must never
serve the marketing sitemap or inherit primary-host indexability. Static
JS/CSS/image assets remain asset-first.

Local checks (no real provider credentials or production mutations):

```powershell
npm run typecheck
npm test
node scripts/test-custom-domains-runtime.mjs pb_test/custom_domains_review_20260828
npm run build:staging
npm run cf:dry-run:staging
```

The runtime check requires a migrated disposable `pb_test` database and uses
synthetic accounts only. The live DNS / certificate lifecycle still requires
the staged pilot above. Account/Link/Profile deletion is blocked while any
domain remains attached, including model-level deletes; disconnect first.

Provider references: [Worker fallback origin](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/),
[hostname/SSL readiness](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/common-api-calls/),
[domain support](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/).

Emergency rollback starts by setting `CUSTOM_DOMAINS_ENABLED=false` on Fly.
That fails custom-domain roots closed without deleting mappings, Cloudflare
hostnames, Links, Public Profiles, or analytics. Deletion remains available so
owners can safely disconnect a domain. Do not delete the fallback origin or
bulk-delete custom hostnames during a code rollback.

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
8. run live smoke tests on the primary domain and all three aliases;
9. verify the deployed IndexNow key and changed pages, then submit the content
   change notification (see `docs/indexnow.md`). A notification failure does not
   roll back an already healthy deployment.

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

## Search discovery and IndexNow

The canonical Bing Webmaster Tools property is `https://linktery.com/`. Its
sitemap is `https://linktery.com/sitemap.xml`; alias domains must not be added
as separate canonical properties or submitted as sitemap hosts.

Keep Cloudflare **Caching -> Configuration -> Crawler Hints** enabled on the
`linktery.com` zone. In addition, the production release pipeline now sends
explicit IndexNow content-change notifications after successful live checks.
The public verification key is deployed with the site; no network-dependent
submission runs during the build or a staging release. The first notification
establishes the canonical marketing catalogue baseline, and later notifications
include only new, changed, or removed content. Preserve the receipt between
releases to avoid resubmitting the full catalogue. See `docs/indexnow.md`.

Crawler Hints is a zone-level setting and is not stored in `wrangler.jsonc`.
Re-verify it after a zone transfer, account migration, DNS cutover, or accidental
Cloudflare configuration reset. Non-indexable app routes and redirect utility
URLs must continue to emit `X-Robots-Tag: noindex`; this keeps global crawler
hints from turning private dashboard routes or short-link hops into SEO pages.
The production SEO audit also requires `CF-Cache-Status` on the sitemap and every
canonical sitemap URL. This verifies that Cloudflare can observe the cache change
signals used by Crawler Hints. Explicit release notifications independently
verify live page fingerprints and exclude user profiles, app routes, and aliases.

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

Before the first deployment that enables settings encryption:

1. take a fresh Fly volume snapshot and verify it can be listed;
2. generate and store separate 32-character `PB_ENCRYPTION_KEY` values for
   staging and production;
3. set the staging Fly secret, deploy, update one non-sensitive setting through
   PocketBase so the settings row is persisted under encryption, restart, and
   verify auth, OAuth and Stripe configuration still load;
4. repeat the same sequence in production only after staging passes;
5. keep database copies, WAL files and diagnostic exports outside the repository
   in encrypted storage, with restricted filesystem permissions and a written
   deletion date.

On Windows, `scripts/prepare-pb-encryption.ps1 -App <Fly app>` (PowerShell 7)
performs first-time setup only: it creates a separate random key, verifies its
Windows Credential Manager entry `Linktery/Fly/<Fly app>/PB_ENCRYPTION_KEY` and
an additional DPAPI-encrypted local backup, and stages the Fly secret via stdin.
It refuses to overwrite any existing Fly encryption key. Both local recovery
copies are tied to this Windows account; export the credential to the team's
password manager before retiring/reinstalling this workstation. Never print it
in terminal output. A staged secret takes effect on the subsequent deployment.

### Public record hardening rollout (2026-08-27)

Do not deploy the record-lockdown migration before its compatible frontend.
Old frontend bundles still use the public `links` Records API; closing it first
can break Public Profile cards and the React redirect fallback during rollout.

1. Run `node scripts/smoke-security-local.mjs` with a local schema fixture,
   then the frontend test/build checks. The smoke test creates only synthetic
   accounts in a temporary schema-only database and removes it afterwards.
2. Complete the encryption-secret preflight above. Keep the existing matching
   `REDIRECT_ORIGIN_SECRET` on both frontend Workers and Fly; do not rotate it
   as part of this unrelated change.
3. Deploy the compatible backend image with build arg `PUBLIC_READ_LOCKDOWN=0`.
   This publishes `/api/public/links`, `/api/public/profiles` and slug
   availability without applying migration
   `1787830000_harden_link_records_and_image_uploads.js` yet. Use this image
   only for the short compatibility phase, not as the final security release.
4. Deploy the frontend and its Worker to staging, then test primary/alias
   `/slug` navigation, Geo/device targeting, deeplinks and Public Profile cards.
   The same-origin link resolver forwards trusted country/IP and never writes
   clicks; the existing first-party click endpoint remains responsible for that.
5. Deploy the final backend with the default `PUBLIC_READ_LOCKDOWN=1`. Verify
   anonymous raw Link lists are empty, direct raw reads fail, owner/admin access
   still works, and SVG disguised as PNG is rejected. Recheck a real raster
   image download. Repeat this exact sequence in production after approval.

No account records or existing files are deleted by the migration. Legacy
unsafe custom data-URL icons are omitted from the public DTO and can be
replaced with PNG/JPEG/WebP; unrelated edits to those links remain possible.
Legacy file responses are sandboxed and active formats are attachment-only.
The security migration intentionally does not reopen access on rollback;
roll back only to a frontend that understands the public DTO endpoints.

Git cleanup removes diagnostic exports from tracking and inline credentials
from the current source, not from old commits. Before calling this incident
fully resolved, rotate exposed credentials and coordinate a history rewrite
and force-push with repository collaborators. Do not force-push during a
normal application deploy.

### Atomic profile counters rollout (2026-08-28)

Deploy `1787865000_make_profile_click_rollup_atomic.js` with its matching
PocketBase hooks, backend first. The `increment_profile_click_rollup` SQLite
trigger replaces (not supplements) the old after-success JS increment. Clicks
and profile counters now commit together, including browser-fallback telemetry.
The existing hourly reconciliation repairs recent drift within its bounded
six-hour window; do not run a full-history rebuild during application startup.

Verify the trigger exists on staging and production, then check that attributed
click totals match their rollups. Test both cached analytics reads and owner-
authenticated `refresh=1` reads; the latter must still enforce ownership, plans
and computation rate limits. Frontend tab-return refreshes require this backend
revision for fresh responses without waiting for the normal 30-second cache.

Prefer a forward fix if backend rollback is needed. Do not deploy old hooks
while this trigger remains active: both would increment the same click. A full
rollback must remove this trigger via the matching down migration while request
handling is stopped, then restore the old hooks together. Rolling back only the
frontend is safe; it does not change the counter writer.
