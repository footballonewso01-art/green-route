---
description: Deploy to Vercel Preview or Production. Use preview to test before going live.
---

# /deploy - Linktery Deployment

$ARGUMENTS

---

## Sub-commands

```
/deploy            → Preview deploy (safe, creates temp URL)
/deploy preview    → Same as above
/deploy prod       → Production deploy to linktery.com
```

// turbo-all

---

## Preview Deployment (Default — Safe)

**Always deploy to preview first.** This creates a temporary URL for testing without touching linktery.com.

### Steps:

1. Commit changes:
```bash
git add -A
git commit -m "feat: description"
```

2. Deploy preview:
```bash
npx vercel
```

3. Test on the generated preview URL (e.g. `green-route-abc123.vercel.app`)

4. When satisfied → run `/deploy prod`

---

## Production Deployment

**Only after testing on preview!**

### Steps:

1. Push to main:
```bash
git push origin main
```

2. Deploy to production:
```bash
npx vercel --prod
```

3. Verify at https://linktery.com

---

## Backend (PocketBase on Fly.io)

If `main.pb.js` hooks were changed, also update the backend:

```bash
flyctl ssh console -a greenroute-pb -C "mkdir -p /pb/pb_hooks && wget -O /pb/pb_hooks/main.pb.js https://raw.githubusercontent.com/footballonewso01-art/green-route/main/pocketbase/pb_hooks/main.pb.js"
flyctl ssh console -a greenroute-pb -C "kill 1"
```

> ⚠️ Hook files don't persist across full container restarts. Re-run the above if Fly recreates the machine.

---

## Quick Reference

| Command | Target | Safe? |
|---------|--------|-------|
| `npx vercel` | Preview (temp URL) | ✅ Yes |
| `npx vercel --prod` | linktery.com | ⚠️ After preview test |

## ⚠️ Rules

1. **NEVER** run `npx vercel --prod` without testing on preview first
2. Preview URLs are temporary and don't affect linktery.com
3. Both preview and prod share the same PocketBase backend
