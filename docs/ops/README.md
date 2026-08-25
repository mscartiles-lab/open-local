# Open Local Ops Board

**Live at:** https://github.com/mscartiles-lab/open-local/projects?query=is:open

---

## The Board Columns

| Column | Meaning |
|---|---|
| **Backlog** | Triaged, prioritized, waiting for a developer |
| **In Progress** | Someone is actively working this |
| **Review / Ready** | Code is on `main`, Chrissy has been informed — awaiting deploy |
| **Deployed** | Live in production |

---

## Who Does What

| Who | Responsibility |
|---|---|
| **You (Slade)** | Code changes via feature branches → PR → merge to `main` → create issue tagging `chrissy-ready` |
| **Chrissy** | Pulls `main` into Replit → reviews the PR description → deploys web / runs OTA update / triggers native build |
| **Both** | Review the PR description before Chrissy deploys — she knows exactly what's changing |

---

## Issue Labels

| Label | When to use |
|---|---|
| `bug` | Something is broken |
| `enhancement` | New feature or improvement |
| `ops` | Deployment, infrastructure, or workflow task |
| `web` | Affects the web app |
| `mobile` | Affects the mobile app |
| `api` | Affects the API server |
| `chrissy-ready` | Chrissy has been notified and needs to deploy |
| `blocked` | Waiting on something — cannot proceed |

---

## Workflow — The 4 Stages

### Stage 1 — Backlog
An issue or PR is opened. It has a label (`bug`, `enhancement`, `ops`) and an artifact tag (`web`, `mobile`, `api`).

### Stage 2 — In Progress
A developer is assigned and working. Branch is open.

### Stage 3 — Review / Ready (Chrissy Deploy)
When the PR merges to `main`:
1. CI runs typecheck automatically — must pass before deploy
2. Assign the `chrissy-ready` label
3. Leave a comment: **"Chrissy — ready to deploy. [link to PR] Summary: [one line what changed]. Deploy: [web / mobile OTA / mobile native / API restart]"**
4. Chrissy pulls `main` into Replit, reviews the PR description, then deploys
5. Move the card to **Deployed**

### Stage 4 — Deployed
Mark the card deployed and close the issue.

---

## Quick Links

- **Repo:** https://github.com/mscartiles-lab/open-local
- **CI Status:** https://github.com/mscartiles-lab/open-local/actions
- **Issues:** https://github.com/mscartiles-lab/open-local/issues
- **Projects Board:** https://github.com/mscartiles-lab/open-local/projects?query=is:open
- **Ops Dashboard:** https://mscartiles-lab.github.io/open-local/
- **Replit (Chrissy's workspace):** *(add Chrissy's Replit workspace URL here)*
