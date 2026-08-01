LINKTERY LEGACY DOCUMENT NOTICE

This legacy architecture note has been retired because it described Vercel as
the active frontend and contained obsolete PocketBase startup instructions.

Authoritative project documentation:

- README.md       - current architecture and local development
- DEPLOYMENT.md   - Cloudflare deployment, DNS, rollback, and Fly.io runbook
- docs/public-api-v1.md - public API documentation

Current hosting summary:

- Frontend production: Cloudflare Workers Static Assets
- Primary Worker: linktery-frontend
- Alias Worker: linktery-frontend-alias
- Backend and database: PocketBase on Fly.io
- Vercel: temporary emergency rollback origin only; never the routine deploy target

Use `npm run deploy:staging` and `npm run deploy:prod` for frontend releases.
