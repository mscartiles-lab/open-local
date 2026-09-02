# Open Local — Deployment Guide

> **For Chrissy:** You'll be tagged on GitHub when something is ready to deploy. Check the **Review / Ready** column on the board. Never deploy something you haven't reviewed.

---

## Before Deploying — Sync from GitHub

### Option A: Replit connected to GitHub (recommended)
```bash
git fetch origin
git checkout main
git pull origin main
```

### Option B: Replit NOT connected to GitHub
1. Go to https://github.com/mscartiles-lab/open-local
2. Click **Code → Download ZIP** on the `main` branch
3. Unzip and replace the artifact folders in your Replit workspace

---

## After Syncing — What to Check

1. **Read the PR description** — it tells you exactly what changed and which artifact(s) are affected
2. **Run typecheck** to confirm no issues before deploying:
   ```bash
   cd artifacts/open-local      && pnpm run typecheck
   cd artifacts/open-local-mobile && pnpm run typecheck
   cd artifacts/api-server     && pnpm run typecheck
   ```

---

## How to Deploy

| What changed | How to deploy |
|---|---|
| Web app only | Click **Publish** in Replit |
| Mobile JS-only (no native changes) | `eas update --branch production` in the mobile workspace |
| Mobile with native changes | `eas build --platform all --profile production` then submit to stores |
| API server | Replit auto-restarts — redeploy if needed |
| All three | Deploy in order: **API → Web → Mobile** |

---

## After Deploying

- Move the card to **Deployed** on the [Ops Board](https://github.com/mscartiles-lab/open-local/projects?query=is:open)
- Update the deployment log in this file
- Leave a comment on the issue/PR confirming deploy is done

---

## Current Deployment Log

| Artifact | Last Deployed | By | Date | Notes |
|---|---|---|---|---|
| API Server | — | — | — | — |
| Web App | — | — | — | — |
| Mobile (OTA) | — | — | — | — |
| Mobile (Native) | — | — | — | — |
