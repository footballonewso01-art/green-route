# Linktery

Linktery is a smart-link, URL-shortening, analytics, and Link-in-Bio platform.
The frontend is a React/Vite application; PocketBase provides the API,
redirect business logic, billing hooks, and SQLite-backed data services.

## Production architecture

- Frontend: Cloudflare Workers Static Assets
- Primary Worker: `linktery-frontend`
- Alias Worker: `linktery-frontend-alias`
- Primary domain: `https://linktery.com`
- Alias domains: `linktery.bio`, `hotme.online`, `hotmylinks.cc`
- Backend: PocketBase on Fly.io (`greenroute-pb`)
- Payments: Stripe

Vercel is no longer the normal frontend host. It is temporarily retained only
as an emergency rollback origin. See [DEPLOYMENT.md](./DEPLOYMENT.md) before any
release or infrastructure change.

## Local development

Requirements: Node.js 24 and npm 10.9.3.

```text
npm ci
npm run dev
```

Useful checks:

```text
npm run lint
npm run typecheck
npm test
npm run build:production
npm run cf:smoke:local
npm run cf:smoke:local:alias
```

## Deployments

Cloudflare is the frontend deployment target:

```text
npm run deploy:staging
npm run deploy:prod
```

Production deploys must run from a clean committed release checkout and deploy
the primary and alias Workers from the same artifact. The production command
runs the release gates and live smoke tests automatically.

The old Vercel workflow must not be used for routine releases. Commands named
`rollback:vercel:*` exist only for an explicitly chosen emergency rollback.

Full DNS invariants, smoke checks, rollback procedures, and PocketBase rules
are documented in [DEPLOYMENT.md](./DEPLOYMENT.md).

## Public API

Developer API behavior and authentication are documented in
[docs/public-api-v1.md](./docs/public-api-v1.md).
