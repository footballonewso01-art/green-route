---
description: Deploy to Vercel Preview or Production. Use preview to test before going live.
---

# /deploy - Linktery Deployment

$ARGUMENTS

---

## Sub-commands

```
/deploy            → Staging deploy (safe, creates temp URL + uses staging PB)
/deploy staging    → Same as above
/deploy prod       → Production deploy to linktery.com (REQUIRES prior staging test)
```

// turbo-all

---

## 🔴 GOLDEN RULE: STAGING FIRST

> **NEVER deploy directly to production.** Always deploy to staging first, verify, then promote.

**Workflow:**
1. Code changes → `staging` branch (or current branch)
2. `/deploy staging` → Test on preview URL with staging PocketBase
3. Verify everything works
4. `/deploy prod` → Push to linktery.com with production PocketBase

---

## ​Environment Architecture

| Environment | Frontend | Backend (PocketBase) | Stripe |
|-------------|----------|---------------------|--------|
| **Local Dev** | `localhost:5173` | `localhost:8090` | Test keys |
| **Staging** | `*.vercel.app` (preview) | `greenroute-pb-staging.fly.dev` | Test keys |
| **Production** | `linktery.com` | `greenroute-pb.fly.dev` | Live keys |

**How it works:**
- `.env` → Local dev (localhost PB)
- `.env.staging` → Staging (staging PB on Fly.io)
- Vercel Production env → Production PB

**npm scripts:**
- `npm run dev` → Local dev with `.env`
- `npm run dev:staging` → Local dev pointing to staging PB
- `npm run build:staging` → Build for staging deploy

---

## Staging Deployment (Default — Safe)

### Steps:

1. Build and deploy to Vercel Preview:
```bash
npm run deploy:staging
```

2. Test on the generated preview URL (e.g. `green-route-abc123.vercel.app`)
   - This preview auto-uses staging PocketBase (`greenroute-pb-staging.fly.dev`)
   - Stripe uses Test prices automatically

3. When satisfied → run `/deploy prod`

---

## Production Deployment

**Only after testing on staging!**

### Steps:

1. Push to main:
```bash
git push origin main
```

2. Deploy to production:
```bash
npm run deploy:prod
```

3. Verify at https://linktery.com

---

## Backend Deployments

### Deploy Backend to Staging
```bash
cd pocketbase && flyctl deploy -c fly.staging.toml
```

### Deploy Backend to Production
```bash
cd pocketbase && fly deploy
```

### Hot-patch hooks only (no full rebuild)

**Staging:**
```bash
flyctl ssh console -a greenroute-pb-staging -C "mkdir -p /pb/pb_hooks && wget -O /pb/pb_hooks/main.pb.js https://raw.githubusercontent.com/footballonewso01-art/green-route/main/pocketbase/pb_hooks/main.pb.js"
flyctl ssh console -a greenroute-pb-staging -C "kill 1"
```

**Production:**
```bash
flyctl ssh console -a greenroute-pb -C "mkdir -p /pb/pb_hooks && wget -O /pb/pb_hooks/main.pb.js https://raw.githubusercontent.com/footballonewso01-art/green-route/main/pocketbase/pb_hooks/main.pb.js"
flyctl ssh console -a greenroute-pb -C "kill 1"
```

> ⚠️ Hook files don't persist across full container restarts. Re-run the above if Fly recreates the machine.

---

## Quick Reference

| Command | Target | Backend | Safe? |
|---------|--------|---------|-------|
| `npm run dev` | localhost | localhost:8090 | ✅ |
| `npm run dev:staging` | localhost | staging PB | ✅ |
| `npm run deploy:staging` | Vercel Preview | staging PB | ✅ |
| `npm run deploy:prod` | linktery.com | production PB | ⚠️ After staging |

## ⚠️ Rules

1. **NEVER** run `deploy:prod` without testing on staging first
2. Staging and Production use SEPARATE PocketBase databases
3. Stripe automatically switches to Test keys on staging
4. Backend changes need separate deployment via `fly deploy` or hot-patch
